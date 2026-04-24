const express = require("express");
const router = express.Router();
const db = require("./db");
const { verifyToken, requireRol } = require("./middleware");
const { registrar } = require("./historial.helper");

// ─────────────────────────────────────────────
// POST /api/cotizaciones  — cliente solicita cotización
// ─────────────────────────────────────────────
router.post("/cotizaciones", verifyToken, requireRol("cliente"), (req, res) => {
  const { items, nota_cliente } = req.body;

  // Validaciones
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ message: "Debes incluir al menos un producto en la cotización" });
  }

  for (const item of items) {
    if (!item.producto_id || !Number.isInteger(parseInt(item.producto_id))) {
      return res.status(400).json({ message: "Cada item debe tener un producto_id válido" });
    }
    if (!item.cantidad || !Number.isInteger(parseInt(item.cantidad)) || parseInt(item.cantidad) < 1) {
      return res.status(400).json({ message: "La cantidad debe ser un entero mayor a 0" });
    }
  }

  // Verificar que todos los productos existen y tienen stock
  const productoIds = items.map(i => parseInt(i.producto_id));
  db.query(
    "SELECT * FROM productos WHERE id IN (?) AND activo = 1",
    [productoIds],
    (err, productos) => {
      if (err) return res.status(500).json({ message: "Error al verificar productos" });

      const encontrados = new Map(productos.map(p => [p.id, p]));
      const errores = [];

      for (const item of items) {
        const prod = encontrados.get(parseInt(item.producto_id));
        if (!prod) {
          errores.push(`Producto ID ${item.producto_id} no encontrado o inactivo`);
        } else if (prod.stock < parseInt(item.cantidad)) {
          errores.push(`Stock insuficiente para "${prod.nombre}" (disponible: ${prod.stock})`);
        }
      }

      if (errores.length > 0) {
        return res.status(400).json({ message: "Errores en los productos", errores });
      }

      // Calcular total
      let total = 0;
      const detalles = items.map(item => {
        const prod = encontrados.get(parseInt(item.producto_id));
        const cantidad = parseInt(item.cantidad);
        const subtotal = prod.precio * cantidad;
        total += subtotal;
        return { producto_id: prod.id, cantidad, precio_unitario: prod.precio, subtotal };
      });

      // Insertar cotización
      db.query(
        "INSERT INTO cotizaciones (cliente_id, nota_cliente, total) VALUES (?, ?, ?)",
        [req.user.id, nota_cliente?.trim() || null, total],
        (err, result) => {
          if (err) return res.status(500).json({ message: "Error al crear cotización" });

          const cotizacionId = result.insertId;
          const itemValues = detalles.map(d => [cotizacionId, d.producto_id, d.cantidad, d.precio_unitario, d.subtotal]);

          db.query(
            "INSERT INTO cotizacion_items (cotizacion_id, producto_id, cantidad, precio_unitario, subtotal) VALUES ?",
            [itemValues],
            (err) => {
              if (err) return res.status(500).json({ message: "Error al guardar detalle de cotización" });

              registrar({
                userId: req.user.id,
                accion: "CREAR_COTIZACION",
                entidad: "cotizaciones",
                entidadId: cotizacionId,
                nuevo: { total, items: detalles.length },
                descripcion: `Cliente solicitó cotización #${cotizacionId} por S/ ${total.toFixed(2)}`
              });

              res.status(201).json({
                message: "Cotización enviada exitosamente. Un vendedor la revisará pronto.",
                cotizacion_id: cotizacionId,
                total
              });
            }
          );
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// GET /api/cotizaciones  — admin ve todas, vendedor las suyas, cliente las suyas
// ─────────────────────────────────────────────
router.get("/cotizaciones", verifyToken, (req, res) => {
  let sql, params = [];

  const base = `
    SELECT c.*, 
      uc.nombre AS cliente_nombre, uc.email AS cliente_email,
      uv.nombre AS vendedor_nombre,
      (SELECT COUNT(*) FROM cotizacion_items ci WHERE ci.cotizacion_id = c.id) AS total_items
    FROM cotizaciones c
    LEFT JOIN users uc ON c.cliente_id = uc.id
    LEFT JOIN users uv ON c.vendedor_id = uv.id
  `;

  if (req.user.rol === "admin") {
    sql = base + " ORDER BY c.created_at DESC";
  } else if (req.user.rol === "vendedor") {
    sql = base + " WHERE (c.vendedor_id = ? OR c.vendedor_id IS NULL) ORDER BY c.created_at DESC";
    params = [req.user.id];
  } else {
    sql = base + " WHERE c.cliente_id = ? ORDER BY c.created_at DESC";
    params = [req.user.id];
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener cotizaciones" });
    res.json(results);
  });
});

// ─────────────────────────────────────────────
// GET /api/cotizaciones/:id  — detalle con items
// ─────────────────────────────────────────────
router.get("/cotizaciones/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT c.*, 
      uc.nombre AS cliente_nombre, uc.email AS cliente_email,
      uv.nombre AS vendedor_nombre
     FROM cotizaciones c
     LEFT JOIN users uc ON c.cliente_id = uc.id
     LEFT JOIN users uv ON c.vendedor_id = uv.id
     WHERE c.id = ?`,
    [id],
    (err, cotizaciones) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (cotizaciones.length === 0) return res.status(404).json({ message: "Cotización no encontrada" });

      const cotizacion = cotizaciones[0];

      // Verificar permisos: solo el cliente dueño, su vendedor asignado o admin
      if (
        req.user.rol === "cliente" && cotizacion.cliente_id !== req.user.id ||
        req.user.rol === "vendedor" && cotizacion.vendedor_id !== req.user.id && cotizacion.vendedor_id !== null
      ) {
        return res.status(403).json({ message: "No tienes permiso para ver esta cotización" });
      }

      db.query(
        `SELECT ci.*, p.nombre AS producto_nombre, p.descripcion AS producto_descripcion
         FROM cotizacion_items ci
         LEFT JOIN productos p ON ci.producto_id = p.id
         WHERE ci.cotizacion_id = ?`,
        [id],
        (err, items) => {
          if (err) return res.status(500).json({ message: "Error al obtener items" });
          res.json({ ...cotizacion, items });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// PUT /api/cotizaciones/:id/tomar  — vendedor toma la cotización
// ─────────────────────────────────────────────
router.put("/cotizaciones/:id/tomar", verifyToken, requireRol("vendedor"), (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM cotizaciones WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Cotización no encontrada" });

    const cot = results[0];
    if (cot.estado !== "pendiente") {
      return res.status(400).json({ message: `No se puede tomar: la cotización está en estado "${cot.estado}"` });
    }
    if (cot.vendedor_id !== null) {
      return res.status(400).json({ message: "Esta cotización ya fue tomada por otro vendedor" });
    }

    db.query(
      "UPDATE cotizaciones SET vendedor_id = ?, estado = 'revisando' WHERE id = ?",
      [req.user.id, id],
      (err) => {
        if (err) return res.status(500).json({ message: "Error al tomar cotización" });
        registrar({
          userId: req.user.id,
          accion: "TOMAR_COTIZACION",
          entidad: "cotizaciones",
          entidadId: parseInt(id),
          descripcion: `Vendedor ${req.user.nombre} tomó cotización #${id}`
        });
        res.json({ message: "Cotización asignada. Ahora puedes revisarla y aprobarla o rechazarla." });
      }
    );
  });
});

