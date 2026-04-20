const express = require("express");
const router = express.Router();
const db = require("./db");
const verifyToken = require("./middleware");

// GET /api/items
router.get("/items", verifyToken, (req, res) => {
  db.query("SELECT * FROM items ORDER BY id DESC", (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener items" });
    res.json(results);
  });
});

// GET /api/items/:id
router.get("/items/:id", verifyToken, (req, res) => {
  db.query("SELECT * FROM items WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener item" });
    if (results.length === 0) return res.status(404).json({ message: "Item no encontrado" });
    res.json(results[0]);
  });
});

// POST /api/items
router.post("/items", verifyToken, (req, res) => {
  const { nombre, descripcion, estado, precio, stock, categoria, imagen } = req.body;

  if (!nombre) return res.status(400).json({ message: "El campo nombre es requerido" });

  db.query(
    "INSERT INTO items (nombre, descripcion, estado, precio, stock, categoria, imagen) VALUES (?, ?, ?, ?, ?, ?, ?)",
    [
      nombre,
      descripcion || null,
      estado !== undefined ? estado : 1,
      precio !== undefined ? precio : null,
      stock !== undefined ? stock : null,
      categoria || null,
      imagen || null,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al crear item" });
      res.status(201).json({ message: "Producto creado exitosamente", id: result.insertId });
    }
  );
});

// PUT /api/items/:id
router.put("/items/:id", verifyToken, (req, res) => {
  const { nombre, descripcion, estado, precio, stock, categoria, imagen } = req.body;

  if (!nombre) return res.status(400).json({ message: "El campo nombre es requerido" });

  db.query(
    "UPDATE items SET nombre=?, descripcion=?, estado=?, precio=?, stock=?, categoria=?, imagen=? WHERE id=?",
    [
      nombre,
      descripcion || null,
      estado !== undefined ? estado : 1,
      precio !== undefined ? precio : null,
      stock !== undefined ? stock : null,
      categoria || null,
      imagen !== undefined ? imagen : null,
      req.params.id,
    ],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al actualizar item" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Item no encontrado" });
      res.json({ message: "Producto actualizado exitosamente" });
    }
  );
});

// DELETE /api/items/:id
router.delete("/items/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM items WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al eliminar item" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Item no encontrado" });
    res.json({ message: "Producto eliminado exitosamente" });
  });
});

module.exports = router;