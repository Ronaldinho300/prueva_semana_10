const express = require("express");
const router = express.Router();
const db = require("./db");
const verifyToken = require("./middleware");

// GET todos
router.get("/items", verifyToken, (req, res) => {
  db.query("SELECT * FROM items", (err, results) => {
    if (err) return res.status(500).json(err);
    res.json(results);
  });
});

// GET por ID
router.get("/items/:id", verifyToken, (req, res) => {
  db.query("SELECT * FROM items WHERE id = ?", [req.params.id], (err, results) => {
    res.json(results[0]);
  });
});

// POST
router.post("/items", verifyToken, (req, res) => {
  const { nombre, descripcion, estado } = req.body;

  db.query(
    "INSERT INTO items (nombre, descripcion, estado) VALUES (?, ?, ?)",
    [nombre, descripcion, estado],
    (err) => {
      res.json({ message: "Item creado" });
    }
  );
});

// PUT
router.put("/items/:id", verifyToken, (req, res) => {
  const { nombre, descripcion, estado } = req.body;

  db.query(
    "UPDATE items SET nombre=?, descripcion=?, estado=? WHERE id=?",
    [nombre, descripcion, estado, req.params.id],
    () => {
      res.json({ message: "Actualizado" });
    }
  );
});

// DELETE
router.delete("/items/:id", verifyToken, (req, res) => {
  db.query("DELETE FROM items WHERE id=?", [req.params.id], () => {
    res.json({ message: "Eliminado" });
  });
});

module.exports = router;