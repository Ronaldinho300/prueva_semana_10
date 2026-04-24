const express = require("express");
const router = express.Router();
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const { verifyToken, requireRol } = require("./middleware");
const { registrar } = require("./historial.helper");
const { enviarTokenEmail } = require("./mailer");




// ─────────────────────────────────────────────
// Helpers de validación
// ─────────────────────────────────────────────
function validarEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validarPassword(pass) {
  // Mínimo 8 caracteres, al menos una mayúscula, una minúscula y un número
  return /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(pass);
}

function generarTokens(user) {
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, rol: user.rol, nombre: user.nombre },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );
  const refreshToken = jwt.sign(
    { id: user.id },
    process.env.REFRESH_SECRET,
    { expiresIn: "7d" }
  );
  return { accessToken, refreshToken };
}

// ─────────────────────────────────────────────
// POST /auth/register  — solo clientes
// ─────────────────────────────────────────────
router.post("/register", async (req, res) => {
  const { email, password, nombre } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({ message: "Email, nombre y contraseña son requeridos" });
  }
  if (!validarEmail(email)) {
    return res.status(400).json({ message: "Formato de email inválido" });
  }
  if (!validarPassword(password)) {
    return res.status(400).json({
      message: "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número"
    });
  }
  if (nombre.trim().length < 2) {
    return res.status(400).json({ message: "El nombre debe tener al menos 2 caracteres" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (email, password, nombre, rol) VALUES (?, ?, ?, 'cliente')",
      [email.toLowerCase().trim(), hash, nombre.trim()],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "El email ya está registrado" });
          }
          return res.status(500).json({ message: "Error al registrar usuario" });
        }
        registrar({
          userId: result.insertId,
          accion: "REGISTRO_CLIENTE",
          entidad: "users",
          entidadId: result.insertId,
          nuevo: { email, nombre, rol: "cliente" },
          descripcion: `Nuevo cliente registrado: ${email}`
        });
        res.status(201).json({ message: "Cliente registrado exitosamente" });
      }
    );
  } catch {
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ─────────────────────────────────────────────
// POST /auth/login
// ─────────────────────────────────────────────
router.post("/login", (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: "Email y contraseña requeridos" });
  }

  db.query(
    "SELECT * FROM users WHERE email = ? AND activo = 1",
    [email.toLowerCase().trim()],
    async (err, results) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (results.length === 0) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const user = results[0];

      // ⛔ VERIFICAR BLOQUEO
      if (user.blocked_until && new Date() < new Date(user.blocked_until)) {
        return res.status(403).json({
          message: "Usuario bloqueado. Revisa tu correo para recuperación."
        });
      }

      const valid = await bcrypt.compare(password, user.password);

      // ❌ PASSWORD INCORRECTA
      if (!valid) {
        let attempts = user.login_attempts + 1;

        // 🔴 SI LLEGA A 3 INTENTOS → bloquear y enviar token de recuperación
        if (attempts >= 3) {
          const recoveryToken = jwt.sign(
            { id: user.id },
            process.env.REFRESH_SECRET,
            { expiresIn: "10m" }
          );

          const expires = new Date(Date.now() + 10 * 60 * 1000);
          // Fecha de bloqueo: indefinida hasta que recupere la cuenta
          const blockedUntil = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000);

          // 1️⃣ Marcar cuenta como bloqueada Y fijar intentos en 3
          db.query(
            "UPDATE users SET login_attempts = 3, blocked_until = ? WHERE id = ?",
            [blockedUntil, user.id],
            (err) => {
              if (err) console.error("⚠️ Error bloqueando usuario:", err.message);
            }
          );

          // 2️⃣ Invalidar tokens de recuperación anteriores que no se hayan usado
          db.query(
            "UPDATE recovery_tokens SET used = 1 WHERE user_id = ? AND used = 0",
            [user.id]
          );

          // 3️⃣ Guardar el nuevo token de recuperación
          db.query(
            "INSERT INTO recovery_tokens (user_id, token, expires_at) VALUES (?, ?, ?)",
            [user.id, recoveryToken, expires],
            (err) => {
              if (err) console.error("⚠️ Error guardando recovery token:", err.message);
            }
          );

          // 4️⃣ Enviar token por email
          enviarTokenEmail(user.email, recoveryToken);

          return res.status(403).json({
            message: "Cuenta bloqueada por demasiados intentos fallidos. Se envió un token de recuperación a tu correo."
          });
        }

        // 🔁 Actualizar contador de intentos (aún no llega a 3)
        db.query(
          "UPDATE users SET login_attempts = ? WHERE id = ?",
          [attempts, user.id]
        );

        return res.status(401).json({
          message: `Credenciales incorrectas. Intento ${attempts} de 3.`
        });
      }

      // 🔓 LOGIN EXITOSO → reset intentos
      db.query(
        "UPDATE users SET login_attempts = 0, blocked_until = NULL WHERE id = ?",
        [user.id]
      );

      const { accessToken, refreshToken } = generarTokens(user);

      db.query(
        "INSERT INTO refresh_tokens (user_id, token) VALUES (?, ?)",
        [user.id, refreshToken]
      );

      registrar({
        userId: user.id,
        accion: "LOGIN",
        entidad: "users",
        entidadId: user.id,
        descripcion: `Login exitoso: ${user.email}`
      });

      res.json({
        accessToken,
        refreshToken,
        usuario: {
          id: user.id,
          email: user.email,
          nombre: user.nombre,
          rol: user.rol
        },
        message: "Login exitoso"
      });
    }
  );
});

