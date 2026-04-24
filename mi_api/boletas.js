const express = require("express");
const router = express.Router();
const db = require("./db");
const { verifyToken, requireRol } = require("./middleware");
const { registrar } = require("./historial.helper");

// ─────────────────────────────────────────────
// GET /api/boletas  — admin ve todas, vendedor las suyas, cliente las suyas
// ─────────────────────────────────────────────
router.get("/boletas", verifyToken, (req, res) => {
  let sql, params = [];

  const base = `
    SELECT b.*, 
      uc.nombre AS cliente_nombre, uc.email AS cliente_email,
      uv.nombre AS vendedor_nombre,
      c.nota_cliente, c.nota_vendedor
    FROM boletas b
    LEFT JOIN users uc ON b.cliente_id = uc.id
    LEFT JOIN users uv ON b.vendedor_id = uv.id
    LEFT JOIN cotizaciones c ON b.cotizacion_id = c.id
  `;

  if (req.user.rol === "admin") {
    sql = base + " ORDER BY b.created_at DESC";
  } else if (req.user.rol === "vendedor") {
    sql = base + " WHERE b.vendedor_id = ? ORDER BY b.created_at DESC";
    params = [req.user.id];
  } else {
    sql = base + " WHERE b.cliente_id = ? ORDER BY b.created_at DESC";
    params = [req.user.id];
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener boletas" });
    res.json(results);
  });
});

