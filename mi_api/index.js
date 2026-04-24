require("dotenv").config();
const express = require("express");
const app = express();

const authRoutes = require("./auth");
const productosRoutes = require("./productos");
const cotizacionesRoutes = require("./cotizaciones");
const boletasRoutes = require("./boletas");
const historialRoutes = require("./historial");

app.use(express.json());

// ─── Manejo de JSON malformado ────────────────
app.use((err, req, res, next) => {
  if (err.type === "entity.parse.failed") {
    return res.status(400).json({ message: "JSON inválido en el body" });
  }
  next(err);
});

// ─── Health check ─────────────────────────────
app.get("/", (req, res) => {
  res.json({
    message: "API de Ventas funcionando correctamente",
    version: "2.0.0",
    endpoints: {
      auth: "/auth",
      productos: "/api/productos",
      cotizaciones: "/api/cotizaciones",
      boletas: "/api/boletas",
      historial: "/api/historial"
    }
  });
});

// ─── Rutas ────────────────────────────────────
app.use("/auth", authRoutes);
app.use("/api", productosRoutes);
app.use("/api", cotizacionesRoutes);
app.use("/api", boletasRoutes);
app.use("/api", historialRoutes);

// ─── 404 ──────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: "Ruta no encontrada" });
});

// ─── Error global ─────────────────────────────
app.use((err, req, res, next) => {
  console.error("Error interno:", err);
  res.status(err.status || 500).json({
    message: err.message || "Error interno del servidor"
  });
});

app.listen(3000, () => {
  console.log("Servidor en http://localhost:3000");
});
