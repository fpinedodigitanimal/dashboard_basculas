# Sistema de Monitorización de Básculas - Guía de Implementación

## 🎯 Cambios Implementados

### Resumen
Se ha rediseñado completamente el sistema de activación de alertas/monitorización, separando el **estado de UI** (selección de filas) del **estado de dominio** (monitorización persistente).

### Arquitectura Anterior ❌
```
Checkbox (UI + Domain) → localStorage → Polling (5s) → Desincronización
```

### Arquitectura Nueva ✅
```
Toggle (UI) → Zustand Store (Domain) → API REST → SQLite → SSE → Sincronización Real-Time
```

---

## 📦 Archivos Creados

### Backend
- **`backend/monitoring_service.py`** - Servicio de monitorización con SQLite
- **`backend/monitoring.db`** - Base de datos SQLite (creada automáticamente)

### Frontend
- **`src/stores/monitoringStore.js`** - Store Zustand para estado de monitorización
- **`src/components/MonitoringToggle.jsx`** - Componente toggle para activar/desactivar monitorización
- **`src/hooks/useMonitoringSync.js`** - Hook para inicializar sincronización SSE

### Documentación
- **`MONITORING_ARCHITECTURE.md`** - Documentación completa de arquitectura
- **`IMPLEMENTATION_GUIDE.md`** - Este archivo

---

## 🚀 Guía de uso

### 1. Instalar Dependencias

```bash
cd react-dashboard
npm install
```

**Nueva dependencia:** `zustand@^4.4.0` (ya agregada a package.json)

### 2. Iniciar Backend

```bash
cd react-dashboard/backend
python api.py
```

El backend:
- ✅ Creará automáticamente `monitoring.db` si no existe
- ✅ Migrará datos de `selected_scales.json` si existe
- ✅ Servirá API REST en `http://localhost:8050`
- ✅ Servirá SSE en `/api/scales/monitoring/events`

### 3. Iniciar Frontend

```bash
cd react-dashboard
npm run dev
```

El frontend:
- ✅ Se conectará automáticamente al backend
- ✅ Cargará estado inicial de monitorización
- ✅ Establecerá conexión SSE para updates en tiempo real

---

## 🔧 Cómo Funciona

### Para el Usuario

1. **Activar Monitorización**:
   - En la tabla "Monitorización de Básculas", usar el toggle en la columna "Monitor"
   - Verde = Monitorización activa
   - Gris = Monitorización inactiva

2. **Alertas**:
   - Solo se muestran alertas de básculas con monitorización activa
   - Las alertas se actualizan automáticamente cuando se activa/desactiva monitorización

3. **Sincronización Multi-Cliente**:
   - Si Usuario A activa monitorización de báscula 37
   - Usuario B verá el cambio en <100ms (vía SSE)
   - Todos los clientes siempre están sincronizados

### Para el Desarrollador

#### Usar el Store de Monitorización

```javascript
import useMonitoringStore from '../stores/monitoringStore'

function MyComponent() {
  // Obtener estado de una báscula
  const monitoring = useMonitoringStore(state => state.getMonitoring('37'))
  
  // Obtener todas las básculas monitorizadas
  const enabledScales = useMonitoringStore(state => state.getEnabledScales())
  
  // Verificar si está en loading
  const isLoading = useMonitoringStore(state => state.isLoading('37'))
  
  // Ver errores
  const error = useMonitoringStore(state => state.getError('37'))
}
```

#### Usar el Componente MonitoringToggle

```jsx
import MonitoringToggle from './components/MonitoringToggle'

function MyTable() {
  return (
    <table>
      <tr>
        <td>Báscula 37</td>
        <td>
          <MonitoringToggle scaleId="37" size="default" />
        </td>
      </tr>
    </table>
  )
}
```

**Props:**
- `scaleId` (required): ID de la báscula
- `size` (optional): `'small'` | `'default'` | `'large'` (default: `'default'`)

#### Filtrar Alertas por Monitorización

```javascript
import useMonitoringStore from '../stores/monitoringStore'

function AlertsComponent() {
  const getEnabledScales = useMonitoringStore(state => state.getEnabledScales)
  const [allAlerts, setAllAlerts] = useState([])
  
  const visibleAlerts = allAlerts.filter(alert => {
    const enabledScales = getEnabledScales()
    return enabledScales.includes(alert.scale_id)
  })
  
  return <AlertsList alerts={visibleAlerts} />
}
```

---

## 🔌 API Endpoints

### GET `/api/scales/monitoring`
Obtiene estado de todas las básculas

**Response:**
```json
{
  "monitoring": [
    {
      "scale_id": "37",
      "enabled": true,
      "updated_at": "2026-03-02T10:30:00Z",
      "updated_by": "user_1",
      "version": 5
    }
  ]
}
```

### PUT `/api/scales/{scale_id}/monitoring`
Actualiza estado de monitorización (IDEMPOTENTE)

**Request:**
```json
{
  "enabled": true,
  "updated_by": "user_1",
  "version": 4  // opcional
}
```

