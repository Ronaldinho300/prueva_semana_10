const jwt = require("jsonwebtoken");
require("dotenv").config();

/**
 * Verifica el JWT y adjunta el usuario decodificado en req.user.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers["authorization"];

  if (!authHeader) {
    return res.status(401).json({ message: "Token requerido" });
  }

  const token = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7)
    : authHeader;

  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res.status(403).json({ message: "Token inválido o expirado" });
    }
    req.user = decoded; // { id, email, rol, nombre }
    next();
  });
}

/**
 * Fábrica de middleware para verificar roles.
 * Uso: requireRol("admin") o requireRol("admin", "vendedor")
 */
function requireRol(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "No autenticado" });
    }
    if (!roles.includes(req.user.rol)) {
      return res.status(403).json({
        message: `Acceso denegado. Se requiere rol: ${roles.join(" o ")}`
      });
    }
    next();
  };
}

module.exports = { verifyToken, requireRol };
