# 🚀 Despliegue en Vercel

## Arquitectura

- **Frontend**: React + Vite desplegado en Vercel
- **Backend**: Flask debe desplegarse por separado (Vercel no soporta Flask directamente)

## Opciones para el Backend

### Opción 1: Railway (Recomendado) ⭐

1. Crea cuenta en [Railway.app](https://railway.app)
2. Crea nuevo proyecto desde GitHub
3. Selecciona el directorio `backend/`
4. Railway detectará automáticamente que es Python y lo desplegará
5. Copia la URL del backend (ej: `https://tu-app.railway.app`)

### Opción 2: Render

1. Crea cuenta en [Render.com](https://render.com)
2. Nuevo Web Service desde GitHub
3. Configura:
   - **Root Directory**: `backend`
   - **Build Command**: `pip install -r requirements.txt`
   - **Start Command**: `python api.py`
4. Copia la URL del backend

### Opción 3: Raspberry Pi

Si tienes una Raspberry Pi con IP pública o túnel:

```bash
# En la Raspberry Pi
./deploy-raspberry.sh

# Exponer con ngrok (si no tienes IP pública)
ngrok http 8050
```

## Configurar Frontend en Vercel

### 1. Conectar repositorio a Vercel

1. Ve a [vercel.com](https://vercel.com)
2. Import Git Repository
3. Selecciona tu repositorio

### 2. Configurar Variables de Entorno

En la configuración del proyecto en Vercel, añade:

```
VITE_API_URL=https://tu-backend-url.com/api
```

**Ejemplos según la opción elegida:**

- Railway: `https://tu-app.railway.app/api`
- Render: `https://tu-app.onrender.com/api`  
- Raspberry Pi con ngrok: `https://xxxx-xx-xx.ngrok.io/api`
- Raspberry Pi con IP pública: `http://tu-ip:8050/api`

### 3. Deploy

Vercel desplegará automáticamente cuando hagas push a main/master.

## Desarrollo Local

Para desarrollo local, NO necesitas configurar `VITE_API_URL`. El proxy de Vite redirigirá automáticamente `/api/*` al backend local:

```bash
# Terminal 1 - Backend
cd backend
set DEMO_MODE=1  # Windows
python api.py

# Terminal 2 - Frontend  
npm run dev
```

Accede a: http://localhost:3000

## Verificar Configuración

Una vez desplegado, verifica que el frontend puede conectar al backend:

1. Abre la consola del navegador en tu sitio de Vercel
2. No deberías ver errores 404 en las peticiones `/api/*`
3. Deberías poder iniciar sesión con `admin`/`admin`

## CORS en el Backend

Si obtienes errores de CORS, asegúrate de que el backend permita peticiones desde tu dominio de Vercel:

Edita `backend/api.py`:

```python
# Actualizar configuración de CORS
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://tu-app.vercel.app",  # Tu dominio de Vercel
            "http://localhost:3000"        # Desarrollo local
        ],
        "supports_credentials": True
    }
})
```

## Troubleshooting

### Error: "Failed to load resource: 404"

❌ El frontend no puede encontrar el backend
✅ Verifica que `VITE_API_URL` esté configurada correctamente en Vercel

### Error: CORS

❌ El backend rechaza peticiones del frontend  
✅ Configura CORS en el backend para permitir tu dominio de Vercel

### Error: "No autenticado"

❌ Las cookies no se están enviando
✅ En producción, backend y frontend deben estar en el mismo dominio o configurar `sameSite: 'none'` en las cookies del backend

## Recomendación: Same Domain

Para mejor experiencia, considera usar subdominios:

- Frontend: `app.tudominio.com` (Vercel)
- Backend: `api.tudominio.com` (Railway/Render)

Esto evita problemas de CORS y cookies.