**Response 200:**
```json
{
  "scale_id": "37",
  "enabled": true,
  "updated_at": "2026-03-02T10:30:00Z",
  "updated_by": "user_1",
  "version": 5,
  "changed": true
}
```

**Response 409 (Conflicto de versión):**
```json
{
  "error": "version_conflict",
  "message": "Version mismatch",
  "current_state": { ... }
}
```

### GET `/api/scales/monitoring/events`
SSE endpoint para sincronización en tiempo real

**Eventos:**
- `scale.monitoring.updated` - Estado de báscula actualizado
- `heartbeat` - Mantener conexión viva (cada 30s)

---

## 🧪 Testing

### Test Manual - Sincronización Multi-Cliente

1. Abrir 2 navegadores/pestañas en `http://localhost:3000`
2. En Cliente A: Activar monitorización de báscula 37
3. En Cliente B: Verificar que el toggle se activa automáticamente
4. En Cliente B: Desactivar monitorización
5. En Cliente A: Verificar que el toggle se desactiva automáticamente

**Resultado esperado:** <100ms de latencia entre cambios

### Test Manual - Optimistic UI

1. Throttle network a 3G en DevTools
2. Click en toggle para activar
3. **Debe cambiar inmediatamente a verde** (optimistic)
4. Esperar respuesta del servidor
5. Debe permanecer verde (confirmado)

### Test Manual - Error Handling

1. Detener backend
2. Intentar cambiar estado
3. **Debe mostrar error** y **rollback** al estado anterior
4. Reiniciar backend
5. SSE debe reconectar automáticamente

### Test de Concurrencia

```python
# backend/test_monitoring.py
import pytest
from monitoring_service import MonitoringService, VersionConflictError

def test_optimistic_locking():
    service = MonitoringService(':memory:')
    
    # Usuario A lee versión 1
    service.update('37', True, 'user_a')  # version → 2
    
    # Usuario B intenta actualizar con versión 1 (vieja)
    with pytest.raises(VersionConflictError):
        service.update('37', False, 'user_b', version=1)
```

---

## 🐛 Troubleshooting

### Backend no inicia

**Error:** `ModuleNotFoundError: No module named 'monitoring_service'`

**Solución:**
```bash
cd react-dashboard/backend
python -c "import sys; print(sys.path)"
# Verificar que el directorio actual está en sys.path
```

### SSE no conecta

**Error:** Console muestra `EventSource failed`

**Verificar:**
1. Backend corriendo en `http://localhost:8050`
2. CORS configurado correctamente
3. Navegador soporta SSE (todos los modernos lo hacen)

**Debug:**
```javascript
// Ver en console:
const eventSource = new EventSource('/api/scales/monitoring/events')
eventSource.onerror = (e) => console.error('SSE Error:', e)
eventSource.onopen = () => console.log('SSE Connected')
```

### Toggle no responde

**Verificar:**
1. Store inicializado: `useMonitoringSync()` llamado en App.jsx
2. Backend respondiendo: `curl http://localhost:8050/api/scales/monitoring`
3. Console errors

**Debug:**
```javascript
// En MonitoringToggle.jsx, agregar:
console.log('Monitoring state:', monitoring)
console.log('Is loading:', isLoading)
console.log('Error:', error)
```

### Datos no sincronizados entre clientes

**Verificar:**
1. SSE conectado en todos los clientes
2. Backend emitiendo eventos correctamente

**Debug backend:**
```python
# En monitoring_service.py, agregar logs:
def update(self, ...):
    ...
    print(f"[DEBUG] Emitting event for {scale_id}")
    self.event_manager.emit('scale.monitoring.updated', result)
```

---

## 🔄 Migración desde Sistema Anterior

### Migración Automática

Al iniciar el backend, automáticamente:
1. Lee `selected_scales.json` si existe
2. Crea registros en `monitoring.db`
3. Renombra archivo a `selected_scales.json.backup`

### Migración Manual

```python
from monitoring_service import get_monitoring_service

service = get_monitoring_service()
service.migrate_from_json('path/to/selected_scales.json', updated_by='manual_migration')
```

### Rollback (si es necesario)

```bash
# Detener backend
cd react-dashboard/backend

# Eliminar base de datos nueva
rm monitoring.db

# Restaurar archivo antiguo
mv selected_scales.json.backup selected_scales.json

# Volver a código anterior
git checkout <commit-anterior>
```

---

## 📊 Comparación de Rendimiento

| Métrica | Sistema Anterior | Sistema Nuevo |
|---------|------------------|---------------|
| Latencia sincronización | 0-5000ms (polling) | <100ms (SSE) |
| Requests/minuto/cliente | 12 (polling) | 1 (SSE keepalive) |
| Conflictos detectados | ❌ No | ✅ Optimistic locking |
| Persistencia | ⚠️ JSON | ✅ SQLite ACID |
| Pérdida en refresh | ❌ Posible | ✅ Imposible |
| Multi-cliente | ⚠️ Eventual consistency | ✅ Real-time |

---

## 🎓 Recursos Adicionales

