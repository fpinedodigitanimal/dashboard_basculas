# -*- coding: utf-8 -*-
"""
Servicio de Monitorización de Básculas
Gestiona el estado de activación de alertas por báscula
"""

import sqlite3
import json
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass, asdict
from typing import List, Optional, Dict
from contextlib import contextmanager
import threading


# Exceptions
class VersionConflictError(Exception):
    """Raised when optimistic locking detects a version conflict"""
    def __init__(self, expected: int, current: int, current_state: dict):
        self.expected = expected
        self.current = current
        self.current_state = current_state
        super().__init__(
            f"Version conflict: expected {expected}, current is {current}"
        )


class MonitoringServiceError(Exception):
    """Base exception for monitoring service errors"""
    pass


# Domain Model
@dataclass
class ScaleMonitoring:
    """Representa el estado de monitorización de una báscula"""
    scale_id: str
    enabled: bool
    updated_at: str  # ISO 8601
    updated_by: str
    version: int = 1
    
    def to_dict(self) -> dict:
        """Convierte a diccionario para serialización"""
        return {
            'scale_id': self.scale_id,
            'enabled': self.enabled,
            'updated_at': self.updated_at,
            'updated_by': self.updated_by,
            'version': self.version
        }
    
    @classmethod
    def from_dict(cls, data: dict) -> 'ScaleMonitoring':
        """Crea instancia desde diccionario"""
        return cls(**data)
    
    @classmethod
    def from_row(cls, row: sqlite3.Row) -> 'ScaleMonitoring':
        """Crea instancia desde fila de SQLite"""
        return cls(
            scale_id=row['scale_id'],
            enabled=bool(row['enabled']),
            updated_at=row['updated_at'],
            updated_by=row['updated_by'],
            version=row['version']
        )


# Event Manager (para SSE)
class EventManager:
    """Gestiona eventos SSE para sincronización en tiempo real"""
    
    def __init__(self):
        self._listeners = []
        self._lock = threading.Lock()
    
    def subscribe(self, listener):
        """Suscribe un listener a eventos"""
        with self._lock:
            self._listeners.append(listener)
    
    def unsubscribe(self, listener):
        """Desuscribe un listener"""
        with self._lock:
            if listener in self._listeners:
                self._listeners.remove(listener)
    
    def emit(self, event_type: str, data: dict):
        """Emite un evento a todos los listeners"""
        with self._lock:
            event = {
                'type': event_type,
                'data': data,
                'timestamp': datetime.utcnow().isoformat() + 'Z'
            }
            for listener in self._listeners[:]:  # Copy to avoid iteration issues
                try:
                    listener(event)
                except Exception as e:
                    print(f"[EventManager] Error notifying listener: {e}")


