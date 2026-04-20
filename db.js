const mysql = require("mysql2");
require("dotenv").config();

const db = mysql.createConnection({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  port: process.env.DB_PORT || 3306,
});

db.connect((err) => {
  if (err) {
    console.error("❌ Error de conexión:", err.message);
    return;
  }

  console.log("✅ Conectado a MySQL");

  const createUsers = `
    CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  /* Items now includes precio, stock, categoria e imagen (LONGTEXT para base64) */
  const createItems = `
    CREATE TABLE IF NOT EXISTS items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(100) NOT NULL,
      descripcion TEXT,
      precio DECIMAL(10,2) DEFAULT NULL,
      stock INT DEFAULT NULL,
      categoria VARCHAR(80) DEFAULT NULL,
      imagen LONGTEXT DEFAULT NULL,
      estado BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );
  `;

  db.query(createUsers, (err) => {
    if (err) console.error("Error creando tabla users:", err.message);
    else console.log("📦 Tabla users lista");
  });

  db.query(createItems, (err) => {
    if (err) console.error("Error creando tabla items:", err.message);
    else {
      console.log("📦 Tabla items lista");
      // Add new columns if they don't exist (for existing databases)
      const alterCols = [
        "ALTER TABLE items ADD COLUMN IF NOT EXISTS precio DECIMAL(10,2) DEFAULT NULL",
        "ALTER TABLE items ADD COLUMN IF NOT EXISTS stock INT DEFAULT NULL",
        "ALTER TABLE items ADD COLUMN IF NOT EXISTS categoria VARCHAR(80) DEFAULT NULL",
        "ALTER TABLE items ADD COLUMN IF NOT EXISTS imagen LONGTEXT DEFAULT NULL",
      ];
      alterCols.forEach(sql => {
        db.query(sql, (e) => { if (e && !e.message.includes("Duplicate column")) console.warn("⚠ ALTER:", e.message); });
      });
    }
  });
});

module.exports = db;