const nodemailer = require("nodemailer");

function enviarTokenEmail(email, token) {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS
    }
  });

  const mailOptions = {
    from: `"Sistema de Ventas" <${process.env.EMAIL_USER}>`,
    to: email,
    subject: "🔐 Tu cuenta ha sido bloqueada — Token de recuperación",
    text: `Tu cuenta fue bloqueada por demasiados intentos fallidos.\n\nTu token de recuperación es:\n${token}\n\nEste token expira en 10 minutos.\n\nEnvía una petición POST a /auth/recover con:\n{\n  "token": "${token}",\n  "newPassword": "TuNuevaContraseña"\n}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 520px; margin: auto; border: 1px solid #e0e0e0; border-radius: 8px; overflow: hidden;">
        <div style="background: #c0392b; padding: 24px; text-align: center;">
          <h2 style="color: white; margin: 0;">🔐 Cuenta Bloqueada</h2>
        </div>
        <div style="padding: 28px; background: #fff;">
          <p style="color: #333; font-size: 15px;">
            Tu cuenta fue <strong>bloqueada temporalmente</strong> por demasiados intentos de inicio de sesión fallidos.
          </p>
          <p style="color: #333; font-size: 15px;">Para recuperar el acceso, usa el siguiente token:</p>

          <div style="background: #f4f4f4; border: 1px dashed #aaa; border-radius: 6px; padding: 16px; text-align: center; margin: 20px 0;">
            <code style="font-size: 13px; word-break: break-all; color: #c0392b;">${token}</code>
          </div>

          <p style="color: #555; font-size: 14px;">⏳ Este token <strong>expira en 10 minutos</strong>.</p>

          <hr style="border: none; border-top: 1px solid #eee; margin: 20px 0;" />

          <p style="color: #555; font-size: 14px;">Envía una petición <strong>POST</strong> a <code>/auth/recover</code> con:</p>
          <pre style="background: #f9f9f9; padding: 12px; border-radius: 6px; font-size: 13px; overflow-x: auto;">{
  "token": "&lt;el token de arriba&gt;",
  "newPassword": "TuNuevaContraseña"
}</pre>

          <p style="color: #999; font-size: 12px; margin-top: 24px;">
            Si no fuiste tú, ignora este correo. Tu cuenta permanecerá bloqueada.
          </p>
        </div>
      </div>
    `
  };

  transporter.sendMail(mailOptions, (err, info) => {
    if (err) {
      console.error("❌ Error enviando email de recuperación:", err.message);
    } else {
      console.log("📧 Email de recuperación enviado a:", email, "→", info.messageId);
    }
  });
}

module.exports = { enviarTokenEmail };