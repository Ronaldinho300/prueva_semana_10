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
  initTables();
});

function initTables() {
  const queries = [
    // USUARIOS (admin, vendedor, cliente)
    `CREATE TABLE IF NOT EXISTS users (
      id INT AUTO_INCREMENT PRIMARY KEY,
      email VARCHAR(150) UNIQUE NOT NULL,
      password VARCHAR(255) NOT NULL,
      nombre VARCHAR(100) NOT NULL,
      rol ENUM('admin', 'vendedor', 'cliente') NOT NULL DEFAULT 'cliente',
      activo BOOLEAN DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )`,

    // REFRESH TOKENS
    `CREATE TABLE IF NOT EXISTS refresh_tokens (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      token TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`,

    // PRODUCTOS
    `CREATE TABLE IF NOT EXISTS productos (
      id INT AUTO_INCREMENT PRIMARY KEY,
      nombre VARCHAR(150) NOT NULL,
      descripcion TEXT,
      precio DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL DEFAULT 0,
      activo BOOLEAN DEFAULT 1,
      created_by INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (created_by) REFERENCES users(id)
    )`,

    // COTIZACIONES (el cliente solicita)
    `CREATE TABLE IF NOT EXISTS cotizaciones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cliente_id INT NOT NULL,
      vendedor_id INT,
      estado ENUM('pendiente','revisando','aprobada','rechazada','completada') DEFAULT 'pendiente',
      nota_cliente TEXT,
      nota_vendedor TEXT,
      total DECIMAL(10,2) DEFAULT 0,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (cliente_id) REFERENCES users(id),
      FOREIGN KEY (vendedor_id) REFERENCES users(id)
    )`,

    // DETALLE DE COTIZACIÓN (productos solicitados)
    `CREATE TABLE IF NOT EXISTS cotizacion_items (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cotizacion_id INT NOT NULL,
      producto_id INT NOT NULL,
      cantidad INT NOT NULL DEFAULT 1,
      precio_unitario DECIMAL(10,2) NOT NULL,
      subtotal DECIMAL(10,2) NOT NULL,
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id) ON DELETE CASCADE,
      FOREIGN KEY (producto_id) REFERENCES productos(id)
    )`,

    // BOLETAS (generadas por vendedor al aprobar)
    `CREATE TABLE IF NOT EXISTS boletas (
      id INT AUTO_INCREMENT PRIMARY KEY,
      cotizacion_id INT NOT NULL UNIQUE,
      cliente_id INT NOT NULL,
      vendedor_id INT NOT NULL,
      total DECIMAL(10,2) NOT NULL,
      estado ENUM('emitida','confirmada','cancelada') DEFAULT 'emitida',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      FOREIGN KEY (cotizacion_id) REFERENCES cotizaciones(id),
      FOREIGN KEY (cliente_id) REFERENCES users(id),
      FOREIGN KEY (vendedor_id) REFERENCES users(id)
    )`,

    // HISTORIAL GLOBAL DE ACCIONES (auditoría completa)
    `CREATE TABLE IF NOT EXISTS historial (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      accion VARCHAR(100) NOT NULL,
      entidad VARCHAR(50) NOT NULL,
      entidad_id INT,
      datos_anteriores JSON,
      datos_nuevos JSON,
      descripcion TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )`,

    // VERSIONES DE PRODUCTOS (historial de ediciones)
    `CREATE TABLE IF NOT EXISTS producto_versiones (
      id INT AUTO_INCREMENT PRIMARY KEY,
      producto_id INT NOT NULL,
      version INT NOT NULL DEFAULT 1,
      nombre VARCHAR(150) NOT NULL,
      descripcion TEXT,
      precio DECIMAL(10,2) NOT NULL,
      stock INT NOT NULL,
      modificado_por INT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (producto_id) REFERENCES productos(id) ON DELETE CASCADE,
      FOREIGN KEY (modificado_por) REFERENCES users(id)
    )`
  ];

  const names = [
    "users", "refresh_tokens", "productos", "cotizaciones",
    "cotizacion_items", "boletas", "historial", "producto_versiones"
  ];

  let i = 0;
  const run = () => {
    if (i >= queries.length) {
      seedAdmin();
      return;
    }
    db.query(queries[i], (err) => {
      if (err) console.error(`❌ Error tabla ${names[i]}:`, err.message);
      else console.log(`📦 Tabla ${names[i]} lista`);
      i++;
      run();
    });
  };
  run();
}

function seedAdmin() {
  // Solo ejecuta si no hay ningún usuario en la BD
  db.query("SELECT id FROM users LIMIT 1", (err, results) => {
    if (err || results.length > 0) return;

    const bcrypt = require("bcrypt");

    const usuarios = [
      { email: "admin@sistema.com",    password: "Admin1234!",    nombre: "Administrador",  rol: "admin"    },
      { email: "vendedor@sistema.com", password: "Vendedor1234!", nombre: "Carlos Vendedor", rol: "vendedor" },
      { email: "cliente@gmail.com",    password: "Cliente1234!",  nombre: "María Cliente",   rol: "cliente"  },
    ];

    // Hashear los 3 passwords en paralelo
    Promise.all(
      usuarios.map(u =>
        new Promise((resolve, reject) => {
          bcrypt.hash(u.password, 10, (err, hash) => {
            if (err) return reject(err);
            resolve({ ...u, hash });
          });
        })
      )
    ).then(datos => {
      const values = datos.map(d => [d.email, d.hash, d.nombre, d.rol]);

      db.query(
        "INSERT INTO users (email, password, nombre, rol) VALUES ?",
        [values],
        (err, result) => {
          if (err) {
            console.error("❌ Error al sembrar usuarios:", err.message);
            return;
          }

          console.log("🌱 Usuarios de ejemplo creados:");
          console.log("   👑 Admin    → admin@sistema.com    / Admin1234!");
          console.log("   🧑‍💼 Vendedor → vendedor@sistema.com / Vendedor1234!");
          console.log("   🛒 Cliente  → cliente@gmail.com    / Cliente1234!");

          // El admin es el primer ID insertado
          const adminId = result.insertId;

          const productos = [
            [
              "Laptop Dell Inspiron 15",
              "Intel Core i5-1235U, 8GB RAM DDR4, 256GB SSD NVMe, pantalla 15.6\" FHD",
              2500.00,
              10,
              adminId
            ],
            [
              "Mouse Logitech MX Master 3",
              "Mouse inalámbrico ergonómico, sensor 4000 DPI, conectividad Bluetooth y USB",
              180.00,
              25,
              adminId
            ],
          ];

          db.query(
            "INSERT INTO productos (nombre, descripcion, precio, stock, created_by) VALUES ?",
            [productos],
            (err) => {
              if (err) {
                console.error("❌ Error al sembrar productos:", err.message);
                return;
              }
              console.log("🌱 Productos de ejemplo creados:");
              console.log("   💻 Laptop Dell Inspiron 15  → S/ 2500.00 (stock: 10)");
              console.log("   🖱️  Mouse Logitech MX Master → S/ 180.00  (stock: 25)");
            }
          );
        }
      );
    }).catch(err => {
      console.error("❌ Error generando hashes:", err.message);
    });
  });
}

module.exports = db;