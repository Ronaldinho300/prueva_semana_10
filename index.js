require("dotenv").config();
const express = require("express");
const app = express();

const authRoutes = require("./auth");
const itemRoutes = require("./items");

app.use(express.json());

// ✅ CORS - permite que el frontend.html pueda conectarse
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  if (req.method === "OPTIONS") return res.sendStatus(200);
  next();
});

app.get("/", (req, res) => {
  res.json({ message: "🚀 API funcionando correctamente" });
});

app.use("/", authRoutes);
app.use("/api", itemRoutes);

app.listen(3000, () => {
  console.log("🚀 Servidor en http://localhost:3000");
});