const express = require("express");
const router = express.Router();
const db = require("./db");
const { verifyToken, requireRol } = require("./middleware");
const { registrar } = require("./historial.helper");

// ─────────────────────────────────────────────
// Validaciones
// ─────────────────────────────────────────────
function validarProducto({ nombre, precio, stock }) {
  const errores = [];
  if (!nombre || nombre.trim().length < 2) errores.push("El nombre debe tener al menos 2 caracteres");
  if (precio === undefined || precio === null) errores.push("El precio es requerido");
  if (isNaN(parseFloat(precio)) || parseFloat(precio) < 0) errores.push("El precio debe ser un número positivo");
  if (stock === undefined || stock === null) errores.push("El stock es requerido");
  if (!Number.isInteger(parseInt(stock)) || parseInt(stock) < 0) errores.push("El stock debe ser un entero no negativo");
  return errores;
}

// Guarda una versión del producto antes de modificarlo
function guardarVersion(productoId, producto, userId, callback) {
  const sqlVersion = `SELECT COALESCE(MAX(version), 0) + 1 AS nueva_version FROM producto_versiones WHERE producto_id = ?`;
  db.query(sqlVersion, [productoId], (err, rows) => {
    if (err) return callback(err);
    const version = rows[0].nueva_version;
    db.query(
      `INSERT INTO producto_versiones (producto_id, version, nombre, descripcion, precio, stock, modificado_por)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [productoId, version, producto.nombre, producto.descripcion, producto.precio, producto.stock, userId],
      callback
    );
  });
}

// ─────────────────────────────────────────────
// GET /api/productos  — admin, vendedor, cliente (solo activos para cliente)
// ─────────────────────────────────────────────
router.get("/productos", verifyToken, (req, res) => {
  let sql, params = [];

  if (req.user.rol === "cliente") {
    sql = `SELECT p.id, p.nombre, p.descripcion, p.precio, p.stock, p.created_at
           FROM productos p WHERE p.activo = 1 ORDER BY p.nombre`;
  } else {
    sql = `SELECT p.*, u.nombre AS creado_por_nombre
           FROM productos p
           LEFT JOIN users u ON p.created_by = u.id
           ORDER BY p.created_at DESC`;
  }

  db.query(sql, params, (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener productos" });
    res.json(results);
  });
});

// ─────────────────────────────────────────────
// GET /api/productos/:id
// ─────────────────────────────────────────────
router.get("/productos/:id", verifyToken, (req, res) => {
  const filtroActivo = req.user.rol === "cliente" ? "AND p.activo = 1" : "";
  db.query(
    `SELECT p.*, u.nombre AS creado_por_nombre
     FROM productos p LEFT JOIN users u ON p.created_by = u.id
     WHERE p.id = ? ${filtroActivo}`,
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error al obtener producto" });
      if (results.length === 0) return res.status(404).json({ message: "Producto no encontrado" });
      res.json(results[0]);
    }
  );
});

// ─────────────────────────────────────────────
// POST /api/productos  — solo admin
// ─────────────────────────────────────────────
router.post("/productos", verifyToken, requireRol("admin"), (req, res) => {
  const { nombre, descripcion, precio, stock } = req.body;
  const errores = validarProducto({ nombre, precio, stock });
  if (errores.length > 0) return res.status(400).json({ message: "Errores de validación", errores });

  db.query(
    "INSERT INTO productos (nombre, descripcion, precio, stock, created_by) VALUES (?, ?, ?, ?, ?)",
    [nombre.trim(), descripcion?.trim() || null, parseFloat(precio), parseInt(stock), req.user.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al crear producto" });

      const nuevoId = result.insertId;
      registrar({
        userId: req.user.id,
        accion: "CREAR_PRODUCTO",
        entidad: "productos",
        entidadId: nuevoId,
        nuevo: { nombre, descripcion, precio, stock },
        descripcion: `Producto creado: "${nombre}"`
      });
      res.status(201).json({ message: "Producto creado exitosamente", id: nuevoId });
    }
  );
});

// ─────────────────────────────────────────────
// PUT /api/productos/:id  — admin (full) y vendedor (solo descripcion y stock)
// ─────────────────────────────────────────────
router.put("/productos/:id", verifyToken, requireRol("admin", "vendedor"), (req, res) => {
  const { id } = req.params;
  const { nombre, descripcion, precio, stock, activo } = req.body;

  db.query("SELECT * FROM productos WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Producto no encontrado" });

    const producto = results[0];

    // Vendedor solo puede modificar descripción y stock
    if (req.user.rol === "vendedor") {
      if (nombre !== undefined || precio !== undefined || activo !== undefined) {
        return res.status(403).json({
          message: "Los vendedores solo pueden modificar la descripción y el stock"
        });
      }

      const nuevoStock = stock !== undefined ? parseInt(stock) : producto.stock;
      const nuevaDesc = descripcion !== undefined ? descripcion.trim() : producto.descripcion;

      if (stock !== undefined && (isNaN(nuevoStock) || nuevoStock < 0)) {
        return res.status(400).json({ message: "El stock debe ser un entero no negativo" });
      }

      guardarVersion(id, producto, req.user.id, (err) => {
        if (err) return res.status(500).json({ message: "Error guardando versión" });

        db.query(
          "UPDATE productos SET descripcion=?, stock=? WHERE id=?",
          [nuevaDesc, nuevoStock, id],
          (err) => {
            if (err) return res.status(500).json({ message: "Error al actualizar producto" });
            registrar({
              userId: req.user.id,
              accion: "EDITAR_PRODUCTO",
              entidad: "productos",
              entidadId: parseInt(id),
              anterior: { descripcion: producto.descripcion, stock: producto.stock },
              nuevo: { descripcion: nuevaDesc, stock: nuevoStock },
              descripcion: `Vendedor editó producto ID ${id}`
            });
            res.json({ message: "Producto actualizado exitosamente" });
          }
        );
      });
      return;
    }

    // Admin puede modificar todo
    const actualizado = {
      nombre: nombre?.trim() || producto.nombre,
      descripcion: descripcion !== undefined ? descripcion?.trim() : producto.descripcion,
      precio: precio !== undefined ? parseFloat(precio) : producto.precio,
      stock: stock !== undefined ? parseInt(stock) : producto.stock,
      activo: activo !== undefined ? activo : producto.activo
    };

    const errores = validarProducto(actualizado);
    if (errores.length > 0) return res.status(400).json({ message: "Errores de validación", errores });

    guardarVersion(id, producto, req.user.id, (err) => {
      if (err) return res.status(500).json({ message: "Error guardando versión" });

      db.query(
        "UPDATE productos SET nombre=?, descripcion=?, precio=?, stock=?, activo=? WHERE id=?",
        [actualizado.nombre, actualizado.descripcion, actualizado.precio, actualizado.stock, actualizado.activo, id],
        (err) => {
          if (err) return res.status(500).json({ message: "Error al actualizar producto" });
          registrar({
            userId: req.user.id,
            accion: "EDITAR_PRODUCTO",
            entidad: "productos",
            entidadId: parseInt(id),
            anterior: { nombre: producto.nombre, descripcion: producto.descripcion, precio: producto.precio, stock: producto.stock },
            nuevo: actualizado,
            descripcion: `Admin editó producto "${actualizado.nombre}"`
          });
          res.json({ message: "Producto actualizado exitosamente" });
        }
      );
    });
  });
});

// ─────────────────────────────────────────────
// DELETE /api/productos/:id  — solo admin (desactiva)
// ─────────────────────────────────────────────
router.delete("/productos/:id", verifyToken, requireRol("admin"), (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM productos WHERE id = ?", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Producto no encontrado" });

    db.query("UPDATE productos SET activo = 0 WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Error al eliminar producto" });
      registrar({
        userId: req.user.id,
        accion: "DESACTIVAR_PRODUCTO",
        entidad: "productos",
        entidadId: parseInt(id),
        descripcion: `Admin desactivó producto ID ${id}: "${results[0].nombre}"`
      });
      res.json({ message: "Producto desactivado exitosamente" });
    });
  });
});

// ─────────────────────────────────────────────
// GET /api/productos/:id/versiones  — admin y vendedor
// ─────────────────────────────────────────────
router.get("/productos/:id/versiones", verifyToken, requireRol("admin", "vendedor"), (req, res) => {
  db.query(
    `SELECT pv.*, u.nombre AS modificado_por_nombre
     FROM producto_versiones pv
     LEFT JOIN users u ON pv.modificado_por = u.id
     WHERE pv.producto_id = ?
     ORDER BY pv.version DESC`,
    [req.params.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error al obtener versiones" });
      res.json(results);
    }
  );
});

module.exports = router;
