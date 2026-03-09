# Arquitectura de Monitorización de Básculas

## 📋 Tabla de Contenidos
1. [Visión General](#visión-general)
2. [Modelo de Datos](#modelo-de-datos)
3. [API REST](#api-rest)
4. [Sincronización en Tiempo Real](#sincronización-en-tiempo-real)
5. [Arquitectura Frontend](#arquitectura-frontend)
6. [Flujos de Datos](#flujos-de-datos)
7. [Manejo de Concurrencia](#manejo-de-concurrencia)
8. [Justificación Técnica](#justificación-técnica)

---

## Visión General

### Problema
El sistema anterior confundía **estado de UI** (selección de fila) con **estado de dominio** (monitorización activa), causando:
- ❌ Desincronización entre clientes
- ❌ Pérdida de estado en refresh
- ❌ Conflictos en actualizaciones simultáneas
- ❌ No persistencia robusta

### Solución
Arquitectura robusta con **separación de concerns**, **persistencia garantizada** y **sincronización en tiempo real**.

```
┌─────────────────────────────────────────────────────────┐
│                    ARQUITECTURA                          │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  Frontend (React)              Backend (Flask)          │
│  ├─ MonitoringStore            ├─ MonitoringService     │
│  │  └─ Domain State            │  └─ SQLite DB          │
│  ├─ MonitoringToggle           ├─ REST API (Idempotent) │
│  │  └─ UI State                │  └─ PUT /monitoring    │
│  └─ DataTable                  └─ SSE Events            │
│     └─ Row Selection               └─ scale.updated     │
│                                                          │
│         ◄──── HTTP PUT ────►                            │
│         ◄──── SSE ──────────                            │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

---

## Modelo de Datos

### Base de Datos: SQLite (`monitoring.db`)

```sql
CREATE TABLE scale_monitoring (
    scale_id TEXT PRIMARY KEY,
    enabled INTEGER NOT NULL DEFAULT 0,  -- SQLite usa 0/1 para bool
    updated_at TEXT NOT NULL,            -- ISO 8601 timestamp
    updated_by TEXT NOT NULL,            -- user_id o 'system'
    version INTEGER NOT NULL DEFAULT 1   -- Optimistic locking
);

CREATE INDEX idx_monitoring_enabled ON scale_monitoring(enabled);
CREATE INDEX idx_monitoring_updated ON scale_monitoring(updated_at);
```

### Modelo de Dominio

```python
@dataclass
class ScaleMonitoring:
    scale_id: str
    enabled: bool
    updated_at: datetime
    updated_by: str
    version: int = 1
    
    def to_dict(self) -> dict:
        return {
            'scale_id': self.scale_id,
            'enabled': self.enabled,
            'updated_at': self.updated_at.isoformat(),
            'updated_by': self.updated_by,
            'version': self.version
        }
```

### Características
- ✅ **Primary Key**: `scale_id` único
- ✅ **Optimistic Locking**: `version` para detectar conflictos
- ✅ **Auditoría**: `updated_at` y `updated_by`
- ✅ **Índices**: Consultas eficientes por estado y fecha

---

## API REST

### Principios
1. **Idempotencia**: PUT con estado explícito (no toggle)
2. **Atomicidad**: Cada operación es atómica
3. **Versionado**: Control de concurrencia optimista
4. **Respuestas Completas**: Siempre devolver estado actual

### Endpoints

#### 1. Obtener Estado de Monitorización
```http
GET /api/scales/monitoring
```

**Response 200:**
```json
{
  "monitoring": [
    {
      "scale_id": "37",
      "enabled": true,
      "updated_at": "2026-03-02T10:30:00Z",
      "updated_by": "user_1",
      "version": 5
    },
    {
      "scale_id": "38",
      "enabled": false,
      "updated_at": "2026-03-02T09:15:00Z",
      "updated_by": "system",
      "version": 2
    }
  ]
}
```

#### 2. Actualizar Estado Individual (IDEMPOTENTE)
```http
PUT /api/scales/{scale_id}/monitoring
Content-Type: application/json

{
  "enabled": true,
  "updated_by": "user_1",
  "version": 4  // Opcional: para optimistic locking
}
```

**Response 200 (Éxito):**
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
  "message": "Version mismatch. Expected 4, current is 6",
  "current_state": {
    "scale_id": "37",
    "enabled": true,
    "version": 6,
    "updated_at": "2026-03-02T10:29:00Z",
    "updated_by": "user_2"
  }
}
```

**Response 400 (Bad Request):**
```json
{
  "error": "invalid_request",
  "message": "Field 'enabled' is required and must be boolean"
}
```

#### 3. Actualización Masiva
```http
PUT /api/scales/monitoring/bulk
Content-Type: application/json

{
  "scales": [
    {"scale_id": "37", "enabled": true},
    {"scale_id": "38", "enabled": true},
    {"scale_id": "39", "enabled": false}
  ],
  "updated_by": "user_1"
}
```

**Response 200:**
```json
{
  "updated": 3,
  "results": [
    {"scale_id": "37", "enabled": true, "version": 6, "changed": true},
    {"scale_id": "38", "enabled": true, "version": 3, "changed": false},
    {"scale_id": "39", "enabled": false, "version": 2, "changed": true}
  ]
}
```

---

## Sincronización en Tiempo Real

### SSE (Server-Sent Events)

**¿Por qué SSE en lugar de WebSocket?**
- ✅ Unidireccional (suficiente para nuestro caso)
- ✅ Reconexión automática
- ✅ Más simple de implementar
- ✅ Compatible con HTTP/2
- ✅ Menos overhead que WebSocket

### Endpoint SSE
```http
GET /api/scales/monitoring/events
Accept: text/event-stream
```

### Formato de Eventos
```
event: scale.monitoring.updated
data: {"scale_id":"37","enabled":true,"updated_at":"2026-03-02T10:30:00Z","updated_by":"user_1","version":5}

event: scale.monitoring.updated
data: {"scale_id":"38","enabled":false,"updated_at":"2026-03-02T10:31:00Z","updated_by":"user_2","version":3}

event: heartbeat
data: {"timestamp":"2026-03-02T10:32:00Z"}
```

### Tipos de Eventos
1. **`scale.monitoring.updated`**: Cambio de estado
2. **`heartbeat`**: Keep-alive cada 30s
3. **`sync.required`**: Backend pide resincronización completa

### Implementación Backend (Flask)
```python
from flask import Response, stream_with_context
import time
import queue

# Cola de eventos global
event_queue = queue.Queue()

@app.route('/api/scales/monitoring/events')
def monitoring_events():
    def generate():
        # Enviar estado inicial
        monitoring = get_all_monitoring()
        for m in monitoring:
            yield f"event: scale.monitoring.updated\n"
            yield f"data: {json.dumps(m.to_dict())}\n\n"
        
        # Stream de eventos
        while True:
            try:
                # Esperar evento con timeout para heartbeat
                event = event_queue.get(timeout=30)
                yield f"event: {event['type']}\n"
                yield f"data: {json.dumps(event['data'])}\n\n"
            except queue.Empty:
                # Heartbeat cada 30s
                yield f"event: heartbeat\n"
                yield f"data: {json.dumps({'timestamp': datetime.now().isoformat()})}\n\n"
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no'
        }
    )
```

---

## Arquitectura Frontend

### 1. Store de Monitorización (Zustand)

```javascript
// src/stores/monitoringStore.js
import create from 'zustand'

const useMonitoringStore = create((set, get) => ({
  // Domain State
  monitoring: new Map(), // Map<scale_id, MonitoringState>
  
  // UI State
  loading: new Set(),    // Set<scale_id> - scales being updated
  errors: new Map(),     // Map<scale_id, error_message>
  
  // SSE Connection
  eventSource: null,
  connected: false,
  
  // Actions
  setMonitoring: (scaleId, state) => 
    set(state => ({
      monitoring: new Map(state.monitoring).set(scaleId, state)
    })),
  
  setLoading: (scaleId, isLoading) =>
    set(state => ({
      loading: isLoading 
        ? new Set(state.loading).add(scaleId)
        : new Set([...state.loading].filter(id => id !== scaleId))
    })),
  
  setError: (scaleId, error) =>
    set(state => ({
      errors: new Map(state.errors).set(scaleId, error)
    })),
  
  clearError: (scaleId) =>
    set(state => {
      const errors = new Map(state.errors)
      errors.delete(scaleId)
      return { errors }
    }),
  
  // SSE Methods
  connectSSE: () => {
    const eventSource = new EventSource('/api/scales/monitoring/events')
    
    eventSource.addEventListener('scale.monitoring.updated', (e) => {
      const data = JSON.parse(e.data)
      get().setMonitoring(data.scale_id, data)
    })
    
    eventSource.addEventListener('heartbeat', () => {
      console.log('[SSE] Heartbeat received')
    })
    
    eventSource.onopen = () => set({ connected: true })
    eventSource.onerror = () => set({ connected: false })
    
    set({ eventSource })
  },
  
  disconnectSSE: () => {
    const { eventSource } = get()
    if (eventSource) {
      eventSource.close()
      set({ eventSource: null, connected: false })
    }
  }
}))

export default useMonitoringStore
```

### 2. Componente MonitoringToggle

```jsx
// src/components/MonitoringToggle.jsx
import { useState, useEffect } from 'react'
import { Power } from 'lucide-react'
import useMonitoringStore from '../stores/monitoringStore'
import { updateScaleMonitoring } from '../services/api'

export default function MonitoringToggle({ scaleId }) {
  const monitoring = useMonitoringStore(state => state.monitoring.get(scaleId))
  const isLoading = useMonitoringStore(state => state.loading.has(scaleId))
  const error = useMonitoringStore(state => state.errors.get(scaleId))
  
  const setLoading = useMonitoringStore(state => state.setLoading)
  const setError = useMonitoringStore(state => state.setError)
  const clearError = useMonitoringStore(state => state.clearError)
  
  const [optimisticState, setOptimisticState] = useState(null)
  
  const enabled = optimisticState ?? monitoring?.enabled ?? false
  
  const handleToggle = async () => {
    const newState = !enabled
    
    // Optimistic UI
    setOptimisticState(newState)
    setLoading(scaleId, true)
    clearError(scaleId)
    
    try {
      // Llamada idempotente
      const result = await updateScaleMonitoring(scaleId, {
        enabled: newState,
        updated_by: 'current_user', // TODO: usar auth real
        version: monitoring?.version
      })
      
      // Éxito: el SSE actualizará el estado real
      // Limpiar estado optimista
      setOptimisticState(null)
      
    } catch (err) {
      // Error: rollback
      setOptimisticState(null)
      
      if (err.response?.status === 409) {
        // Conflicto de versión: mostrar error específico
        setError(scaleId, 'Actualizado por otro usuario. Recargando...')
        // El SSE traerá el estado correcto
      } else {
        setError(scaleId, 'Error al actualizar. Intente nuevamente.')
      }
    } finally {
      setLoading(scaleId, false)
    }
  }
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handleToggle}
        disabled={isLoading}
        className={`
          relative inline-flex h-6 w-11 items-center rounded-full
          transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2
          ${enabled ? 'bg-green-600' : 'bg-gray-300'}
          ${isLoading ? 'opacity-50 cursor-wait' : 'cursor-pointer'}
          ${error ? 'ring-2 ring-red-500' : ''}
        `}
        aria-label={`Monitorización ${enabled ? 'activa' : 'inactiva'}`}
      >
        <span
          className={`
            inline-block h-4 w-4 transform rounded-full bg-white
            transition-transform
            ${enabled ? 'translate-x-6' : 'translate-x-1'}
          `}
        />
        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
          </div>
        )}
      </button>
      
      {error && (
        <span className="text-xs text-red-600" title={error}>
          ⚠️
        </span>
      )}
    </div>
  )
}
```

### 3. Hook de Inicialización

```jsx
// src/hooks/useMonitoringSync.js
import { useEffect } from 'react'
import useMonitoringStore from '../stores/monitoringStore'
import { getScalesMonitoring } from '../services/api'

export default function useMonitoringSync() {
  const connectSSE = useMonitoringStore(state => state.connectSSE)
  const disconnectSSE = useMonitoringStore(state => state.disconnectSSE)
  const setMonitoring = useMonitoringStore(state => state.setMonitoring)
  
  useEffect(() => {
    // 1. Cargar estado inicial
    const loadInitialState = async () => {
      try {
        const { monitoring } = await getScalesMonitoring()
        monitoring.forEach(m => {
          setMonitoring(m.scale_id, m)
        })
      } catch (error) {
        console.error('Error loading monitoring state:', error)
      }
    }
    
    loadInitialState()
    
    // 2. Conectar SSE
    connectSSE()
    
    // 3. Cleanup
    return () => {
      disconnectSSE()
    }
  }, [])
}
```

---

## Flujos de Datos

### Flujo 1: Usuario Activa Monitorización

```
┌──────────┐                                              ┌─────────┐
│  User    │                                              │ Backend │
└────┬─────┘                                              └────┬────┘
     │                                                          │
     │ 1. Click Toggle                                         │
     ├─────────┐                                               │
     │         │ 2. Optimistic UI                              │
     │◄────────┘    (enabled = true)                           │
     │                                                          │
     │ 3. PUT /scales/37/monitoring                            │
     │         {enabled: true, version: 4}                     │
     ├─────────────────────────────────────────────────────────►
     │                                                          │
     │                              4. Validate & Save         │
     │                              5. Increment version → 5   │
     │                                                          │
     │                          200 OK                          │
     │                          {enabled: true, version: 5}    │
     │◄─────────────────────────────────────────────────────────
     │                                                          │
     │ 6. Clear optimistic state                               │
     │                                                          │
     │                              7. Emit SSE Event          │
     │                                 to all clients          │
     │                                                          │
     │ SSE: scale.monitoring.updated                           │
     │      {scale_id: "37", enabled: true, version: 5}        │
     │◄─────────────────────────────────────────────────────────
     │                                                          │
     │ 8. Update store (idempotent)                            │
     │                                                          │
```

### Flujo 2: Conflicto de Versión

```
Client A                  Backend                  Client B
   │                         │                         │
   │ PUT version: 4          │                         │
   ├────────────────────────►│                         │
   │                         │◄────────────────────────┤
   │                         │        PUT version: 4   │
   │                         │                         │
   │                         │ First write wins        │
   │                         │ version → 5             │
   │                         │                         │
   │      200 OK v5          │                         │
   │◄────────────────────────┤                         │
   │                         │                         │
   │                         │     409 Conflict        │
   │                         ├────────────────────────►│
   │                         │   current_state: v5     │
   │                         │                         │
   │                         │                         │
   │ SSE: updated v5         │      SSE: updated v5    │
   │◄────────────────────────┼────────────────────────►│
   │                         │                         │
   │                         │                         │
   │ ✓ State synced          │    ✓ Error handled     │
   │                         │      ✓ State synced     │
```

### Flujo 3: Nuevo Cliente se Conecta

```
┌──────────┐                                          ┌─────────┐
│New Client│                                          │ Backend │
└────┬─────┘                                          └────┬────┘
     │                                                      │
     │ 1. Initial load: GET /scales/monitoring             │
     ├─────────────────────────────────────────────────────►
     │                                                      │
     │                    200 OK                            │
     │                    {monitoring: [...]}               │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │ 2. Populate store                                   │
     │                                                      │
     │ 3. Connect SSE: GET /events                         │
     ├─────────────────────────────────────────────────────►
     │                                                      │
     │                    Initial sync                      │
     │       event: scale.monitoring.updated (x N)         │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
     │ 4. Store updated with latest state                  │
     │                                                      │
     │                    Heartbeat every 30s               │
     │       event: heartbeat                               │
     │◄─────────────────────────────────────────────────────┤
     │                                                      │
```

---

## Manejo de Concurrencia

### Estrategia: Optimistic Locking

**Ventajas:**
- ✅ No bloquea recursos
- ✅ Alto rendimiento
- ✅ Fácil de implementar
- ✅ Perfecto para bajo contention

**Implementación:**
```python
def update_monitoring(scale_id: str, enabled: bool, version: Optional[int], updated_by: str):
    conn = get_db_connection()
    cursor = conn.cursor()
    
    # Leer estado actual
    cursor.execute(
        "SELECT * FROM scale_monitoring WHERE scale_id = ?",
        (scale_id,)
    )
    current = cursor.fetchone()
    
    if current:
        # Verificar versión si se provee
        if version is not None and current['version'] != version:
            raise VersionConflictError(
                expected=version,
                current=current['version'],
                current_state=dict(current)
            )
        
        # Actualizar
        new_version = current['version'] + 1
        cursor.execute("""
            UPDATE scale_monitoring 
            SET enabled = ?, updated_at = ?, updated_by = ?, version = ?
            WHERE scale_id = ?
        """, (enabled, datetime.now().isoformat(), updated_by, new_version, scale_id))
        
    else:
        # Crear nuevo
        new_version = 1
        cursor.execute("""
            INSERT INTO scale_monitoring (scale_id, enabled, updated_at, updated_by, version)
            VALUES (?, ?, ?, ?, ?)
        """, (scale_id, enabled, datetime.now().isoformat(), updated_by, new_version))
    
    conn.commit()
    
    # Emitir evento SSE
    emit_event('scale.monitoring.updated', {
        'scale_id': scale_id,
        'enabled': enabled,
        'updated_at': datetime.now().isoformat(),
        'updated_by': updated_by,
        'version': new_version
    })
    
    return {
        'scale_id': scale_id,
        'enabled': enabled,
        'version': new_version,
        'changed': True
    }
```

### Casos Edge

#### 1. Write-After-Write
```
T1: Read version 4
T2: Read version 4
T1: Write version 5 ✓
T2: Write version 5 ✗ → 409 Conflict
```

#### 2. SSE Desconectado
- Frontend detecta desconexión
- Restablece conexión automáticamente (built-in SSE)
- Recibe estado completo al reconectar
- Store se actualiza con estado autoritativo

#### 3. Network Timeout
```javascript
try {
  await updateScaleMonitoring(scaleId, { enabled: true })
} catch (error) {
  if (error.code === 'TIMEOUT') {
    // No sabemos si se aplicó o no
    // Opción 1: Retry con idempotencia
    // Opción 2: Esperar SSE update
    // Opción 3: Fetch estado actual
    const current = await getScaleMonitoring(scaleId)
    setMonitoring(scaleId, current)
  }
}
```

---

## Justificación Técnica

### Decisiones de Diseño

#### 1. ¿Por qué SQLite en lugar de JSON?
| Aspecto | JSON | SQLite |
|---------|------|--------|
| Concurrencia | ❌ File locks | ✅ ACID transactions |
| Queries | ❌ Full scan | ✅ Indexed |
| Integridad | ❌ Manual | ✅ Constraints |
| Performance | ❌ O(n) | ✅ O(log n) |
| Backup | ❌ Lockeo | ✅ WAL mode |

**Decisión:** SQLite para producción, JSON solo para prototipo.

#### 2. ¿Por qué SSE en lugar de Polling?
| Aspecto | Polling | SSE |
|---------|---------|-----|
| Latencia | ❌ Hasta interval | ✅ <100ms |
| Bandwidth | ❌ Request overhead | ✅ Solo datos |
| Server Load | ❌ Muchos requests | ✅ 1 conexión |
| Scalability | ❌ O(n*requests) | ✅ O(n) |
| Complexity | ✅ Simple | ⚠️ Medio |

**Decisión:** SSE para mejor UX y menor carga.

#### 3. ¿Por qué Zustand en lugar de Context?
| Aspecto | Context | Zustand |
|---------|---------|---------|
| Performance | ❌ Re-render todo | ✅ Selectores |
| DevTools | ❌ No | ✅ Sí |
| Middleware | ❌ Manual | ✅ Built-in |
| Boilerplate | ⚠️ Medio | ✅ Mínimo |

**Decisión:** Zustand por performance y DX.

#### 4. ¿Por qué Optimistic Locking?
| Aspecto | Pessimistic | Optimistic |
|---------|-------------|------------|
| Locks | ❌ Sí | ✅ No |
| Deadlocks | ❌ Posibles | ✅ Imposibles |
| Performance | ❌ Bloqueante | ✅ No bloqueante |
| Complejidad | ⚠️ Alta | ✅ Baja |
| UX | ❌ Esperas | ✅ Inmediato |

**Decisión:** Optimistic para mejor UX y menos complejidad.

### Escalabilidad

#### Horizontal Scaling
Para escalar a múltiples instancias backend:

1. **Shared Database**: Usar PostgreSQL en lugar de SQLite
2. **Redis Pub/Sub**: Para coordinar eventos SSE entre instancias
3. **Load Balancer**: Sticky sessions para SSE

```
Client 1 ──► [LB] ──► Instance A ──┐
                                    ├──► PostgreSQL
Client 2 ──► [LB] ──► Instance B ──┤
                                    └──► Redis Pub/Sub
Client 3 ──► [LB] ──► Instance A ──┘
```

#### Límites

| Métrica | SQLite | PostgreSQL |
|---------|--------|------------|
| Concurrent Writers | ~10 | ~1000+ |
| SSE Connections/Instance | ~1000 | ~10000 |
| Scales Monitored | ~10000 | ~1M+ |

---

## Testing

### Backend Tests
```python
def test_idempotent_update():
    # Llamar 2 veces con mismo estado
    result1 = update_monitoring('37', enabled=True)
    result2 = update_monitoring('37', enabled=True)
    
    # Segunda llamada no cambia version
    assert result2['changed'] == False
    assert result2['version'] == result1['version']

def test_version_conflict():
    # T1 y T2 leen version 4
    update_monitoring('37', enabled=True, version=4)  # ✓
    
    with pytest.raises(VersionConflictError):
        update_monitoring('37', enabled=False, version=4)  # ✗

def test_sse_emission():
    events = []
    
    def capture_event(type, data):
        events.append((type, data))
    
    with mock.patch('emit_event', side_effect=capture_event):
        update_monitoring('37', enabled=True)
    
    assert len(events) == 1
    assert events[0][0] == 'scale.monitoring.updated'
```

### Frontend Tests
```javascript
describe('MonitoringToggle', () => {
  it('optimistic UI', async () => {
    const { getByRole } = render(<MonitoringToggle scaleId="37" />)
    const toggle = getByRole('button')
    
    // Estado inicial: OFF
    expect(toggle).toHaveClass('bg-gray-300')
    
    // Click: inmediatamente ON (optimistic)
    fireEvent.click(toggle)
    expect(toggle).toHaveClass('bg-green-600')
    
    // API resuelve: permanece ON
    await waitFor(() => {
      expect(mockApi.updateScaleMonitoring).toHaveBeenCalled()
    })
    expect(toggle).toHaveClass('bg-green-600')
  })
  
  it('rollback on error', async () => {
    mockApi.updateScaleMonitoring.mockRejectedValue(new Error('Network'))
    
    const { getByRole } = render(<MonitoringToggle scaleId="37" />)
    const toggle = getByRole('button')
    
    fireEvent.click(toggle)
    expect(toggle).toHaveClass('bg-green-600') // Optimistic
    
    await waitFor(() => {
      expect(toggle).toHaveClass('bg-gray-300') // Rollback
    })
  })
})
```

---

## Migración desde Sistema Actual

### Paso 1: Backend (Sin romper frontend)
1. Crear tabla `scale_monitoring`
2. Migrar datos de `selected_scales.json`:
   ```python
   with open('selected_scales.json') as f:
       data = json.load(f)
   
   for scale_id in data['selected_scales']:
       insert_monitoring(scale_id, enabled=True, updated_by='migration')
   ```
3. Mantener endpoints antiguos funcionando

### Paso 2: Frontend (Feature Flag)
1. Implementar nuevo store y componentes
2. Feature flag para habilitar nuevo sistema:
   ```javascript
   const useNewMonitoring = import.meta.env.VITE_NEW_MONITORING === 'true'
   ```

### Paso 3: Rollout
1. Habilitar para testing interno
2. Monitor de errores
3. Rollout gradual (10% → 50% → 100%)
4. Eliminar código viejo

---

## Resumen

### Antes ❌
```
Checkbox → localStorage → Polling → Desincronización
```

### Después ✅
```
Toggle → Store → API Idempotente → SQLite → SSE → Todos los clientes sincronizados
```

### Beneficios
- ✅ **Separación UI/Dominio**: Claro y mantenible
- ✅ **Persistencia Robusta**: ACID garantizado
- ✅ **Sincronización Real-Time**: <100ms latencia
- ✅ **Control de Concurrencia**: Sin conflictos silenciosos
- ✅ **Escalable**: Hasta 10k+ básculas
- ✅ **Testeable**: Unit + Integration tests
- ✅ **Auditable**: Quién/Cuándo/Qué

---

**Ver implementación completa en:**
- Backend: `backend/monitoring_service.py`
- Frontend Store: `src/stores/monitoringStore.js`
- Componente: `src/components/MonitoringToggle.jsx`
