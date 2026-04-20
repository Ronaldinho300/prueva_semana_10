const express = require("express");
const router = express.Router();
const db = require("./db");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

async function sendTokenEmail(email, token) {
  await transporter.sendMail({
    from: `"API Backend" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔑 Tu token de acceso",
    html: `
      <div style="font-family:monospace;background:#0a0a0f;color:#e2e8f0;padding:2rem;border-radius:12px;max-width:500px">
        <h2 style="color:#7c3aed">🚀 Login exitoso</h2>
        <p>Tu token JWT de acceso es:</p>
        <div style="background:#12121a;border:1px solid #1e1e2e;border-radius:8px;padding:1rem;word-break:break-all;color:#10b981;font-size:0.75rem;margin:1rem 0">${token}</div>
        <p style="color:#64748b;font-size:0.8rem">Este token expira en 24 horas.</p>
      </div>
    `,
  });
}

// POST /register
router.post("/register", async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email y contraseña requeridos" });

  try {
    const hash = await bcrypt.hash(password, 10);
    db.query("INSERT INTO users (email, password) VALUES (?, ?)", [email, hash], async (err) => {
      if (err) {
        if (err.code === "ER_DUP_ENTRY") return res.status(409).json({ message: "El email ya está registrado" });
        return res.status(500).json({ message: "Error al registrar usuario" });
      }
      try {
        await transporter.sendMail({
          from: `"API Backend" <${process.env.EMAIL_USER}>`,
          to: email,
          subject: "✅ Registro exitoso",
          html: `<div style="font-family:monospace;padding:2rem"><h2 style="color:#10b981">✅ Cuenta creada</h2><p>Registrado con: <strong>${email}</strong></p></div>`,
        });
      } catch (e) { console.warn("⚠ Email no enviado:", e.message); }
      res.status(201).json({ message: "Usuario creado. Revisa tu email." });
    });
  } catch (err) {
    res.status(500).json({ message: "Error interno del servidor" });
  }
});

// POST /login
router.post("/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ message: "Email y contraseña requeridos" });

  db.query("SELECT * FROM users WHERE email = ?", [email], async (err, results) => {
    if (err) return res.status(500).json({ message: "Error interno" });
    if (results.length === 0) return res.status(401).json({ message: "Usuario no encontrado" });

    const user = results[0];
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ message: "Contraseña incorrecta" });

    const token = jwt.sign({ id: user.id, email: user.email }, process.env.JWT_SECRET, { expiresIn: "24h" });

    try {
      await sendTokenEmail(email, token);
      console.log(`📧 Token enviado a ${email}`);
    } catch (e) { console.warn("⚠ Email no enviado:", e.message); }

    res.json({ token, message: "Login exitoso. Token enviado a tu email." });
  });
});

module.exports = router;