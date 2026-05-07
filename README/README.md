# Proyecto FactuLogin (explicado modo estudiante)

Este proyecto es como el inicio de un sistema de **facturación** donde primero armamos toda la parte de **login y registro de usuarios**.

La idea es:

- Que un usuario se pueda **registrar** con su nombre, correo y contraseña.
- Que luego pueda **iniciar sesión** con ese mismo correo y contraseña.
- Si todo está bien, lo mandamos a la página **principal (`main`)**.
- Si algo está mal (correo o contraseña), le mostramos un **aviso** para que sepa que se equivocó.

## ¿Qué hay hecho hasta ahora?

### 1. Front (pantalla de login/registro)

En la raíz del proyecto tenemos un archivo:

- `Login.html`: es la pantalla donde el usuario ve **dos pestañas**:
  - **Iniciar sesión**
  - **Registrarse**

Está hecho con un estilo **minimalista y limpio**, y todo se maneja con HTML, CSS y un poquito de JavaScript:

- Por defecto se muestra **Iniciar sesión**.
- Si el usuario hace clic en **"Registrarse"**, se muestra el formulario de registro.
- Si está en **"Registrarse"** y hace clic en **"Iniciar sesión"**, vuelve al formulario de login.

Los estilos viven en:

- `CSS/styles.css`: aquí está todo el diseño (fondos suaves, tarjetas, inputs, botones, etc.).

### 2. Backend simple (`DATA`)

En la carpeta `DATA` armamos un **mini backend** con **Node.js + Express + SQLite**.

Archivos importantes:

- `DATA/package.json`: define las dependencias (Express, SQLite, bcrypt, etc.).
- `DATA/db.js`: se encarga de la **base de datos SQLite**, crea la tabla `users` y tiene funciones para:
  - Crear usuarios nuevos.
  - Buscar usuarios por correo.
  - Listar todos los usuarios.
- `DATA/server.js`: es el servidor Express con la API.

Esta API hace:

- `POST /api/auth/register`
  - Recibe `nombre`, `correo` y `password`.
  - Revisa si ya existe un usuario con ese correo.
  - Si no existe, **guarda el usuario** en la base de datos con la contraseña encriptada.
  - Si el correo ya existe, devuelve un error para avisarle al frontend.

- `POST /api/auth/login`
  - Recibe `correo` y `password`.
  - Busca el usuario en la base de datos.
  - Compara la contraseña que entra con la contraseña encriptada guardada.
  - Si coincide → responde `ok: true` (el frontend luego puede mandar al usuario a `main`).
  - Si **no coincide** o el usuario no existe → responde `ok: false` y un mensaje tipo:
    - `"Correo o contraseña incorrectos"`.

- `GET /api/users`
  - Devuelve una lista de usuarios (sin mostrar las contraseñas).

La base de datos es un archivo `database.sqlite` que se crea automáticamente en `DATA`.

### 3. Qué falta (siguiente paso en Angular)

La parte de Angular va a ser:

- Crear servicios (`AuthService`) que llamen a la API de `DATA`:
  - Registrar usuarios.
  - Hacer login.
- En el componente de login:
  - Si el backend responde `ok: true` → navegar a **`/main`**.
  - Si responde error (401 o `ok: false`) → mostrar un **mensaje** tipo:
    - `"El correo o la contraseña están mal"`.
- Crear la vista `main` donde irá todo lo de facturación (que todavía no hemos construido).

En resumen: **ya tenemos armado el corazón del login/registro con base de datos**, y ahora lo vamos a conectar bonito desde Angular para que la experiencia de usuario quede completa.

