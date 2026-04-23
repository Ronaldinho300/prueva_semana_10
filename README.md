# 🚀 BackendJS API — Guía Completa de Uso con Thunder Client

API REST con autenticación JWT y operaciones CRUD sobre ítems, construida con Node.js + Express + MySQL.

---

## 📌 0. Requisitos Previos

- **Node.js v18+** instalado (o Docker Desktop para local)
- **Extensión Thunder Client** instalada en VS Code
- Cuenta en [Render.com](https://render.com) conectada a GitHub
- Base de datos MySQL en Railway activa

---

## ☁️ 1. Desplegar en Render (Paso a Paso)

> Ya tienes el repositorio conectado en Render. Sigue estos pasos:

### Paso 1 — Actualiza los archivos en tu repositorio

Reemplaza en tu proyecto local los archivos `index.js` y `package.json` con los de esta entrega, luego sube los cambios a GitHub:

```bash
git add .
git commit -m "fix: puerto dinámico para Render + script start"
git push origin main
```

### Paso 2 — Configura el Web Service en Render

En el panel de Render, después de seleccionar el repositorio `Ronaldinho300/prueva_semana_10`, configura:

| Campo              | Valor              |
|--------------------|--------------------|
| **Runtime**        | `Node`             |
| **Branch**         | `main`             |
| **Build Command**  | `npm install`      |
| **Start Command**  | `npm start`        |

### Paso 3 — Agrega las Variables de Entorno

En Render ve a **Environment** → **Add Environment Variable** y agrega estas una por una:

| Key           | Value                                  |
|---------------|----------------------------------------|
| `DB_HOST`     | `shinkansen.proxy.rlwy.net`            |
| `DB_USER`     | `root`                                 |
| `DB_PASSWORD` | `rUVbwSkNfNMCKwkqcOOZZaaTvpuBLAQh`    |
| `DB_NAME`     | `railway`                              |
| `DB_PORT`     | `37613`                                |
| `JWT_SECRET`  | `mi_clave_secreta_muy_segura_2026`     |

> ⚠️ **NO** agregues `PORT` — Render lo asigna automáticamente.

### Paso 4 — Despliega

Haz clic en **Create Web Service**. Render comenzará el deploy automáticamente.

Verás en los logs:
```
✅ Conectado a MySQL
📦 Tabla users lista
📦 Tabla items lista
🚀 Servidor en http://localhost:10000
```

### Paso 5 — Obtén tu URL pública

Render te asigna una URL del tipo:
```
https://prueva-semana-10.onrender.com
```

Verifica que funciona abriendo esa URL en el navegador. Deberías ver:
```json
{ "message": "🚀 API funcionando correctamente" }
```

> ⏳ **Nota:** El plan gratuito de Render "duerme" el servicio tras 15 min de inactividad. La primera solicitud puede tardar ~30 segundos en responder.

---

## 🐳 2. Levantar en Local con Docker

```bash
# Limpiar y levantar
docker-compose down
docker system prune -f
docker build -t mi-api-node .
docker-compose up -d

# Ver logs
docker-compose logs -f app

# Detener
docker-compose down
```

---

## 📝 3. Registrar un Usuario Nuevo

| Campo      | Valor                                                             |
|------------|-------------------------------------------------------------------|
| Método     | `POST`                                                            |
| URL local  | `http://localhost:3000/auth/register`                             |
| URL Render | `https://prueva-semana-10.onrender.com/auth/register`             |
| Header     | `Content-Type: application/json`                                  |

**Body JSON:**
```json
{
  "email": "tu_correo@ejemplo.com",
  "password": "tu_contraseña123"
}
```

**Pasos en Thunder Client:**
1. New Request → método **POST**
2. URL según el entorno (local o Render)
3. **Headers** → `Content-Type: application/json`
4. **Body** → JSON → pega el body
5. **Send**

**Respuesta exitosa `201`:**
```json
{ "message": "Usuario creado exitosamente" }
```

---

## 🔑 4. Iniciar Sesión — Obtener Token JWT

> ⚠️ **OBLIGATORIO** antes de usar cualquier endpoint de ítems.

| Campo      | Valor                                                          |
|------------|----------------------------------------------------------------|
| Método     | `POST`                                                         |
| URL local  | `http://localhost:3000/auth/login`                             |
| URL Render | `https://prueva-semana-10.onrender.com/auth/login`             |
| Header     | `Content-Type: application/json`                               |

**Body JSON:**
```json
{
  "email": "tu_correo@ejemplo.com",
  "password": "tu_contraseña123"
}
```

**Pasos en Thunder Client:**
1. New Request → método **POST**
2. URL según entorno
3. **Headers** → `Content-Type: application/json`
4. **Body** → JSON → pega el body
5. **Send**
6. ⚠️ **COPIA el token** de la respuesta

**Respuesta exitosa `200`:**
```json
{
  "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "message": "Login exitoso"
}
```

> 🕐 El token dura **24 horas**.

---

## 🔒 5. Cómo Usar el Token

En la pestaña **Headers** de cada solicitud agrega:

| Key             | Value                         |
|-----------------|-------------------------------|
| `Authorization` | `Bearer <pega_tu_token_aquí>` |

---

## 📋 6. Obtener Todos los Ítems

| Campo      | Valor                                                       |
|------------|-------------------------------------------------------------|
| Método     | `GET`                                                       |
| URL local  | `http://localhost:3000/api/items`                           |
| URL Render | `https://prueva-semana-10.onrender.com/api/items`           |
| Header     | `Authorization: Bearer <tu_token>`                          |

**Respuesta exitosa `200`:**
```json
[
  {
    "id": 1,
    "nombre": "Laptop Dell",
    "descripcion": "Laptop para desarrollo",
    "estado": 1,
    "created_at": "2026-04-20T15:30:00.000Z"
  }
]
```

---

## 🔍 7. Obtener un Ítem por ID

| Campo      | Valor                                                           |
|------------|-----------------------------------------------------------------|
| Método     | `GET`                                                           |
| URL local  | `http://localhost:3000/api/items/1`                             |
| URL Render | `https://prueva-semana-10.onrender.com/api/items/1`             |
| Header     | `Authorization: Bearer <tu_token>`                              |

> Cambia el `1` por el ID del ítem que quieres consultar.

---

## ➕ 8. Crear un Nuevo Ítem

| Campo      | Valor                                                       |
|------------|-------------------------------------------------------------|
| Método     | `POST`                                                      |
| URL local  | `http://localhost:3000/api/items`                           |
| URL Render | `https://prueva-semana-10.onrender.com/api/items`           |
| Header 1   | `Content-Type: application/json`                            |
| Header 2   | `Authorization: Bearer <tu_token>`                          |

**Body JSON:**
```json
{
  "nombre": "Monitor Samsung",
  "descripcion": "Monitor 27 pulgadas 4K",
  "estado": 1
}
```

| Campo         | Requerido | Descripción                      |
|---------------|-----------|----------------------------------|
| `nombre`      | ✅ SÍ     | Nombre del ítem (máx. 100 chars) |
| `descripcion` | ❌ NO     | Descripción del ítem             |
| `estado`      | ❌ NO     | `1` = activo, `0` = inactivo     |

**Respuesta exitosa `201`:**
```json
{ "message": "Item creado", "id": 5 }
```

---

## ✏️ 9. Editar un Ítem Existente

| Campo      | Valor                                                           |
|------------|-----------------------------------------------------------------|
| Método     | `PUT`                                                           |
| URL local  | `http://localhost:3000/api/items/1`                             |
| URL Render | `https://prueva-semana-10.onrender.com/api/items/1`             |
| Header 1   | `Content-Type: application/json`                                |
| Header 2   | `Authorization: Bearer <tu_token>`                              |

**Body JSON:**
```json
{
  "nombre": "Monitor Samsung Actualizado",
  "descripcion": "Monitor 32 pulgadas 4K HDR",
  "estado": 1
}
```

**Respuesta exitosa `200`:**
```json
{ "message": "Item actualizado exitosamente" }
```

---

## ❌ 10. Eliminar un Ítem

| Campo      | Valor                                                          |
|------------|----------------------------------------------------------------|
| Método     | `DELETE`                                                       |
| URL local  | `http://localhost:3000/api/items/1`                            |
| URL Render | `https://prueva-semana-10.onrender.com/api/items/1`            |
| Header     | `Authorization: Bearer <tu_token>`                             |

**Respuesta exitosa `200`:**
```json
{ "message": "Item eliminado exitosamente" }
```

> ⚠️ Acción **irreversible**.

---

## 📊 11. Resumen de Endpoints

> Reemplaza `https://prueva-semana-10.onrender.com` con tu URL real de Render.

| Método   | Ruta             | Token | Descripción                      |
|----------|------------------|:-----:|----------------------------------|
| `GET`    | `/`              | ❌    | Verificar que la API está activa  |
| `POST`   | `/auth/register` | ❌    | Registrar usuario nuevo          |
| `POST`   | `/auth/login`    | ❌    | Iniciar sesión → obtener token   |
| `GET`    | `/api/items`     | ✅    | Obtener todos los ítems          |
| `GET`    | `/api/items/:id` | ✅    | Obtener un ítem por ID           |
| `POST`   | `/api/items`     | ✅    | Crear un nuevo ítem              |
| `PUT`    | `/api/items/:id` | ✅    | Editar un ítem existente         |
| `DELETE` | `/api/items/:id` | ✅    | Eliminar un ítem                 |

---

## ⚠️ 12. Errores Comunes

| Error                       | Causa                           | Solución                                    |
|-----------------------------|---------------------------------|---------------------------------------------|
| `401 - Token requerido`     | Falta el header Authorization   | Agrega `Authorization: Bearer <token>`      |
| `403 - Token inválido`      | Token vencido o mal copiado     | Haz login nuevamente                        |
| `404 - Ruta no encontrada`  | URL mal escrita                 | Usa `/api/items` (no `/items`)              |
| `400 - nombre requerido`    | Falta `nombre` en el body       | Incluye `nombre` en el JSON                 |
| `409 - Email ya registrado` | El correo ya existe             | Usa otro correo o haz login                 |
| `500 - Error interno`       | Variables de entorno incorrectas| Verifica las env vars en Render             |
| Respuesta lenta (~30s)      | Servicio "dormido" (plan free)  | Normal — espera el primer request           |
