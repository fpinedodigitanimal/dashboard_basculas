# Dashboard Básculas - React + Tailwind

Dashboard minimalista y profesional para monitoreo en tiempo real de básculas ganaderas.

## 🎨 Características

- **Diseño Minimalista**: Interface limpia y moderna con Tailwind CSS
- **React 18**: Componentes funcionales con hooks
- **Responsive**: Adaptado para desktop, tablet y móvil
- **Tiempo Real**: Actualización automática de datos
- **Gráficos Interactivos**: Recharts para visualización de datos
- **Sistema de Alertas**: Notificaciones visuales de anomalías
- **Exportación**: Descarga de datos en CSV
- **Backend API**: Flask REST API para servir datos

## 📋 Requisitos

- Node.js 18+ y npm
- Python 3.8+ (para backend)

## 🚀 Instalación

### 1. Clonar e instalar dependencias del frontend

```bash
cd react-dashboard
npm install
```

### 2. Instalar dependencias del backend

```bash
cd backend
pip install -r requirements.txt
```

### 3. Configurar variables de entorno

Crear archivo `.env` en el directorio raíz del proyecto con:

```env
DIGITANIMAL_TOKEN=tu_token_aqui
REMOTEIOT_TOKEN=tu_token_remoteiot
PORT=8050
```

## 🏃 Ejecución

### Desarrollo

**Terminal 1 - Backend:**
```bash
cd backend
python api.py
```

**Terminal 2 - Frontend:**
```bash
cd react-dashboard
npm run dev
```

El frontend estará en: http://localhost:3000
El backend API en: http://localhost:8050

### Producción

**Build del frontend:**
```bash
npm run build
```

Los archivos estáticos se generarán en `dist/`

## 📁 Estructura del Proyecto

```
react-dashboard/
├── src/
│   ├── components/          # Componentes React
│   │   ├── Header.jsx       # Cabecera con navegación
│   │   ├── StatsCards.jsx   # Tarjetas de estadísticas
│   │   ├── ActivityChart.jsx # Gráfico de actividad
│   │   ├── AlertsPanel.jsx  # Panel de alertas
│   │   ├── DataTable.jsx    # Tabla de datos
│   │   └── SettingsPanel.jsx # Panel de configuración
│   ├── services/            # Servicios
│   │   └── api.js          # Cliente API
│   ├── App.jsx             # Componente principal
│   ├── main.jsx            # Punto de entrada
│   └── index.css           # Estilos globales
├── backend/                # Backend Flask
│   ├── api.py             # API REST
│   └── requirements.txt   # Dependencias Python
├── index.html
├── package.json
├── vite.config.js
├── tailwind.config.js
└── README.md
```

## 🎨 Componentes

### Header
Cabecera con logo, título y botón de configuración.

### StatsCards
Tarjetas con métricas principales:
- Básculas activas
- Conectividad
- Pesajes del día
- Alertas activas

### ActivityChart
Gráfico de líneas con histórico de pesajes y básculas activas.

### AlertsPanel
Panel de alertas con diferentes niveles de severidad (info, warning, critical).

### DataTable
Tabla con búsqueda y exportación de datos por báscula.

### SettingsPanel
Modal de configuración para personalizar el dashboard.

## 🔧 Configuración

El dashboard usa configuración local almacenada en `localStorage`:

```javascript
{
  refreshInterval: 60,      // Segundos entre actualizaciones
  showAlerts: true,         // Mostrar/ocultar alertas
  autoExport: false,        // Exportación automática
  theme: 'light'           // Tema (futuro)
}
```

## 🌐 API Endpoints

### GET /api/dashboard
Datos principales del dashboard.

**Respuesta:**
```json
{
  "activeScales": 8,
  "totalScales": 12,
  "todayWeights": 145,
  "weightChange": 12,
  "activeAlerts": 2,
  "alerts": [...],
  "chartData": [...],
  "tableData": [...]
}
```

### GET /api/remoteiot/status
Estado de conectividad de básculas.

**Respuesta:**
```json
{
  "B-001": "conectado",
  "B-002": "desconectado",
  ...
}
```

### GET /api/health
Health check del servidor.

## 🎯 Características del Diseño

- **Paleta de colores**: Azules profesionales con acentos verdes y rojos
- **Tipografía**: System fonts para mejor rendimiento
- **Espaciado**: Sistema consistente basado en múltiplos de 4px
- **Sombras**: Sutiles para dar profundidad sin ser intrusivas
- **Animaciones**: Transiciones suaves para mejorar UX
- **Iconos**: Lucide React (minimal y consistente)

## 📱 Responsive Design

- **Mobile**: < 640px - Layout de 1 columna
- **Tablet**: 640px - 1024px - Layout de 2 columnas
- **Desktop**: > 1024px - Layout de 4 columnas

## 🔄 Modo Desarrollo vs Producción

En **desarrollo**, si el backend no está disponible, la app usa datos mock para facilitar el desarrollo del frontend independientemente.

En **producción**, asegúrate de que el backend esté corriendo y configurado correctamente.

## 🐛 Troubleshooting

### El frontend no carga datos
- Verifica que el backend esté corriendo en puerto 8050
- Revisa la consola del navegador para errores
- Confirma que las variables de entorno estén configuradas

### Error de CORS
- Verifica que `flask-cors` esté instalado
- El backend debe estar en http://localhost:8050

### Errores de build
```bash
rm -rf node_modules package-lock.json
npm install
```

## 📄 Licencia

Proyecto interno Digitanimal.

## 👥 Autor

Desarrollado con ❤️ para Digitanimal