- **Documentación completa:** [MONITORING_ARCHITECTURE.md](./MONITORING_ARCHITECTURE.md)
- **Zustand docs:** https://docs.pmnd.rs/zustand/
- **SSE spec:** https://developer.mozilla.org/en-US/docs/Web/API/Server-sent_events
- **Optimistic UI:** https://www.apollographql.com/docs/react/performance/optimistic-ui/

---

## ✅ Checklist Post-Implementación

- [ ] Backend inicia sin errores
- [ ] Frontend inicia sin errores
- [ ] `npm install` ejecutado
- [ ] `monitoring.db` creado
- [ ] SSE conectado (ver "Heartbeat received" en console)
- [ ] Toggles responden al click
- [ ] Sincronización entre 2 clientes funciona
- [ ] Alertas se filtran correctamente
- [ ] Optimistic UI funciona (cambio inmediato)
- [ ] Error handling funciona (desconectar backend y probar)

---

## 🍓 Deployment en Raspberry Pi

### Requisitos
- Raspberry Pi 3, 4 o 5
- Raspbian/Raspberry Pi OS (32-bit o 64-bit)
- Python 3.8+
- Node.js 16+ (para el build)
- 1GB RAM mínimo (2GB recomendado)

### Deployment Automático

El proyecto incluye un script de deployment automático:

```bash
cd react-dashboard
chmod +x deploy-raspberry.sh
./deploy-raspberry.sh
```

Este script:
1. ✅ Hace build del frontend con Vite
2. ✅ Copia el build a `backend/static` y `backend/templates`
3. ✅ Instala dependencias Python
4. ✅ Crea servicio systemd (opcional)
5. ✅ Genera script de inicio `start.sh`

### Inicio Manual (Sin systemd)

```bash
cd react-dashboard/backend
./start.sh
```

El dashboard estará disponible en:
- `http://localhost:8050` (local)
- `http://<raspberry-pi-ip>:8050` (red local)

### Inicio Automático (Con systemd)

Para que el dashboard se inicie automáticamente al boot:

```bash
# Copiar servicio
sudo cp /tmp/basculas-dashboard.service /etc/systemd/system/

# Recargar systemd
sudo systemctl daemon-reload

# Habilitar inicio automático
sudo systemctl enable basculas-dashboard

# Iniciar servicio
sudo systemctl start basculas-dashboard

# Ver logs
sudo journalctl -u basculas-dashboard -f
```

### Configuración de Red

Por defecto el servidor escucha en `0.0.0.0:8050` (todas las interfaces).

**Abrir puerto en firewall:**
```bash
sudo ufw allow 8050/tcp
sudo ufw status
```

**Encontrar IP de Raspberry Pi:**
```bash
hostname -I
```

### Modo Producción vs Desarrollo

**En Raspberry Pi (Producción):**
- Puerto: `8050`
- Backend: Flask sirve API + frontend estático
- Frontend: Build estático en `backend/static`
- Base de datos: `backend/monitoring.db`

**En PC de desarrollo:**
- Backend: `http://localhost:8050` (Flask API)
- Frontend: `http://localhost:3000` (Vite dev server con HMR)
- Proxy configurado en `vite.config.js` (`/api` → `8050`)

### Estructura de Archivos (Post-deployment)

```
react-dashboard/
├── backend/
│   ├── api.py                 # Servidor Flask
│   ├── monitoring_service.py  # Lógica de monitorización
│   ├── monitoring.db          # Base de datos SQLite
│   ├── requirements.txt       # Dependencias Python
│   ├── start.sh              # ✅ Script de inicio
│   ├── static/               # ✅ Build del frontend
│   │   └── assets/           # JS, CSS, imágenes
│   └── templates/            # ✅ index.html
│       └── index.html
```

### Troubleshooting Raspberry Pi

**Error: "No module named 'flask'"**
```bash
pip3 install -r backend/requirements.txt
```

**Error: "Address already in use"**
```bash
# Encontrar proceso en puerto 8050
sudo lsof -i :8050
# Matar proceso
sudo kill -9 <PID>
```

**Frontend muestra "Dashboard en modo desarrollo"**
- El build no se copió correctamente
- Re-ejecutar: `./deploy-raspberry.sh`

**SSE no conecta**
- Verificar firewall: `sudo ufw status`
- Verificar que backend inició: `sudo systemctl status basculas-dashboard`
- Ver logs: `sudo journalctl -u basculas-dashboard -f`

**Performance lento**
- Raspberry Pi 3 puede ser lento para builds grandes
- Considera hacer el build en tu PC y copiar solo `backend/` a la RPi

### Actualizar Dashboard

Para actualizar el código después de cambios:

```bash
# En tu PC de desarrollo
cd react-dashboard
git pull  # o tus cambios

# Build y deploy
./deploy-raspberry.sh

# Si ya está corriendo con systemd en RPi
sudo systemctl restart basculas-dashboard
```

---

**¿Preguntas?** Ver [MONITORING_ARCHITECTURE.md](./MONITORING_ARCHITECTURE.md) para detalle técnico completo.