// ─────────────────────────────────────────────
// POST /auth/refresh  — renueva el access token
// ─────────────────────────────────────────────
router.post("/refresh", (req, res) => {
  const { refreshToken } = req.body;
  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token requerido" });
  }

  jwt.verify(refreshToken, process.env.REFRESH_SECRET, (err, decoded) => {
    if (err) return res.status(403).json({ message: "Refresh token inválido o expirado" });

    db.query(
      "SELECT * FROM refresh_tokens WHERE token = ? AND user_id = ?",
      [refreshToken, decoded.id],
      (err, results) => {
        if (err || results.length === 0) {
          return res.status(403).json({ message: "Refresh token no reconocido" });
        }

        db.query("SELECT * FROM users WHERE id = ? AND activo = 1", [decoded.id], (err, users) => {
          if (err || users.length === 0) {
            return res.status(403).json({ message: "Usuario no encontrado o inactivo" });
          }

          const user = users[0];
          const { accessToken } = generarTokens(user);
          res.json({ accessToken, message: "Token renovado" });
        });
      }
    );
  });
});

// ─────────────────────────────────────────────
// POST /auth/logout
// ─────────────────────────────────────────────
router.post("/logout", verifyToken, (req, res) => {
  const { refreshToken } = req.body;

  if (!refreshToken) {
    return res.status(400).json({ message: "Refresh token requerido" });
  }

  db.query("DELETE FROM refresh_tokens WHERE token = ?", [refreshToken], (err) => {
    if (err) return res.status(500).json({ message: "Error al cerrar sesión" });

    registrar({
      userId: req.user.id,
      accion: "LOGOUT",
      entidad: "users",
      entidadId: req.user.id,
      descripcion: `Logout: ${req.user.email}`
    });

    res.json({ message: "Sesión cerrada exitosamente" });
  });
});

// ─────────────────────────────────────────────
// POST /auth/vendedores  — admin crea vendedor
// ─────────────────────────────────────────────
router.post("/vendedores", verifyToken, requireRol("admin"), async (req, res) => {
  const { email, password, nombre } = req.body;

  if (!email || !password || !nombre) {
    return res.status(400).json({ message: "Email, nombre y contraseña son requeridos" });
  }
  if (!validarEmail(email)) {
    return res.status(400).json({ message: "Formato de email inválido" });
  }
  if (!validarPassword(password)) {
    return res.status(400).json({
      message: "La contraseña debe tener mínimo 8 caracteres, una mayúscula, una minúscula y un número"
    });
  }
  if (nombre.trim().length < 2) {
    return res.status(400).json({ message: "El nombre debe tener al menos 2 caracteres" });
  }

  try {
    const hash = await bcrypt.hash(password, 10);
    db.query(
      "INSERT INTO users (email, password, nombre, rol) VALUES (?, ?, ?, 'vendedor')",
      [email.toLowerCase().trim(), hash, nombre.trim()],
      (err, result) => {
        if (err) {
          if (err.code === "ER_DUP_ENTRY") {
            return res.status(409).json({ message: "El email ya está registrado" });
          }
          return res.status(500).json({ message: "Error al crear vendedor" });
        }
        registrar({
          userId: req.user.id,
          accion: "CREAR_VENDEDOR",
          entidad: "users",
          entidadId: result.insertId,
          nuevo: { email, nombre, rol: "vendedor" },
          descripcion: `Admin ${req.user.email} creó vendedor: ${email}`
        });
        res.status(201).json({ message: "Vendedor creado exitosamente", id: result.insertId });
      }
    );
  } catch {
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// ─────────────────────────────────────────────
// GET /auth/vendedores  — admin lista vendedores
// ─────────────────────────────────────────────
router.get("/vendedores", verifyToken, requireRol("admin"), (req, res) => {
  db.query(
    "SELECT id, email, nombre, activo, created_at FROM users WHERE rol = 'vendedor' ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error al obtener vendedores" });
      res.json(results);
    }
  );
});

