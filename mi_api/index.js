require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

const authRoutes = require("./auth");
const itemRoutes = require("./items");

// ✅ CORS — PRIMERO, antes de cualquier otra cosa
app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.use(express.json());

// Manejo de JSON malformado
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido en el body" });
  }
  next(err);
});

app.get("/", (req, res) => {
  res.json({ message: "🚀 API funcionando correctamente" });
});

app.use("/auth", authRoutes);
app.use("/api", itemRoutes);

// Ruta no encontrada (404)
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// Manejador global de errores — siempre responde JSON
app.use((err, req, res, next) => {
  console.error("Error interno:", err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor",
  });
});

// ✅ Puerto dinámico — Render asigna el puerto via process.env.PORT
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Servidor en http://localhost:${PORT}`);
});