# Dashboard Básculas - Guía de Desarrollo

## 🎯 Stack Tecnológico

### Frontend
- **React 18** - Library UI
- **Vite** - Build tool y dev server
- **Tailwind CSS** - Framework CSS utility-first
- **Recharts** - Librería de gráficos
- **Axios** - Cliente HTTP
- **Lucide React** - Iconos
- **date-fns** - Manipulación de fechas

### Backend
- **Flask** - Framework web Python
- **Flask-CORS** - Cross-Origin Resource Sharing
- **Pandas** - Análisis de datos
- **Requests** - Cliente HTTP

## 🏗️ Arquitectura

```
┌─────────────────────────────────────────┐
│          React Frontend                 │
│  ┌─────────────────────────────────┐   │
│  │  Components (UI)                │   │
│  │  - Header                       │   │
│  │  - StatsCards                   │   │
│  │  - ActivityChart                │   │
│  │  - AlertsPanel                  │   │
│  │  - DataTable                    │   │
│  │  - SettingsPanel                │   │
│  └─────────────────────────────────┘   │
│                ↓                        │
│  ┌─────────────────────────────────┐   │
│  │  Services (API Client)          │   │
│  │  - axios instance               │   │
│  │  - fetchDashboardData()         │   │
│  │  - fetchRemoteIoTStatus()       │   │
│  └─────────────────────────────────┘   │
└──────────────────┬──────────────────────┘
                   │ HTTP/REST
                   ↓
┌─────────────────────────────────────────┐
│         Flask Backend API               │
│  /api/dashboard                         │
│  /api/remoteiot/status                  │
│  /api/health                            │
└──────────────────┬──────────────────────┘
                   │
                   ↓
┌─────────────────────────────────────────┐
│    External APIs                        │
│  - Digitanimal Labs API                 │
│  - RemoteIoT API                        │
└─────────────────────────────────────────┘
```

## 📦 Estructura de Componentes

### App.jsx
Componente raíz que maneja:
- Estado global de datos
- Polling automático
- Coordinación entre componentes

### Header
- Branding y navegación
- Indicador de estado de conexión
- Botón de configuración

### StatsCards
- Display de métricas clave
- Grid responsive (1-4 columnas)
- Iconos temáticos

### ActivityChart
- Gráfico de líneas (Recharts)
- Dos series: pesajes y básculas activas
- Responsive container

### AlertsPanel
- Lista de alertas dinámicas
- 3 niveles de severidad (info, warning, critical)
- Dismissable

### DataTable
- Búsqueda en tiempo real
- Exportación CSV
- Paginación (futuro)

### SettingsPanel
- Modal overlay
- Configuración persistente (localStorage)
- Toggle switches

## 🎨 Sistema de Diseño

### Colores

```javascript
// Primary (Azul)
primary: {
  50: '#f0f9ff',
  600: '#0ea5e9',  // Principal
  700: '#0369a1',
}

// Estados
green: success/conectado
red: error/desconectado
yellow: warning
gray: neutral/desconocido
```

### Espaciado

Basado en múltiplos de 4px:
- `gap-3` = 12px
- `gap-4` = 16px
- `gap-6` = 24px
- `p-4` = padding 16px
- `p-6` = padding 24px

### Tipografía

```css
.card-header: text-lg font-semibold (18px/600)
.text-sm: 14px
.text-xs: 12px
```

### Componentes Utilitarios

```css
.card: bg-white rounded-lg shadow-sm border p-6
.btn-primary: bg-primary-600 text-white rounded-lg
.btn-secondary: bg-gray-100 text-gray-700 rounded-lg
.input: border rounded-lg with focus ring
```

## 🔄 Flujo de Datos

### 1. Carga Inicial
```javascript
useEffect(() => {
  loadData()  // Primera carga
  const interval = setInterval(loadData, 60000) // Auto-refresh
  return () => clearInterval(interval)
}, [])
```

### 2. Fetch de Datos
```javascript
const loadData = async () => {
  setLoading(true)
  const [dashboardData, statusData] = await Promise.all([
    fetchDashboardData(),      // Stats, chart, table
    fetchRemoteIoTStatus()     // Conectividad
  ])
  setData(dashboardData)
  setAlerts(dashboardData.alerts)
  setRemoteStatus(statusData)
  setLoading(false)
}
```

### 3. Manejo de Errores
Si el backend no responde:
- Frontend usa datos mock
- Console warning (no error fatal)
- UX no se rompe

## 🧪 Testing

### Modo Desarrollo
```bash
npm run dev
```
- Hot reload habilitado
- Datos mock si backend no disponible
- Source maps habilitados

### Build Producción
```bash
npm run build
npm run preview
```

## 🔐 Seguridad

### Variables de Entorno
- NUNCA commitear `.env`
- Usar `.env.example` como plantilla
- Backend valida tokens antes de usar APIs

### CORS
- Flask-CORS permite requests desde localhost:3000
- En producción, configurar origins específicos

## 📈 Performance

### Optimizaciones Implementadas
- Lazy loading de componentes (futuro)
- Memoization de cálculos pesados (futuro)
- Debounce en búsqueda de tabla
- Cache de datos en backend
- Recursos estáticos minificados en build

### Métricas Target
- First Contentful Paint: < 1.5s
- Time to Interactive: < 3s
- Lighthouse Score: > 90

## 🚀 Deploy

### Frontend (Estático)
```bash
npm run build
# Upload dist/ to hosting (Vercel, Netlify, etc)
```

### Backend (Flask)
Opciones:
1. Heroku / Railway
2. Docker container
3. VPS tradicional con systemd

Ejemplo Dockerfile:
```dockerfile
FROM python:3.9-slim
WORKDIR /app
COPY backend/requirements.txt .
RUN pip install -r requirements.txt
COPY backend/ .
CMD ["python", "api.py"]
```

## 🐛 Debugging

### React DevTools
```bash
npm install -g react-devtools
```

### Network Tab
- Verificar requests a `/api/*`
- Status 200 = OK
- Status 500 = Error backend
- Status 0 = CORS/Network error

### Console Logs
- Frontend: warnings sobre datos mock
- Backend: requests entrantes y errores

## 📚 Recursos

- [Tailwind Docs](https://tailwindcss.com/docs)
- [React Docs](https://react.dev)
- [Recharts Examples](https://recharts.org/en-US/examples)
- [Flask Quickstart](https://flask.palletsprojects.com)

## 💡 Futuras Mejoras

- [ ] Dark mode
- [ ] Filtros avanzados en tabla
- [ ] Paginación
- [ ] WebSocket para updates en tiempo real
- [ ] Notificaciones push
- [ ] Internacionalización (i18n)
- [ ] Tests unitarios (Vitest)
- [ ] Tests E2E (Playwright)
- [ ] PWA support
- [ ] Autenticación de usuarios
