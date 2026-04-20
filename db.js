const express = require("express");
const mysql = require("mysql2");
require("dotenv").config();

const app = express();
app.use(express.json());

// 🔗 CONEXIÓN
const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});

// 🔥 CONECTAR Y CREAR TABLAS
db.connect((err) => {
  if (err) {
    console.error("❌ Error de conexión:", err.message);
    return;
  }

  console.log("✅ Conectado a MySQL");

  // 🟢 CREAR TABLA USERS
  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  // 🟢 CREAR TABLA ITEMS
  const createItems = `
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      estado BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.query(createUsers, (err) => {
    if (err) console.error("Error creando users:", err.message);
    else console.log("📦 Tabla users lista");
  });

  db.query(createItems, (err) => {
    if (err) console.error("Error creando items:", err.message);
    else console.log("📦 Tabla items lista");
  });
});

// 🚀 SERVER
app.get("/", (req, res) => {
  res.send("API funcionando");
});

app.listen(3000, () => {
  console.log("🚀 Servidor en http://localhost:3000");
});