// ─────────────────────────────────────────────
// PUT /auth/vendedores/:id  — admin edita vendedor
// ─────────────────────────────────────────────
router.put("/vendedores/:id", verifyToken, requireRol("admin"), async (req, res) => {
  const { nombre, email, activo, password } = req.body;
  const { id } = req.params;

  if (!nombre && !email && activo === undefined && !password) {
    return res.status(400).json({ message: "Debes enviar al menos un campo a actualizar" });
  }

  db.query("SELECT * FROM users WHERE id = ? AND rol = 'vendedor'", [id], async (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Vendedor no encontrado" });

    const vendedor = results[0];
    const updates = {
      nombre: nombre?.trim() || vendedor.nombre,
      email: email?.toLowerCase().trim() || vendedor.email,
      activo: activo !== undefined ? activo : vendedor.activo,
      password: vendedor.password
    };

    if (password) {
      if (!validarPassword(password)) {
        return res.status(400).json({ message: "La contraseña no cumple los requisitos de seguridad" });
      }
      updates.password = await bcrypt.hash(password, 10);
    }

    db.query(
      "UPDATE users SET nombre=?, email=?, activo=?, password=? WHERE id=?",
      [updates.nombre, updates.email, updates.activo, updates.password, id],
      (err) => {
        if (err) return res.status(500).json({ message: "Error al actualizar vendedor" });
        registrar({
          userId: req.user.id,
          accion: "EDITAR_VENDEDOR",
          entidad: "users",
          entidadId: parseInt(id),
          anterior: { nombre: vendedor.nombre, email: vendedor.email, activo: vendedor.activo },
          nuevo: { nombre: updates.nombre, email: updates.email, activo: updates.activo },
          descripcion: `Admin actualizó vendedor ID ${id}`
        });
        res.json({ message: "Vendedor actualizado exitosamente" });
      }
    );
  });
});

// ─────────────────────────────────────────────
// DELETE /auth/vendedores/:id  — admin desactiva vendedor
// ─────────────────────────────────────────────
router.delete("/vendedores/:id", verifyToken, requireRol("admin"), (req, res) => {
  const { id } = req.params;

  db.query("SELECT * FROM users WHERE id = ? AND rol = 'vendedor'", [id], (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(404).json({ message: "Vendedor no encontrado" });

    db.query("UPDATE users SET activo = 0 WHERE id = ?", [id], (err) => {
      if (err) return res.status(500).json({ message: "Error al desactivar vendedor" });
      registrar({
        userId: req.user.id,
        accion: "DESACTIVAR_VENDEDOR",
        entidad: "users",
        entidadId: parseInt(id),
        descripcion: `Admin desactivó vendedor ID ${id}`
      });
      res.json({ message: "Vendedor desactivado exitosamente" });
    });
  });
});

// ─────────────────────────────────────────────
// GET /auth/clientes  — admin lista clientes
// ─────────────────────────────────────────────
router.get("/clientes", verifyToken, requireRol("admin"), (req, res) => {
  db.query(
    "SELECT id, email, nombre, activo, created_at FROM users WHERE rol = 'cliente' ORDER BY created_at DESC",
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error al obtener clientes" });
      res.json(results);
    }
  );
});

// ─────────────────────────────────────────────
// GET /auth/perfil  — ver mi perfil
// ─────────────────────────────────────────────
router.get("/perfil", verifyToken, (req, res) => {
  db.query(
    "SELECT id, email, nombre, rol, activo, created_at FROM users WHERE id = ?",
    [req.user.id],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (results.length === 0) return res.status(404).json({ message: "Usuario no encontrado" });
      res.json(results[0]);
    }
  );
});

module.exports = router;