// ─────────────────────────────────────────────
// PUT /api/cotizaciones/:id/aprobar  — vendedor aprueba y genera boleta
// ─────────────────────────────────────────────
router.put("/cotizaciones/:id/aprobar", verifyToken, requireRol("vendedor"), (req, res) => {
  const { id } = req.params;
  const { nota_vendedor } = req.body;

  db.query("SELECT * FROM cotizaciones WHERE id = ? AND vendedor_id = ?", [id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Cotización no encontrada o no es tuya" });

    const cot = results[0];
    if (cot.estado !== "revisando") {
      return res.status(400).json({ message: `No se puede aprobar: estado actual es "${cot.estado}"` });
    }

    // Verificar stock nuevamente antes de aprobar
    db.query(
      `SELECT ci.*, p.stock, p.nombre AS producto_nombre
       FROM cotizacion_items ci
       JOIN productos p ON ci.producto_id = p.id
       WHERE ci.cotizacion_id = ?`,
      [id],
      (err, items) => {
        if (err) return res.status(500).json({ message: "Error al verificar items" });

        const sinStock = items.filter(i => i.stock < i.cantidad);
        if (sinStock.length > 0) {
          const detalle = sinStock.map(i => `"${i.producto_nombre}" (disponible: ${i.stock}, solicitado: ${i.cantidad})`);
          return res.status(400).json({
            message: "No hay suficiente stock para algunos productos",
            productos: detalle
          });
        }

        // Actualizar cotización y generar boleta
        db.query(
          "UPDATE cotizaciones SET estado = 'aprobada', nota_vendedor = ? WHERE id = ?",
          [nota_vendedor?.trim() || null, id],
          (err) => {
            if (err) return res.status(500).json({ message: "Error al aprobar cotización" });

            db.query(
              "INSERT INTO boletas (cotizacion_id, cliente_id, vendedor_id, total) VALUES (?, ?, ?, ?)",
              [id, cot.cliente_id, req.user.id, cot.total],
              (err, boletaResult) => {
                if (err) return res.status(500).json({ message: "Error al generar boleta" });

                const boletaId = boletaResult.insertId;

                registrar({
                  userId: req.user.id,
                  accion: "APROBAR_COTIZACION",
                  entidad: "cotizaciones",
                  entidadId: parseInt(id),
                  nuevo: { boleta_id: boletaId, total: cot.total },
                  descripcion: `Cotización #${id} aprobada. Boleta #${boletaId} generada`
                });

                res.json({
                  message: "Cotización aprobada y boleta generada. El cliente debe confirmar la compra.",
                  boleta_id: boletaId
                });
              }
            );
          }
        );
      }
    );
  });
});

