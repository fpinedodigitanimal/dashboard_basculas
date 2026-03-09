# 🚀 Quick Start

## Instalación Rápida (Windows)

### 1. Ejecutar setup
```bash
.\setup.bat
```

Este script instala todas las dependencias automáticamente.

### 2. Configurar tokens
Edita el archivo `.env` con tus tokens:
```
DIGITANIMAL_TOKEN=tu_token_aqui
REMOTEIOT_TOKEN=tu_token_aqui
```

### 3. Ejecutar
```bash
.\run.bat
```

Esto abrirá dos ventanas:
- Backend: http://localhost:8050
- Frontend: http://localhost:3000

---

## Instalación Manual

### Opción A: Con backend real

**Terminal 1 - Backend:**
```bash
cd backend
pip install -r requirements.txt
python api.py
```

**Terminal 2 - Frontend:**
```bash
npm install
npm run dev
```

### Opción B: Solo frontend (datos mock)

```bash
npm install
npm run dev
```

El frontend funciona independientemente con datos de ejemplo.

---

## Comandos Útiles

```bash
# Desarrollo
npm run dev          # Iniciar dev server

# Build
npm run build        # Compilar para producción
npm run preview      # Preview del build

# Backend
cd backend
python api.py        # Iniciar API
```

---

## Verificación

1. ✅ Frontend carga en http://localhost:3000
2. ✅ Backend responde en http://localhost:8050/api/health
3. ✅ Datos se actualizan automáticamente cada 60s

---

## Troubleshooting

**Error: No module named 'flask_cors'**
```bash
cd backend
pip install -r requirements.txt
```

**Error: Command not found: npm**
- Instala Node.js desde https://nodejs.org

**Frontend no carga datos:**
- Revisa que el backend esté corriendo
- Verifica la consola del navegador
- El frontend usará datos mock si el backend no responde

---

¿Problemas? Ver [README.md](README.md) para documentación completa.