# Service
class MonitoringService:
    """Servicio de gestión de monitorización de básculas"""
    
    def __init__(self, db_path: str = None):
        if db_path is None:
            db_path = str(Path(__file__).parent / 'monitoring.db')
        
        self.db_path = db_path
        self.event_manager = EventManager()
        self._init_db()
    
    @contextmanager
    def _get_connection(self):
        """Context manager para conexiones DB con row_factory"""
        conn = sqlite3.connect(self.db_path, check_same_thread=False)
        conn.row_factory = sqlite3.Row
        try:
            yield conn
        finally:
            conn.close()
    
    def _init_db(self):
        """Inicializa la base de datos"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Crear tabla
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS scale_monitoring (
                    scale_id TEXT PRIMARY KEY,
                    enabled INTEGER NOT NULL DEFAULT 0,
                    updated_at TEXT NOT NULL,
                    updated_by TEXT NOT NULL,
                    version INTEGER NOT NULL DEFAULT 1
                )
            """)
            
            # Crear índices
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_monitoring_enabled 
                ON scale_monitoring(enabled)
            """)
            
            cursor.execute("""
                CREATE INDEX IF NOT EXISTS idx_monitoring_updated 
                ON scale_monitoring(updated_at)
            """)
            
            conn.commit()
            print(f"[MonitoringService] Database initialized at {self.db_path}")
    
    def get_all(self) -> List[ScaleMonitoring]:
        """Obtiene todas las configuraciones de monitorización"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT scale_id, enabled, updated_at, updated_by, version
                FROM scale_monitoring
                ORDER BY scale_id
            """)
            
            rows = cursor.fetchall()
            return [ScaleMonitoring.from_row(row) for row in rows]
    
    def get_by_scale_id(self, scale_id: str) -> Optional[ScaleMonitoring]:
        """Obtiene la configuración de una báscula específica"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT scale_id, enabled, updated_at, updated_by, version
                FROM scale_monitoring
                WHERE scale_id = ?
            """, (scale_id,))
            
            row = cursor.fetchone()
            return ScaleMonitoring.from_row(row) if row else None
    
    def get_enabled_scales(self) -> List[str]:
        """Obtiene lista de scale_ids con monitorización activa"""
        with self._get_connection() as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT scale_id 
                FROM scale_monitoring 
                WHERE enabled = 1
                ORDER BY scale_id
            """)
            
            return [row['scale_id'] for row in cursor.fetchall()]
    
    def update(
        self,
        scale_id: str,
        enabled: bool,
        updated_by: str,
        version: Optional[int] = None
    ) -> Dict:
        """
        Actualiza el estado de monitorización de una báscula (IDEMPOTENTE)
        
        Args:
            scale_id: ID de la báscula
            enabled: Estado de monitorización
            updated_by: Usuario que realiza la operación
            version: Versión esperada (para optimistic locking)
        
        Returns:
            Dict con scale_id, enabled, version, changed
        
        Raises:
            VersionConflictError: Si la versión no coincide
        """
        with self._get_connection() as conn:
            cursor = conn.cursor()
            
            # Leer estado actual
            cursor.execute("""
                SELECT scale_id, enabled, updated_at, updated_by, version
                FROM scale_monitoring
                WHERE scale_id = ?
            """, (scale_id,))
            
            current_row = cursor.fetchone()
            now = datetime.utcnow().isoformat() + 'Z'
            
            if current_row:
                current = ScaleMonitoring.from_row(current_row)
                
                # Verificar versión (optimistic locking)
                if version is not None and current.version != version:
                    raise VersionConflictError(
                        expected=version,
                        current=current.version,
                        current_state=current.to_dict()
                    )
                
                # Verificar si hay cambio real (idempotencia)
                if current.enabled == enabled:
                    # No cambió nada, devolver estado actual sin incrementar versión
                    return {
                        'scale_id': scale_id,
                        'enabled': enabled,
                        'updated_at': current.updated_at,
                        'updated_by': current.updated_by,
                        'version': current.version,
                        'changed': False
                    }
                
                # Actualizar
                new_version = current.version + 1
                cursor.execute("""
                    UPDATE scale_monitoring 
                    SET enabled = ?, updated_at = ?, updated_by = ?, version = ?
                    WHERE scale_id = ?
                """, (int(enabled), now, updated_by, new_version, scale_id))
                
            else:
                # Crear nuevo registro
                new_version = 1
                cursor.execute("""
                    INSERT INTO scale_monitoring (scale_id, enabled, updated_at, updated_by, version)
                    VALUES (?, ?, ?, ?, ?)
                """, (scale_id, int(enabled), now, updated_by, new_version))
            
            conn.commit()
            
            result = {
                'scale_id': scale_id,
                'enabled': enabled,
                'updated_at': now,
                'updated_by': updated_by,
                'version': new_version,
                'changed': True
            }
            
            # Emitir evento SSE
            self.event_manager.emit('scale.monitoring.updated', result)
            
            return result
    
    def bulk_update(
        self,
        updates: List[Dict],
        updated_by: str
    ) -> Dict:
        """
        Actualiza múltiples básculas en una sola operación
        
        Args:
            updates: Lista de {scale_id, enabled}
            updated_by: Usuario que realiza la operación
        
        Returns:
            Dict con updated (count) y results (lista)
        """
        results = []
        changed_count = 0
        
        for update in updates:
            try:
                result = self.update(
                    scale_id=update['scale_id'],
                    enabled=update['enabled'],
                    updated_by=updated_by
                )
                results.append(result)
                if result['changed']:
                    changed_count += 1
            except Exception as e:
                results.append({
                    'scale_id': update['scale_id'],
                    'error': str(e)
                })
        
        return {
            'updated': changed_count,
            'total': len(updates),
            'results': results
        }
    
    def migrate_from_json(self, json_path: str, updated_by: str = 'migration'):
        """
        Migra datos desde el sistema antiguo (selected_scales.json)
        
        Args:
            json_path: Ruta al archivo JSON
            updated_by: Usuario que realiza la migración
        """
        try:
            with open(json_path, 'r', encoding='utf-8') as f:
                data = json.load(f)
            
            selected_scales = data.get('selected_scales', [])
            
            print(f"[Migration] Migrando {len(selected_scales)} básculas...")
            
            for scale_id in selected_scales:
                self.update(
                    scale_id=str(scale_id),
                    enabled=True,
                    updated_by=updated_by
                )
            
            print(f"[Migration] Migración completada: {len(selected_scales)} básculas")
            
        except FileNotFoundError:
            print(f"[Migration] Archivo {json_path} no encontrado, iniciando con DB vacía")
        except Exception as e:
            print(f"[Migration] Error en migración: {e}")
            raise MonitoringServiceError(f"Migration failed: {e}")
    
    def export_to_json(self, json_path: str):
        """
        Exporta el estado actual a JSON (para backup)
        
        Args:
            json_path: Ruta donde guardar el JSON
        """
        monitoring = self.get_all()
        enabled_scales = [m.scale_id for m in monitoring if m.enabled]
        
        data = {
            'selected_scales': enabled_scales,
            'exported_at': datetime.utcnow().isoformat() + 'Z',
            'total_scales': len(monitoring),
            'enabled_scales': len(enabled_scales)
        }
        
        with open(json_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        
        print(f"[Export] Exportado a {json_path}")


# Singleton global
_service_instance = None


def get_monitoring_service() -> MonitoringService:
    """Obtiene la instancia singleton del servicio"""
    global _service_instance
    if _service_instance is None:
        _service_instance = MonitoringService()
    return _service_instance


if __name__ == '__main__':
    # Test básico
    service = MonitoringService(':memory:')
    
    print("Test 1: Crear nuevo")
    result = service.update('37', True, 'test_user')
    print(f"  Result: {result}")
    assert result['changed'] == True
    assert result['version'] == 1
    
    print("Test 2: Idempotencia")
    result = service.update('37', True, 'test_user')
    print(f"  Result: {result}")
    assert result['changed'] == False
    assert result['version'] == 1
    
    print("Test 3: Cambio real")
    result = service.update('37', False, 'test_user')
    print(f"  Result: {result}")
    assert result['changed'] == True
    assert result['version'] == 2
    
    print("Test 4: Conflict detection")
    try:
        result = service.update('37', True, 'test_user', version=1)
        assert False, "Should have raised VersionConflictError"
    except VersionConflictError as e:
        print(f"  Conflict detected correctly: {e}")
    
    print("Test 5: Get all")
    all_monitoring = service.get_all()
    print(f"  Total: {len(all_monitoring)}")
    
    print("\n✅ All tests passed!")
