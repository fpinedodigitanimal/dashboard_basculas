# Sistema de Autenticación - Dashboard Básculas

## Descripción

Se ha implementado un sistema de autenticación básico para proteger el acceso al dashboard de básculas. El sistema utiliza sesiones de Flask en el backend y un guardián de rutas (ProtectedRoute) en el frontend React.

## Características

### Backend (Flask)
- ✅ Autenticación basada en sesiones de Flask
- ✅ Credenciales configurables mediante variables de entorno
- ✅ Decorador `@login_required` para proteger rutas
- ✅ Endpoints de autenticación:
  - `POST /api/auth/login` - Iniciar sesión
  - `POST /api/auth/logout` - Cerrar sesión
  - `GET /api/auth/status` - Verificar estado de autenticación

### Frontend (React)
- ✅ Componente de Login con interfaz moderna
- ✅ Contexto de autenticación global (AuthProvider)
- ✅ Hook personalizado `useAuth` para gestionar el estado
- ✅ Componente ProtectedRoute para proteger el contenido
- ✅ Botón de logout en el header
- ✅ Cookies con soporte de credenciales (withCredentials)

## Configuración

### 1. Variables de Entorno

Copia el archivo `.env.example` a `.env` en la carpeta `backend/`:

```bash
cd react-dashboard/backend
cp .env.example .env
```

Edita el archivo `.env` y configura las credenciales:

```env
# Autenticación
ADMIN_USERNAME=digitanimal
ADMIN_PASSWORD=digibasculas
SECRET_KEY=cambia-esta-clave-secreta-en-produccion
```

⚠️ **IMPORTANTE**: Cambia la `SECRET_KEY` en producción por una clave aleatoria segura.

### 2. Credenciales por Defecto

- **Usuario**: `digitanimal`
- **Contraseña**: `digibasculas`

## Seguridad

### Consideraciones de Seguridad

1. **Variables de Entorno**: Las credenciales NO están incluidas en el código fuente, se cargan desde variables de entorno.

2. **SECRET_KEY**: Se utiliza para firmar las sesiones de Flask. Debe ser única y secreta en producción.

3. **HTTPS**: En producción, asegúrate de usar HTTPS para proteger las credenciales en tránsito.

4. **Cookies HTTP-Only**: Las cookies de sesión están configuradas como HTTP-Only para prevenir ataques XSS.

5. **CORS**: Configurado con `supports_credentials: true` para permitir el envío de cookies en peticiones cross-origin.

### Mejoras Futuras (Opcional)

Para un entorno de producción más robusto:
- Implementar hash de contraseñas (bcrypt, argon2)
- Añadir soporte para múltiples usuarios
- Implementar límite de intentos de login
- Agregar tokens JWT para autenticación sin estado
- Implementar 2FA (autenticación de dos factores)

## Rutas Protegidas

Todas las rutas de API están protegidas excepto:
- `/api/auth/login`
- `/api/auth/logout`
- `/api/auth/status`
- `/api/health`

## Uso

### Login
1. Accede al dashboard
2. Si no estás autenticado, verás la pantalla de login
3. Ingresa usuario y contraseña
4. Click en "Iniciar sesión"

### Logout
1. Click en el botón de logout (icono de puerta) en el header
2. Confirma la acción
3. Serás redirigido al login

## Archivo de Variables de Entorno

El archivo `.env` en `backend/` contiene:

```env
# Variables de entorno - Backend API

# Token API Digitanimal Labs (OBLIGATORIO)
DIGITANIMAL_TOKEN=your_token_here

# Token RemoteIoT (OBLIGATORIO)
REMOTEIOT_TOKEN=your_remoteiot_token_here

# Puerto del servidor backend
PORT=8050

# Modo debug
DEBUG=1

# Timeouts (opcional)
REMOTEIOT_TIMEOUT_S=30
BASCULAS_DATA_REFRESH_MS=100000

# Cache (opcional)
BASCULAS_CACHE_DIR=./cache

# Autenticación
ADMIN_USERNAME=digitanimal
ADMIN_PASSWORD=digibasculas
SECRET_KEY=tu-clave-secreta-super-segura-cambiala-en-produccion
```

## Estructura de Archivos

```
react-dashboard/
├── backend/
│   ├── .env                    # Variables de entorno (NO en git)
│   ├── .env.example            # Plantilla de variables
│   └── api.py                  # Backend Flask con autenticación
├── src/
│   ├── components/
│   │   ├── Login.jsx           # Componente de login
│   │   ├── ProtectedRoute.jsx  # Guardián de rutas
│   │   └── Header.jsx          # Header con botón logout
│   ├── hooks/
│   │   └── useAuth.js          # Hook y contexto de autenticación
│   ├── services/
│   │   └── api.js              # Cliente API con credentials
│   ├── App.jsx                 # App envuelta en ProtectedRoute
│   └── main.jsx                # App envuelta en AuthProvider
└── AUTH.md                     # Este archivo
```

## Desarrollo

El archivo `.env` está incluido en `.gitignore` para evitar exponer credenciales. Cada desarrollador debe crear su propio archivo `.env` a partir de `.env.example`.

## Troubleshooting

### No puedo iniciar sesión
- Verifica que el archivo `.env` existe en `backend/`
- Verifica que las credenciales son correctas
- Revisa la consola del navegador para errores

### Error de CORS
- Verifica que el backend está configurado con `supports_credentials: true`
- Verifica que el frontend usa `withCredentials: true` en axios

### Sesión se pierde al recargar
- Verifica que `SECRET_KEY` está configurada en `.env`
- Verifica que las cookies se están enviando (Network tab en DevTools)
