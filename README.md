# API Backend - Semana 10

API REST con Node.js, Express y MySQL con autenticación JWT.

## Tecnologías

- Node.js + Express
- MySQL2
- JWT (jsonwebtoken)
- bcrypt
- dotenv
- Docker

## Instalación

```bash
npm install
```

Renombrar `.env.example` a `.env` y completar las variables:

```env
DB_HOST=tu_host
DB_USER=tu_usuario
DB_PASSWORD=tu_contraseña
DB_NAME=tu_base_de_datos
DB_PORT=3306
JWT_SECRET=una_clave_secreta_segura
```

## Ejecutar

```bash
node index.js
```

Servidor en: `http://localhost:3000`

## Ejecutar con Docker

```bash
docker build -t api-backend .
docker run -p 3000:3000 --env-file .env api-backend
```

## Endpoints

### Autenticación

| Método | Ruta        | Descripción         |
|--------|-------------|---------------------|
| POST   | /register   | Registrar usuario   |
| POST   | /login      | Iniciar sesión      |

**POST /register**
```json
{ "email": "user@example.com", "password": "123456" }
```

**POST /login** → devuelve `{ "token": "..." }`
```json
{ "email": "user@example.com", "password": "123456" }
```

### Items (requiere token)

Incluir en el header: `Authorization: Bearer <token>`

| Método | Ruta              | Descripción          |
|--------|-------------------|----------------------|
| GET    | /api/items        | Listar todos         |
| GET    | /api/items/:id    | Obtener por ID       |
| POST   | /api/items        | Crear item           |
| PUT    | /api/items/:id    | Actualizar item      |
| DELETE | /api/items/:id    | Eliminar item        |

**Body para POST / PUT:**
```json
{
  "nombre": "Producto A",
  "descripcion": "Descripción del producto",
  "estado": true
}
```

## Estructura del proyecto

```
├── index.js        # Servidor principal
├── db.js           # Conexión a MySQL
├── auth.js         # Rutas de autenticación
├── items.js        # Rutas CRUD
├── middleware.js   # Verificación JWT
├── .env            # Variables de entorno (no subir a GitHub)
├── .gitignore
├── Dockerfile
└── package.json
```