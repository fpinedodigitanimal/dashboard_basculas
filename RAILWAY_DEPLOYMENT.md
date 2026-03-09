# 🚂 Guía de Despliegue: Railway + Vercel

## Arquitectura Final

```
Frontend (Vercel) ─────────────> Backend (Railway)
https://tu-app.vercel.app        https://tu-app.railway.app/api
```

---

## Parte 1: Desplegar Backend en Railway

### 1. Crear cuenta en Railway

Ve a [railway.app](https://railway.app) y crea una cuenta con GitHub.

### 2. Nuevo Proyecto

1. Click en **"New Project"**
2. Selecciona **"Deploy from GitHub repo"**
3. Conecta tu cuenta de GitHub si no lo has hecho
4. Selecciona tu repositorio: `00_dash_basculas/react-dashboard`

### 3. Railway detectará Python automáticamente

Railway verá el `requirements.txt` y configurará Python. No necesitas hacer nada más.

### 4. Configurar Variables de Entorno

En Railway, ve a tu proyecto → **Variables**:

```env
DEMO_MODE=1
ADMIN_USERNAME=admin
ADMIN_PASSWORD=admin
PORT=8050
SECRET_KEY=genera-una-clave-secreta-aleatoria-aqui
ALLOWED_ORIGINS=https://tu-app.vercel.app,http://localhost:3000
```

**Importante**: Reemplaza `tu-app` con tu dominio real de Vercel cuando lo tengas.

### 5. Obtener URL del Backend

Una vez desplegado, Railway te dará una URL como:
```
https://react-dashboard-production-xxxx.up.railway.app
```

**Copia esta URL** - la necesitarás para Vercel.

---

## Parte 2: Desplegar Frontend en Vercel

### 1. Conectar repositorio

1. Ve a [vercel.com](https://vercel.com)
2. **Import Git Repository**
3. Selecciona tu repositorio

### 2. Configurar proyecto

- **Framework Preset**: Vite
- **Root Directory**: `./` (por defecto)
- **Build Command**: `npm run build` (ya configurado)
- **Output Directory**: `dist` (ya configurado)

### 3. Variables de Entorno

Añade esta variable en **Settings → Environment Variables**:

```env
VITE_API_URL=https://tu-backend-railway.up.railway.app/api
```

**Importante**: Usa la URL que Railway te dio en el Paso 1.5, agregando `/api` al final.

### 4. Deploy

Click en **Deploy**. Vercel compilará y desplegará tu frontend.

### 5. Obtener URL de Vercel

Vercel te dará una URL como:
```
https://react-dashboard-xxxx.vercel.app
```

### 6. Actualizar CORS en Railway

**IMPORTANTE**: Vuelve a Railway y actualiza la variable:

```env
ALLOWED_ORIGINS=https://tu-app.vercel.app,http://localhost:3000
```

Reemplaza `tu-app.vercel.app` con la URL real que te dio Vercel.

Railway redesplegará automáticamente.

---

## Verificar que funciona

1. Abre tu sitio de Vercel: `https://tu-app.vercel.app`
2. Deberías ver la pantalla de login
3. Inicia sesión con `admin` / `admin`
4. Deberías ver el dashboard con datos

Si ves errores, abre la consola del navegador (F12) y revisa:
- ❌ Error CORS → Verifica `ALLOWED_ORIGINS` en Railway
- ❌ Error 404 en `/api/*` → Verifica `VITE_API_URL` en Vercel
- ❌ Error de conexión → Verifica que el backend esté corriendo en Railway

---

## Desarrollo Local

Para trabajar localmente, **no necesitas cambiar nada**:

```bash
# Terminal 1 - Backend
cd backend
set DEMO_MODE=1
python api.py

# Terminal 2 - Frontend
npm run dev
```

El proxy de Vite redirige `/api/*` a `localhost:8050` automáticamente.

---

## Costos

- ✅ **Railway**: $5 gratis/mes (suficiente para desarrollo)
- ✅ **Vercel**: Ilimitado en plan gratuito

---

## Dominios Personalizados (Opcional)

### Frontend (Vercel)
1. Settings → Domains → Add Domain
2. Configura DNS según instrucciones de Vercel
3. Ejemplo: `dashboard.miempresa.com`

### Backend (Railway)
1. Settings → Domains → Generate Domain  o agrega dominio personalizado
2. Ejemplo: `api.miempresa.com`

**No olvides actualizar** `VITE_API_URL` en Vercel y `ALLOWED_ORIGINS` en Railway.

---

## Troubleshooting

### Backend no inicia en Railway

Revisa los logs en Railway (View Logs):
- Busca errores de dependencias
- Verifica que `requirements.txt` esté completo

### Frontend no conecta al backend

1. Verifica que `VITE_API_URL` esté configurada en Vercel
2. Debe terminar en `/api`: `https://tu-backend.railway.app/api`
3. Haz **Redeploy** en Vercel después de cambiar variables

### Error de CORS

```
Access to XMLHttpRequest blocked by CORS policy
```

→ Actualiza `ALLOWED_ORIGINS` en Railway con tu dominio de Vercel real

### Sesión no persiste

Las cookies requieren HTTPS en producción. Asegúrate de usar:
- ✅ `https://` para ambos servicios
- ✅ `ALLOWED_ORIGINS` correctamente configurado

---

## Próximos pasos

Una vez funcionando:

1. Cambia las credenciales por defecto:
   - Actualiza `ADMIN_USERNAME` y `ADMIN_PASSWORD` en Railway
   - Genera `SECRET_KEY` aleatorio: `python -c "import secrets; print(secrets.token_hex(32))"`

2. Configura tokens reales (si no estás en DEMO_MODE):
   - `DIGITANIMAL_TOKEN`
   - `REMOTEIOT_TOKEN`

3. Considera dominios personalizados para una URL profesional

---

¿Necesitas ayuda con algún paso? 🚀
