const express = require("express");
const router = express.Router();
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// 🔐 VERIFICAR TOKEN Y RESETEAR CUENTA
router.post("/recover", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.status(400).json({ message: "Datos incompletos" });
  }

  // 1️⃣ Verificar firma y expiración del JWT
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.REFRESH_SECRET);
  } catch (err) {
    return res.status(401).json({ message: "Token expirado o inválido" });
  }

  // 2️⃣ Verificar que el token exista en BD y no haya sido usado
  db.query(
    "SELECT * FROM recovery_tokens WHERE token = ? AND used = 0",
    [token],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error interno" });
      if (results.length === 0) {
        return res.status(401).json({ message: "Token inválido o ya utilizado" });
      }

      // 3️⃣ Hashear la nueva contraseña
      bcrypt.hash(newPassword, 10, (err, hash) => {
        if (err) return res.status(500).json({ message: "Error al procesar la contraseña" });

        // 4️⃣ Resetear cuenta: nueva contraseña + desbloquear + reiniciar contador a 0
        db.query(
          `UPDATE users 
           SET password = ?, login_attempts = 0, blocked_until = NULL 
           WHERE id = ?`,
          [hash, decoded.id],
          (err) => {
            if (err) return res.status(500).json({ message: "Error al actualizar la cuenta" });

            // 5️⃣ Marcar TODOS los tokens de recuperación de este usuario como usados
            db.query(
              "UPDATE recovery_tokens SET used = 1 WHERE user_id = ?",
              [decoded.id],
              (err) => {
                if (err) console.error("⚠️ Error marcando tokens como usados:", err.message);
              }
            );

            res.json({
              message: "Cuenta recuperada exitosamente. Ya puedes iniciar sesión con tu nueva contraseña."
            });
          }
        );
      });
    }
  );
});

module.exports = router;