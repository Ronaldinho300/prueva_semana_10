const db = require("./db");

/**
 * Registra una acción en el historial de auditoría.
 * @param {object} params
 * @param {number} params.userId       - ID del usuario que ejecuta la acción
 * @param {string} params.accion       - Nombre de la acción (ej: "CREAR_PRODUCTO")
 * @param {string} params.entidad      - Nombre de la entidad (ej: "productos")
 * @param {number} [params.entidadId]  - ID del registro afectado
 * @param {object} [params.anterior]   - Estado anterior (para ediciones)
 * @param {object} [params.nuevo]      - Estado nuevo
 * @param {string} [params.descripcion]- Descripción legible
 */
function registrar({ userId, accion, entidad, entidadId = null, anterior = null, nuevo = null, descripcion = null }) {
  const sql = `
    INSERT INTO historial (user_id, accion, entidad, entidad_id, datos_anteriores, datos_nuevos, descripcion)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;
  db.query(sql, [
    userId,
    accion,
    entidad,
    entidadId,
    anterior ? JSON.stringify(anterior) : null,
    nuevo ? JSON.stringify(nuevo) : null,
    descripcion
  ], (err) => {
    if (err) console.error("⚠️ Error registrando historial:", err.message);
  });
}

module.exports = { registrar };