// ─────────────────────────────────────────────
// GET /api/boletas/:id  — detalle completo
// ─────────────────────────────────────────────
router.get("/boletas/:id", verifyToken, (req, res) => {
  const { id } = req.params;

  db.query(
    `SELECT b.*, 
      uc.nombre AS cliente_nombre, uc.email AS cliente_email,
      uv.nombre AS vendedor_nombre, uv.email AS vendedor_email,
      c.nota_cliente, c.nota_vendedor, c.id AS cotizacion_id
     FROM boletas b
     LEFT JOIN users uc ON b.cliente_id = uc.id
     LEFT JOIN users uv ON b.vendedor_id = uv.id
     LEFT JOIN cotizaciones c ON b.cotizacion_id = c.id
     WHERE b.id = ?`,
    [id],
    (err, boletas) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (boletas.length === 0) return res.status(404).json({ message: "Boleta no encontrada" });

      const boleta = boletas[0];

      // Permisos
      if (req.user.rol === "cliente" && boleta.cliente_id !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para ver esta boleta" });
      }
      if (req.user.rol === "vendedor" && boleta.vendedor_id !== req.user.id) {
        return res.status(403).json({ message: "No tienes permiso para ver esta boleta" });
      }

      // Obtener items de la cotización
      db.query(
        `SELECT ci.*, p.nombre AS producto_nombre, p.descripcion AS producto_descripcion
         FROM cotizacion_items ci
         LEFT JOIN productos p ON ci.producto_id = p.id
         WHERE ci.cotizacion_id = ?`,
        [boleta.cotizacion_id],
        (err, items) => {
          if (err) return res.status(500).json({ message: "Error al obtener detalle" });
          res.json({ ...boleta, items });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// PUT /api/boletas/:id/confirmar  — cliente confirma la compra
// ─────────────────────────────────────────────
router.put("/boletas/:id/confirmar", verifyToken, requireRol("cliente"), (req, res) => {
  const { id } = req.params;

  db.query(
    "SELECT * FROM boletas WHERE id = ? AND cliente_id = ?",
    [id, req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (results.length === 0) return res.status(404).json({ message: "Boleta no encontrada" });

      const boleta = results[0];
      if (boleta.estado !== "emitida") {
        return res.status(400).json({ message: `La boleta ya fue "${boleta.estado}"` });
      }

      // Descontar stock de cada producto
      db.query(
        "SELECT * FROM cotizacion_items WHERE cotizacion_id = ?",
        [boleta.cotizacion_id],
        (err, items) => {
          if (err) return res.status(500).json({ message: "Error al obtener items" });

          // Verificar stock una vez más
          const productoIds = items.map(i => i.producto_id);
          db.query("SELECT * FROM productos WHERE id IN (?)", [productoIds], (err, productos) => {
            if (err) return res.status(500).json({ message: "Error al verificar stock" });

            const stockMap = new Map(productos.map(p => [p.id, p]));
            const sinStock = items.filter(i => {
              const p = stockMap.get(i.producto_id);
              return !p || p.stock < i.cantidad;
            });

            if (sinStock.length > 0) {
              return res.status(400).json({
                message: "Ya no hay stock suficiente para completar la compra. Contacta al vendedor."
              });
            }

            // Actualizar boleta y cotización
            db.query("UPDATE boletas SET estado = 'confirmada' WHERE id = ?", [id], (err) => {
              if (err) return res.status(500).json({ message: "Error al confirmar boleta" });

              db.query(
                "UPDATE cotizaciones SET estado = 'completada' WHERE id = ?",
                [boleta.cotizacion_id],
                (err) => {
                  if (err) return res.status(500).json({ message: "Error al actualizar cotización" });

                  // Descontar stock
                  let pending = items.length;
                  let stockError = false;

                  items.forEach(item => {
                    db.query(
                      "UPDATE productos SET stock = stock - ? WHERE id = ?",
                      [item.cantidad, item.producto_id],
                      (err) => {
                        if (err) stockError = true;
                        pending--;
                        if (pending === 0) {
                          if (stockError) {
                            console.error("⚠️ Error descontando stock en boleta", id);
                          }
                          registrar({
                            userId: req.user.id,
                            accion: "CONFIRMAR_COMPRA",
                            entidad: "boletas",
                            entidadId: parseInt(id),
                            nuevo: { estado: "confirmada", total: boleta.total },
                            descripcion: `Cliente confirmó compra. Boleta #${id} por S/ ${boleta.total}`
                          });

                          res.json({
                            message: "¡Compra confirmada exitosamente! Gracias por tu compra.",
                            boleta_id: parseInt(id),
                            total: boleta.total
                          });
                        }
                      }
                    );
                  });
                }
              );
            });
          });
        }
      );
    }
  );
});

// ─────────────────────────────────────────────
// PUT /api/boletas/:id/cancelar  — cliente o admin cancela boleta
// ─────────────────────────────────────────────
router.put("/boletas/:id/cancelar", verifyToken, requireRol("cliente", "admin"), (req, res) => {
  const { id } = req.params;
  const filtroCliente = req.user.rol === "cliente" ? "AND cliente_id = ?" : "";
  const params = req.user.rol === "cliente" ? [id, req.user.id] : [id];

  db.query(
    `SELECT * FROM boletas WHERE id = ? ${filtroCliente}`,
    params,
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (results.length === 0) return res.status(404).json({ message: "Boleta no encontrada" });

      const boleta = results[0];
      if (boleta.estado !== "emitida") {
        return res.status(400).json({ message: `No se puede cancelar: la boleta está "${boleta.estado}"` });
      }

      db.query("UPDATE boletas SET estado = 'cancelada' WHERE id = ?", [id], (err) => {
        if (err) return res.status(500).json({ message: "Error al cancelar boleta" });

        db.query(
          "UPDATE cotizaciones SET estado = 'rechazada' WHERE id = ?",
          [boleta.cotizacion_id],
          (err) => {
            if (err) console.error("Error actualizando cotización al cancelar");
            registrar({
              userId: req.user.id,
              accion: "CANCELAR_BOLETA",
              entidad: "boletas",
              entidadId: parseInt(id),
              descripcion: `Boleta #${id} cancelada por ${req.user.rol} ${req.user.email}`
            });
            res.json({ message: "Boleta cancelada exitosamente" });
          }
        );
      });
    }
  );
});

module.exports = router;
