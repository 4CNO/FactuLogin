# Backend simple FactuLogin (`DATA`)

Este backend está pensado para ser consumido por un frontend en **Angular** (por ejemplo, `http://localhost:4200`) y cumple con:

- **Guardar usuarios nuevos**
- **Leer usuarios existentes**
- **Comprobar correos y contraseñas**
- **Detectar usuarios existentes** (evitar registros duplicados)
- **Responder si el login es correcto o no** (para que Angular redirija a `main` o muestre un aviso)

La base de datos es un archivo **SQLite** (`database.sqlite`) que se crea automáticamente dentro de esta misma carpeta `DATA`.

## 1. Instalación

Desde una terminal, entra en la carpeta `DATA`:

```bash
cd DATA
npm install
```

## 2. Configuración opcional

Puedes copiar el archivo de ejemplo de entorno:

```bash
cp .env.example .env
```

Y ajustar, si quieres, el puerto o el origen del frontend Angular:

```env
PORT=3000
FRONTEND_ORIGIN=http://localhost:4200
```

## 3. Ejecutar el servidor

Modo normal:

```bash
npm start
```

Modo desarrollo (reinicia solo con cambios):

```bash
npm run dev
```

La API quedará en `http://localhost:3000`.

## 4. Endpoints principales

### `POST /api/auth/register`

Registra un usuario nuevo.

**Body JSON:**

```json
{
  "nombre": "Juan Pérez",
  "correo": "juan@example.com",
  "password": "123456"
}
```

### `POST /api/auth/login`

Comprueba si el usuario existe y si la contraseña es correcta.

**Body JSON:**

```json
{
  "correo": "juan@example.com",
  "password": "123456"
}
```

**Respuestas:**

- **200 OK** (login correcto): `{ ok: true, user, message }`
- **401 Unauthorized** (correo o contraseña incorrectos): `{ ok: false, error: "Correo o contraseña incorrectos" }`

### `GET /api/users`

Devuelve la lista de usuarios (sin contraseñas).

## 5. Uso desde Angular (idea rápida)

En Angular, puedes crear un servicio `AuthService` que llame a estos endpoints. Ejemplo muy básico:

```ts
login(correo: string, password: string) {
  return this.http.post<{ ok: boolean; user?: any; error?: string }>(
    'http://localhost:3000/api/auth/login',
    { correo, password }
  );
}
```

En tu componente de login:

- Si la respuesta trae `ok: true` → **navegar a `/main`**.
- Si trae `ok: false` o código 401 → **mostrar aviso**: “Correo o contraseña incorrectos”.

