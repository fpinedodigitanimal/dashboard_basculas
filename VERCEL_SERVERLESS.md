# 🚀 Despliegue Todo-en-Uno en Vercel

## ✅ Arquitectura Simplificada

Todo el proyecto (frontend + backend) se despliega en Vercel:

```
Vercel
├── Frontend (React + Vite) → dist/
└── Backend (Python serverless) → api/index.py
```

## 📋 ¿Qué se ha configurado?

### Backend Serverless
- ✅ Carpeta `/api` con Flask adaptado a funciones serverless
- ✅ Autenticación con sesiones
- ✅ Endpoints de datos en modo DEMO
- ⚠️ **Sin SSE** (no compatible con serverless) → usa polling cada 5s

### Frontend
- ✅ Rutas relativas `/api`  (mismo dominio)
- ✅ Polling en lugar de SSE para actualizaciones
- ✅ Build optimizado para producción

### Configuración Vercel
- ✅ [`vercel.json`](vercel.json) con rewrites y headers CORS
- ✅ [`api/requirements.txt`](api/requirements.txt) con dependencias Python

---

## 🚀 Cómo Desplegar

### 1. Conectar repositorio a Vercel

1. Ve a [vercel.com](https://vercel.com) y haz login con GitHub
2. Click en **"Add New Project"**
3. **Import Git Repository**
4. Selecciona: `fpinedodigitanimal/dashboard_basculas`
5. Click en **"Import"**

### 2. Configurar el proyecto

Vercel detectará automáticamente la configuración desde `vercel.json`:

- ✅ **Framework Preset**: Vite (detectado)
- ✅ **Build Command**: `npm run build` (configurado)
- ✅ **Output Directory**: `dist` (configurado)
- ✅ **Install Command**: `npm install` (automático)

**No necesitas cambiar nada** en la configuración básica.

### 3. Configurar Variables de Entorno (Opcional)

En **Settings → Environment Variables**, puedes añadir:

```env
# Credenciales de admin (opcional, por defecto digitanimal/digibasculas)
ADMIN_USERNAME=digitanimal
ADMIN_PASSWORD=digibasculas

# Clave secreta para sesiones (recomendado cambiar)
SECRET_KEY=genera-clave-aleatoria-aqui
```

Para generar `SECRET_KEY` aleatoria:
```bash
python -c "import secrets; print(secrets.token_hex(32))"
```

### 4. Deploy

Click en **"Deploy"**

Vercel:
1. Instalará dependencias de Node.js (`npm install`)
2. Compilará el frontend (`npm run build`)
3. Instalará dependencias de Python (desde `api/requirements.txt`)
4. Desplegará todo

⏱️ El primer deploy toma ~2-3 minutos.

### 5. Obtener URL

Una vez completado, Vercel te dará una URL como:
```
https://tu-proyecto.vercel.app
```

---

## ✅ Verificar que funciona

1. Abre tu URL de Vercel
2. Deberías ver la pantalla de login
3. Usa credenciales: `admin` / `admin`
4. Deberías ver el dashboard con datos de ejemplo

---

## 🔧 Desarrollo Local

Para trabajar localmente:

### Opción 1: Con backend de Vercel (simple)

```bash
npm run dev
```

Usa el proxy de Vite (`vite.config.js`) que redirige `/api` a las funciones serverless locales.

### Opción 2: Con backend tradicional Flask

```bash
# Terminal 1 - Backend
cd backend
set DEMO_MODE=1
python api.py

# Terminal 2 - Frontend
npm run dev
```

---

## 📊 Limitaciones de Vercel Serverless

### ⚠️ Timeouts
- **Plan gratuito**: 10 segundos máximo por request
- **Plan Pro**: 60 segundos máximo

Si ves timeouts, es porque una función tarda mucho.

### ⚠️ Sin persistencia entre requests
Cada request es independiente. No hay:
- Estado en memoria compartido
- WebSockets ni SSE (Server-Sent Events)
- Procesos en background

**Solución implementada**: Polling cada 5 segundos en lugar de SSE.

### ⚠️ Base de datos SQLite no persiste
Las funciones serverless son efímeras. Si necesitas persistencia:
- Usa base de datos externa (Vercel Postgres, PlanetScale, Supabase)
- O Railway/Render para el backend

---

## 🔄 Actualizaciones

Cada vez que hagas **push a `main`**, Vercel redesplegará automáticamente.

```bash
git add .
git commit -m "Update dashboard"
git push
```

Vercel detecta el push y despliega en ~1-2 minutos.

---

## 🌐 Dominio Personalizado (Opcional)

1. En tu proyecto de Vercel → **Settings → Domains**
2. **Add Domain**
3. Ingresa tu dominio: `dashboard.tuempresa.com`
4. Sigue las instrucciones para configurar DNS

Vercel provee HTTPS automáticamente.

---

## 🐛 Troubleshooting

### Error: "Module not found"

python
→ Verifica que `api/requirements.txt` tenga todos los módulos necesarios

### Error 500 en `/api/*`

→ Revisa los logs en Vercel:
1. Ve a tu proyecto
2. **Deployments** → Click en el deployment activo
3. **Functions** → Busca errores en los logs

### Login no funciona

→ Las cookies requieren HTTPS. En desarrollo local usa `http://localhost:3000`, no la IP.

### Datos no se actualizan

→ El polling está configurado a 5 segundos. Espera o recarga la página.

---

## 💡 Próximos Pasos

Si necesitas funciones avanzadas que Vercel serverless no soporta:

1. **Opción A**: Mantén frontend en Vercel, backend en Railway
   - Sigue la guía: [RAILWAY_DEPLOYMENT.md](RAILWAY_DEPLOYMENT.md)

2. **Opción B**: Despliega todo en Raspberry Pi
   - Usa: `./deploy-raspberry.sh`

---

## 📝 Resumen de Archivos

- **`/api/`** - Backend Python serverless
  - `index.py` - Funciones serverless
  - `requirements.txt` - Dependencias Python
  
- **`/src/`** - Frontend React
  - Usa polling en lugar de SSE
  - Rutas relativas `/api`

- **`vercel.json`** - Configuración de Vercel
  - Rewrites para rutas API
  - Headers CORS

¿Listo para desplegar? 🚀
