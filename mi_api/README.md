BackendJS - Guía de uso con Thunder Client
Esta guía te muestra paso a paso cómo probar todos los endpoints de la API usando Thunder Client (la extensión de VS Code).

📌 Requisitos previos
Tener el servidor corriendo (npm run dev o docker compose up).
Tener instalada la extensión Thunder Client en VS Code.
Tener credenciales de prueba (si usaste el seed: admin/admin123, juan/juan123, maria/maria123).
🔑 1. Obtener un token JWT (Login)
Este paso es obligatorio para todas las operaciones con ítems.

Campo	Valor
Método	POST
URL	http://localhost:3000/auth/login
Headers	Content-Type: application/json
Body (JSON)	Ver ejemplo abajo
Body (JSON):

{
  "username": "admin",
  "password": "admin123"
}

 2. Operaciones con Ítems
Para todas estas operaciones debes agregar el Header de autorización:

Header: Authorization

Value: Bearer <pega_aquí_el_token>

📋 2.1 Obtener todos los ítems del usuario
Campo	Valor
Método	GET
URL	http://localhost:3000/items
Headers	Authorization: Bearer <tu_token>
Pasos:

Crea una nueva solicitud.

Método GET, URL: http://localhost:3000/items

Pestaña Headers, agrega Authorization con el valor Bearer <token>.

Haz clic en Send.

Verás un arreglo JSON con los ítems del usuario autenticado.
2.3 Crear un nuevo ítem
Campo	Valor
Método	POST
URL	http://localhost:3000/items
Headers	Content-Type: application/json
Authorization: Bearer <tu_token>
Body (JSON)	Ver ejemplo
Body (JSON):

json
{
  "name": "Mi nuevo ítem"
}
Pasos:

Método POST, URL: http://localhost:3000/items

Headers: agrega Content-Type y Authorization.

Pestaña Body, selecciona JSON, pega el body.

Envía. La respuesta será el nuevo ítem creado con su ID.

✏️ 2.4 Actualizar un ítem existente
Campo	Valor
Método	PUT
URL	http://localhost:3000/items/1 (usa el ID del ítem a modificar)
Headers	Content-Type: application/json
Authorization: Bearer <tu_token>
Body (JSON)	Ver ejemplo
Body (JSON):

json
{
  "name": "Nombre actualizado del ítem"
}
Pasos: Igual que en la creación, pero cambiando el método a PUT y la URL incluyendo el ID.

❌ 2.5 Eliminar un ítem
Campo	Valor
Método	DELETE
URL	http://localhost:3000/items/1 (usa el ID del ítem a borrar)
Headers	Authorization: Bearer <tu_token>
Pasos:

Método DELETE, URL con el ID del ítem.

Header Authorization con el token.

Envía. La respuesta será un mensaje { "message": "Eliminado" }.

🔄 3. Registrar un nuevo usuario (opcional)
Si necesitas crear una cuenta nueva:

Campo	Valor
Método	POST
URL	http://localhost:3000/auth/register
Headers	Content-Type: application/json
Body (JSON)	Ver ejemplo
Body (JSON):

json
{
  "username": "nuevo_usuario",
  "password": "contraseña123"
}



##LEVANTAR POR DOCKER 

#LIMPIA CACHE
docker-compose down
docker system prune -f

#LEVANTA CONTENEDOR DOCKER
docker-compose up -d

#LOGS docker
docker-compose logs -f app
# Detener
docker-compose down

# Ejecutar seed (cuando el contenedor esté listo)
docker-compose exec app node seedP.js


usar https://prueva-semana-10-1.onrender.com/