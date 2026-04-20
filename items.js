const express = require("express");
const router = express.Router();
const db = require("./db");
const verifyToken = require("./middleware");

// GET /api/items - Listar todos
router.get("/items", verifyToken, (req, res) => {
  db.query("SELECT * FROM items", (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener items" });
    res.json(results);
  });
});

// GET /api/items/:id - Obtener por ID
router.get("/items/:id", verifyToken, (req, res) => {
  db.query("SELECT * FROM items WHERE id = ?", [req.params.id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error al obtener item" });
    if (results.length === 0) return res.status(404).json({ message: "Item no encontrado" });
    res.json(results[0]);
  });
});

// POST /api/items - Crear
router.post("/items", verifyToken, (req, res) => {
  const { nombre, descripcion, estado } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "El campo nombre es requerido" });
  }

  db.query(
    "INSERT INTO items (nombre, descripcion, estado) VALUES (?, ?, ?)",
    [nombre, descripcion || null, estado !== undefined ? estado : 1],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al crear item" });
      res.status(201).json({ message: "Item creado", id: result.insertId });
    }
  );
});

// PUT /api/items/:id - Actualizar
router.put("/items/:id", verifyToken, (req, res) => {
  const { nombre, descripcion, estado } = req.body;

  if (!nombre) {
    return res.status(400).json({ message: "El campo nombre es requerido" });
  }

  db.query(
    "UPDATE items SET nombre=?, descripcion=?, estado=? WHERE id=?",
    [nombre, descripcion || null, estado !== undefined ? estado : 1, req.params.id],
    (err, result) => {
      if (err) return res.status(500).json({ message: "Error al actualizar item" });
      if (result.affectedRows === 0) return res.status(404).json({ message: "Item no encontrado" });
      res.json({ message: "Item actualizado exitosamente" });
    }
  );
});

// DELETE /api/items/:id - Eliminar
router.delete("/items/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM items WHERE id=?", [req.params.id], (err, result) => {
    if (err) return res.status(500).json({ message: "Error al eliminar item" });
    if (result.affectedRows === 0) return res.status(404).json({ message: "Item no encontrado" });
    res.json({ message: "Item eliminado exitosamente" });
  });
});

module.exports = router;