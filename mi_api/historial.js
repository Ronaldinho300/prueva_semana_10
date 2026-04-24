const express = require("express");
const router = express.Router();
const db = require("./db");
const { verifyToken, requireRol } = require("./middleware");

// ─────────────────────────────────────────────
// GET /api/historial  — admin ve todo, vendedor solo su historial
// Query params: entidad, accion, user_id, desde, hasta, limit, page
// ─────────────────────────────────────────────
router.get("/historial", verifyToken, requireRol("admin", "vendedor"), (req, res) => {
  const { entidad, accion, user_id, desde, hasta, limit = 50, page = 1 } = req.query;

  const limitNum = Math.min(parseInt(limit) || 50, 200);
  const offset = (Math.max(parseInt(page) || 1, 1) - 1) * limitNum;

  let conditions = [];
  let params = [];

  // Vendedor solo ve su propio historial
  if (req.user.rol === "vendedor") {
    conditions.push("h.user_id = ?");
    params.push(req.user.id);
  } else if (user_id) {
    conditions.push("h.user_id = ?");
    params.push(parseInt(user_id));
  }

  if (entidad) {
    conditions.push("h.entidad = ?");
    params.push(entidad);
  }
  if (accion) {
    conditions.push("h.accion LIKE ?");
    params.push(`%${accion}%`);
  }
  if (desde) {
    conditions.push("h.created_at >= ?");
    params.push(desde);
  }
  if (hasta) {
    conditions.push("h.created_at <= ?");
    params.push(hasta + " 23:59:59");
  }

  const where = conditions.length > 0 ? "WHERE " + conditions.join(" AND ") : "";

  const sql = `
    SELECT h.*, u.nombre AS usuario_nombre, u.email AS usuario_email, u.rol AS usuario_rol
    FROM historial h
    LEFT JOIN users u ON h.user_id = u.id
    ${where}
    ORDER BY h.created_at DESC
    LIMIT ? OFFSET ?
  `;

  const countSql = `SELECT COUNT(*) AS total FROM historial h ${where}`;

  db.query(countSql, params, (err, countResult) => {
    if (err) return res.status(500).json({ message: "Error al contar historial" });

    const total = countResult[0].total;
    db.query(sql, [...params, limitNum, offset], (err, results) => {
      if (err) return res.status(500).json({ message: "Error al obtener historial" });

      res.json({
        total,
        pagina: parseInt(page),
        por_pagina: limitNum,
        total_paginas: Math.ceil(total / limitNum),
        registros: results
      });
    });
  });
});

// ─────────────────────────────────────────────
// GET /api/historial/ventas  — resumen de ventas (admin y vendedor)
// ─────────────────────────────────────────────
router.get("/historial/ventas", verifyToken, requireRol("admin", "vendedor"), (req, res) => {
  const { desde, hasta } = req.query;
  let conditions = ["b.estado = 'confirmada'"];
  let params = [];

  if (req.user.rol === "vendedor") {
    conditions.push("b.vendedor_id = ?");
    params.push(req.user.id);
  }
  if (desde) { conditions.push("b.updated_at >= ?"); params.push(desde); }
  if (hasta) { conditions.push("b.updated_at <= ?"); params.push(hasta + " 23:59:59"); }

  const where = "WHERE " + conditions.join(" AND ");

  db.query(
    `SELECT 
      b.id AS boleta_id,
      b.total,
      b.updated_at AS fecha_venta,
      uc.nombre AS cliente_nombre,
      uc.email AS cliente_email,
      uv.nombre AS vendedor_nombre,
      (SELECT COUNT(*) FROM cotizacion_items ci WHERE ci.cotizacion_id = b.cotizacion_id) AS cantidad_items
     FROM boletas b
     LEFT JOIN users uc ON b.cliente_id = uc.id
     LEFT JOIN users uv ON b.vendedor_id = uv.id
     ${where}
     ORDER BY b.updated_at DESC`,
    params,
    (err, ventas) => {
      if (err) return res.status(500).json({ message: "Error al obtener historial de ventas" });

      const totalVentas = ventas.reduce((acc, v) => acc + parseFloat(v.total), 0);

      res.json({
        resumen: {
          total_ventas: ventas.length,
          monto_total: parseFloat(totalVentas.toFixed(2))
        },
        ventas
      });
    }
  );
});

// ─────────────────────────────────────────────
// GET /api/historial/entidad/:entidad/:id  — historial de un registro específico
// ─────────────────────────────────────────────
router.get("/historial/entidad/:entidad/:id", verifyToken, requireRol("admin"), (req, res) => {
  const { entidad, id } = req.params;

  db.query(
    `SELECT h.*, u.nombre AS usuario_nombre, u.email AS usuario_email
     FROM historial h
     LEFT JOIN users u ON h.user_id = u.id
     WHERE h.entidad = ? AND h.entidad_id = ?
     ORDER BY h.created_at DESC`,
    [entidad, parseInt(id)],
    (err, results) => {
      if (err) return res.status(500).json({ message: "Error al obtener historial" });
      res.json(results);
    }
  );
});

// ─────────────────────────────────────────────
// GET /api/historial/dashboard  — métricas generales (solo admin)
// ─────────────────────────────────────────────
router.get("/historial/dashboard", verifyToken, requireRol("admin"), (req, res) => {
  const queries = {
    totalVentas: "SELECT COUNT(*) AS valor FROM boletas WHERE estado = 'confirmada'",
    montoTotal: "SELECT COALESCE(SUM(total), 0) AS valor FROM boletas WHERE estado = 'confirmada'",
    cotizacionesPendientes: "SELECT COUNT(*) AS valor FROM cotizaciones WHERE estado = 'pendiente'",
    cotizacionesRevisando: "SELECT COUNT(*) AS valor FROM cotizaciones WHERE estado = 'revisando'",
    totalClientes: "SELECT COUNT(*) AS valor FROM users WHERE rol = 'cliente' AND activo = 1",
    totalVendedores: "SELECT COUNT(*) AS valor FROM users WHERE rol = 'vendedor' AND activo = 1",
    totalProductos: "SELECT COUNT(*) AS valor FROM productos WHERE activo = 1",
    ventasHoy: `SELECT COUNT(*) AS valor FROM boletas WHERE estado = 'confirmada' AND DATE(updated_at) = CURDATE()`,
    montoHoy: `SELECT COALESCE(SUM(total), 0) AS valor FROM boletas WHERE estado = 'confirmada' AND DATE(updated_at) = CURDATE()`
  };

  const keys = Object.keys(queries);
  const results = {};
  let pending = keys.length;

  keys.forEach(key => {
    db.query(queries[key], (err, rows) => {
      if (!err && rows.length > 0) {
        results[key] = parseFloat(rows[0].valor) || 0;
      } else {
        results[key] = 0;
      }
      pending--;
      if (pending === 0) {
        res.json(results);
      }
    });
  });
});

module.exports = router;