// ─────────────────────────────────────────────
// PUT /api/cotizaciones/:id/rechazar  — vendedor rechaza
// ─────────────────────────────────────────────
router.put("/cotizaciones/:id/rechazar", verifyToken, requireRol("vendedor"), (req, res) => {
  const { id } = req.params;
  const { nota_vendedor } = req.body;

  if (!nota_vendedor || nota_vendedor.trim().length < 5) {
    return res.status(400).json({ message: "Debes indicar el motivo del rechazo (mínimo 5 caracteres)" });
  }

  db.query("SELECT * FROM cotizaciones WHERE id = ? AND vendedor_id = ?", [id, req.user.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Cotización no encontrada o no es tuya" });

    const cot = results[0];
    if (!["revisando", "pendiente"].includes(cot.estado)) {
      return res.status(400).json({ message: `No se puede rechazar: estado actual es "${cot.estado}"` });
    }

    db.query(
      "UPDATE cotizaciones SET estado = 'rechazada', nota_vendedor = ? WHERE id = ?",
      [nota_vendedor.trim(), id],
      (err) => {
        if (err) return res.status(500).json({ message: "Error al rechazar cotización" });
        registrar({
          userId: req.user.id,
          accion: "RECHAZAR_COTIZACION",
          entidad: "cotizaciones",
          entidadId: parseInt(id),
          descripcion: `Cotización #${id} rechazada. Motivo: ${nota_vendedor}`
        });
        res.json({ message: "Cotización rechazada exitosamente" });
      }
    );
  });
});

module.exports = router;
