# 🛒 API de Ventas — Documentación

Sistema de ventas con 3 roles: **Admin**, **Vendedor** y **Cliente**.  
Flujo: Cliente cotiza → Vendedor aprueba → Cliente confirma compra.

---

## 🚀 Inicio rápido

```bash
npm install
cp .env.example .env   # Configura tus variables
node index.js
```

Credenciales del admin por defecto:
- **Email:** admin@sistema.com  
- **Password:** Admin1234!

---

## 🔐 Autenticación

Todos los endpoints protegidos requieren el header:
```
Authorization: Bearer <accessToken>
```

El `accessToken` expira en **15 minutos**. Usa `/auth/refresh` para renovarlo.

---

## 📌 Endpoints

### AUTH `/auth`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/auth/register` | Público | Registro de cliente |
| POST | `/auth/login` | Público | Login (devuelve accessToken + refreshToken) |
| POST | `/auth/refresh` | Público | Renueva el accessToken |
| POST | `/auth/logout` | Autenticado | Cierra sesión |
| GET | `/auth/perfil` | Autenticado | Ver mi perfil |
| POST | `/auth/vendedores` | Admin | Crear vendedor |
| GET | `/auth/vendedores` | Admin | Listar vendedores |
| PUT | `/auth/vendedores/:id` | Admin | Editar vendedor |
| DELETE | `/auth/vendedores/:id` | Admin | Desactivar vendedor |
| GET | `/auth/clientes` | Admin | Listar clientes |

---

### PRODUCTOS `/api/productos`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/productos` | Todos | Listar (clientes solo ven activos) |
| GET | `/api/productos/:id` | Todos | Ver producto |
| POST | `/api/productos` | Admin | Crear producto |
| PUT | `/api/productos/:id` | Admin, Vendedor | Editar (vendedor solo stock/descripción) |
| DELETE | `/api/productos/:id` | Admin | Desactivar producto |
| GET | `/api/productos/:id/versiones` | Admin, Vendedor | Historial de versiones |

---

### COTIZACIONES `/api/cotizaciones`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| POST | `/api/cotizaciones` | Cliente | Solicitar cotización |
| GET | `/api/cotizaciones` | Todos | Listar (filtrado por rol) |
| GET | `/api/cotizaciones/:id` | Todos | Detalle con items |
| PUT | `/api/cotizaciones/:id/tomar` | Vendedor | Tomar cotización pendiente |
| PUT | `/api/cotizaciones/:id/aprobar` | Vendedor | Aprobar y generar boleta |
| PUT | `/api/cotizaciones/:id/rechazar` | Vendedor | Rechazar (requiere motivo) |

---

### BOLETAS `/api/boletas`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/boletas` | Todos | Listar (filtrado por rol) |
| GET | `/api/boletas/:id` | Todos | Detalle con items |
| PUT | `/api/boletas/:id/confirmar` | Cliente | Confirmar compra (descuenta stock) |
| PUT | `/api/boletas/:id/cancelar` | Cliente, Admin | Cancelar boleta |

---

### HISTORIAL `/api/historial`

| Método | Ruta | Roles | Descripción |
|--------|------|-------|-------------|
| GET | `/api/historial` | Admin, Vendedor | Historial de acciones (con filtros) |
| GET | `/api/historial/ventas` | Admin, Vendedor | Resumen de ventas confirmadas |
| GET | `/api/historial/dashboard` | Admin | Métricas generales del sistema |
| GET | `/api/historial/entidad/:entidad/:id` | Admin | Historial de un registro específico |

**Filtros disponibles para `/api/historial`:**
- `?entidad=productos` — filtrar por entidad
- `?accion=CREAR` — buscar por nombre de acción
- `?user_id=5` — acciones de un usuario (solo admin)
- `?desde=2026-01-01&hasta=2026-12-31` — rango de fechas
- `?page=1&limit=20` — paginación

---

## 🔄 Flujo de compra

```
1. Cliente → POST /api/cotizaciones          (solicita cotización con productos)
2. Vendedor → PUT /api/cotizaciones/:id/tomar   (toma la cotización)
3. Vendedor → PUT /api/cotizaciones/:id/aprobar (aprueba y genera boleta)
              o PUT /api/cotizaciones/:id/rechazar (rechaza con motivo)
4. Cliente → GET /api/boletas/:id              (ve la boleta generada)
5. Cliente → PUT /api/boletas/:id/confirmar    (confirma la compra → descuenta stock)
```

---

## 📦 Body de ejemplo

### Registro de cliente
```json
{
  "email": "juan@gmail.com",
  "password": "MiPass123",
  "nombre": "Juan Pérez"
}
```

### Solicitar cotización
```json
{
  "nota_cliente": "Necesito los productos para mañana",
  "items": [
    { "producto_id": 1, "cantidad": 2 },
    { "producto_id": 3, "cantidad": 1 }
  ]
}
```

### Crear producto (admin)
```json
{
  "nombre": "Laptop Dell",
  "descripcion": "Intel i5, 8GB RAM, 256GB SSD",
  "precio": 2500.00,
  "stock": 10
}
```

---

## 🛡️ Estados de Cotización

| Estado | Descripción |
|--------|-------------|
| `pendiente` | Recién creada por el cliente |
| `revisando` | Tomada por un vendedor |
| `aprobada` | Aprobada, boleta generada |
| `rechazada` | Rechazada por el vendedor |
| `completada` | Compra confirmada por el cliente |

## 🧾 Estados de Boleta

| Estado | Descripción |
|--------|-------------|
| `emitida` | Generada por el vendedor, esperando confirmación |
| `confirmada` | Compra completada, stock descontado |
| `cancelada` | Cancelada por el cliente o admin |


##LEVANTAR POR DOCKER

#LIMPIA CACHE docker-compose down docker system prune -f

#LEVANTA CONTENEDOR DOCKER docker-compose up -d

#LOGS docker docker-compose logs -f app

Detener
docker-compose down