# -*- coding: utf-8 -*-
"""
Backend API simplificado para React Dashboard
Sirve datos del sistema de básculas existente

MODO DEMO:
Para ejecutar en local sin acceso a labs2, define:
    set DEMO_MODE=1 (Windows)
    export DEMO_MODE=1 (Linux/Mac)
Luego: python api.py
"""

import os
import sys
import json
import time
import queue
import numpy as np
from pathlib import Path
from functools import wraps
from flask import Flask, jsonify, request, Response, stream_with_context, send_from_directory, render_template, session
from flask_cors import CORS
from datetime import date, timedelta, datetime
import pandas as pd

# Modo DEMO (para desarrollo local sin labs2)
DEMO_MODE = os.getenv('DEMO_MODE', '0') == '1'

# Importar lógica existente (agregar el directorio raíz del proyecto)
if not DEMO_MODE:
    root_dir = Path(__file__).parent.parent.parent  # react-dashboard/backend -> react-dashboard -> 00_dash_basculas
    sys.path.insert(0, str(root_dir))
    try:
        import labs2
        from alerts import AlertEngine
    except ImportError:
        print("[ADVERTENCIA] No se pudo importar labs2. Activando DEMO_MODE.")
        DEMO_MODE = True

# Importar servicio de monitorización
if not DEMO_MODE:
    from monitoring_service import (
        get_monitoring_service, 
        VersionConflictError, 
        MonitoringServiceError
    )

# Configurar Flask para servir frontend en producción
app = Flask(__name__, 
            static_folder='static',
            template_folder='templates')

# Configurar clave secreta para sesiones
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'

# Configurar CORS - permitir frontend en Vercel y desarrollo local
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', 'http://localhost:3000').split(',')

CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configuración
try:
    from dotenv import load_dotenv
    load_dotenv()
except ImportError:
    pass

# Configuración de autenticación
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'digitanimal')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'digibasculas')

# Decorador para proteger rutas que requieren autenticación
def login_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'No autenticado', 'message': 'Debe iniciar sesión'}), 401
        return f(*args, **kwargs)
    return decorated_function

BASE_COLS = ["created_at", "scale_id", "weight", "epc"]

# Verificación de modo DEMO para rutas que requieren monitoring_service
def require_monitoring_service():
    """Helper que devuelve un error si estamos en DEMO_MODE y no hay monitoring_service"""
    if DEMO_MODE or monitoring_service is None:
        return jsonify({
            'error': 'Funcionalidad no disponible en modo DEMO',
            'message': 'Esta funcionalidad requiere acceso a la base de datos de producción'
        }), 503
    return None

# Cache para datos de básculas
_data_cache = {
    'df': None,
    'timestamp': None,
    'ttl': 30  # segundos - cache válido por 30 segundos
}


def normalize_log_weight(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza datos de log_weight igual que en dashboard_basculas.py"""
    if df is None or df.empty:
        return pd.DataFrame(columns=BASE_COLS)
    
    print(f"[DEBUG] normalize_log_weight - Columnas recibidas: {df.columns.tolist()}")
    print(f"[DEBUG] normalize_log_weight - Primeras 3 filas de weight: {df['weight'].head(3).tolist() if 'weight' in df.columns else 'COLUMNA NO EXISTE'}")
    
    for c in BASE_COLS:
        if c not in df.columns:
            df[c] = None
    df = df[BASE_COLS].copy()
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    df = df.dropna(subset=["created_at"])
    df["scale_id"] = df["scale_id"].astype(str)
    df["epc"] = df["epc"].astype(str)
    df["weight"] = pd.to_numeric(df["weight"], errors="coerce")
    
    print(f"[DEBUG] normalize_log_weight - Después de to_numeric, primeras 3 filas de weight: {df['weight'].head(3).tolist()}")
    print(f"[DEBUG] normalize_log_weight - Estadísticas de weight: min={df['weight'].min()}, max={df['weight'].max()}, count={df['weight'].count()}")
    
    # Filtrar básculas de simulación B00000 y B00100
    df = df[~df["scale_id"].isin(["B00000", "B00100"])]
    return df


def generate_demo_data():
    """Genera datos sintéticos para modo DEMO"""
    print("[DEMO] Generando datos sintéticos...")
    
    # Definir básculas de prueba (los mismos grupos que en el frontend)
    scales = {
        'B00012': 'Algortola',
        'B00019': 'Gil',
        'B00020': 'Gil',
        'B00027': 'Sierra San Pedro',
        'B00034': 'Rubén',
        'B00037': 'Bonarea',
        'B00038': 'Bonarea',
        'B00039': 'Bonarea',
        'B00040': 'Bonarea',
        'B00051': 'Villacuenca',
        'B00054': 'COVAP',
        'B00056': 'COVAP',
        'B00057': 'Larriaundi',
        'B00059': 'Bonarea',
        'B00060': 'Bonarea',
        'B00061': 'Bonarea',
        'B00062': 'Bonarea',
        'B00063': 'Ganademad',
        'B00064': 'Larriaundi',
        'B00065': 'COVAP',
        'B00066': 'COVAP'
    }
    
    # Generar 30 días de datos
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    records = []
    np.random.seed(42)  # Para reproducibilidad
    
    for scale_id, group in scales.items():
        # Cada báscula genera entre 50-200 registros por día
        daily_records = np.random.randint(50, 200)
        
        current_date = start_date
        while current_date <= end_date:
            # Variar registros por día (+-30%)
            num_records = int(daily_records * np.random.uniform(0.7, 1.3))
            
            for _ in range(num_records):
                # Distribuir registros en horas laborales principalmente
                hour = np.random.choice(range(24), p=[
                    0.01, 0.01, 0.01, 0.01, 0.01, 0.02,  # 0-5
                    0.05, 0.08, 0.10, 0.12, 0.10, 0.08,  # 6-11
                    0.06, 0.08, 0.10, 0.08, 0.06, 0.04,  # 12-17
                    0.03, 0.02, 0.02, 0.01, 0.01, 0.01   # 18-23
                ])
                minute = np.random.randint(0, 60)
                
                timestamp = current_date.replace(hour=hour, minute=minute, second=0)
                
                # Pesos realistas (50-800 kg para ganado)
                weight = np.random.normal(400, 150)
                weight = max(50, min(800, weight))  # Limitar al rango
                
                # EPCs simulados
                epc = f"EPC{scale_id[-3:]}{np.random.randint(1000, 9999)}"
                
                records.append({
                    'created_at': timestamp,
                    'scale_id': scale_id,
                    'weight': round(weight, 2),
                    'epc': epc
                })
            
            current_date += timedelta(days=1)
    
    df = pd.DataFrame(records)
    df = normalize_log_weight(df)
    print(f"[DEMO] Generados {len(df)} registros para {len(scales)} básculas")
    return df


def get_bascula_data():
    """Obtiene datos de básculas desde la API con caché - igual que dashboard_basculas.py"""
    # MODO DEMO
    if DEMO_MODE:
        now = time.time()
        if (_data_cache['df'] is not None and 
            _data_cache['timestamp'] is not None and 
            (now - _data_cache['timestamp']) < _data_cache['ttl']):
            return _data_cache['df']
        
        df = generate_demo_data()
        _data_cache['df'] = df
        _data_cache['timestamp'] = now
        return df
    
    # MODO REAL
    # Verificar caché
    now = time.time()
    if (_data_cache['df'] is not None and 
        _data_cache['timestamp'] is not None and 
        (now - _data_cache['timestamp']) < _data_cache['ttl']):
        print(f"[API] Usando datos en caché ({len(_data_cache['df'])} filas)")
        return _data_cache['df']
    
    # Cargar datos frescos
    fecha_limite = date.today() - timedelta(days=30)
    try:
        print(f"[API] Cargando datos desde {fecha_limite}...")
        df = labs2.get_table_data(
            "log_weight", 
            column="created_at", 
            value=fecha_limite.strftime("%Y-%m-%d"), 
            operator="more"
        )
        print(f"[DEBUG] Datos cargados de labs2: {len(df)} filas, columnas: {df.columns.tolist() if not df.empty else 'DF VACÍO'}")
        if not df.empty:
            print(f"[DEBUG] Muestra de datos crudos (primeras 3 filas):")
            print(df[['scale_id', 'weight', 'created_at', 'epc']].head(3))
        
        df = normalize_log_weight(df)
        if df.empty:
            print("[API] API devolvió vacío")
            return pd.DataFrame(columns=BASE_COLS)
        
        # Actualizar caché
        _data_cache['df'] = df
        _data_cache['timestamp'] = now
        
        print(f"[API] Datos cargados: {len(df)} filas - caché actualizado")
        return df
    except Exception as e:
        print(f"[API ERROR] Error obteniendo datos: {e}")
        import traceback
        traceback.print_exc()
        # Si hay error pero tenemos caché, usarlo aunque esté expirado
        if _data_cache['df'] is not None:
            print(f"[API] Usando caché expirado como fallback")
            return _data_cache['df']
        return pd.DataFrame(columns=BASE_COLS)


# ============================================================================
# RUTAS DE AUTENTICACIÓN
# ============================================================================

@app.route('/api/auth/login', methods=['POST'])
def login():
    """Endpoint de inicio de sesión"""
    data = request.get_json()
    
    if not data:
        return jsonify({'error': 'Datos no proporcionados'}), 400
    
    username = data.get('username')
    password = data.get('password')
    
    if not username or not password:
        return jsonify({'error': 'Usuario y contraseña son requeridos'}), 400
    
    # Verificar credenciales
    if username == ADMIN_USERNAME and password == ADMIN_PASSWORD:
        session['logged_in'] = True
        session['username'] = username
        return jsonify({
            'success': True,
            'message': 'Sesión iniciada correctamente',
            'user': {'username': username}
        }), 200
    else:
        return jsonify({'error': 'Credenciales inválidas'}), 401


@app.route('/api/auth/logout', methods=['POST'])
def logout():
    """Endpoint de cierre de sesión"""
    session.clear()
    return jsonify({'success': True, 'message': 'Sesión cerrada correctamente'}), 200


@app.route('/api/auth/status', methods=['GET'])
def auth_status():
    """Verifica el estado de autenticación"""
    if session.get('logged_in'):
        return jsonify({
            'authenticated': True,
            'user': {'username': session.get('username')}
        }), 200
    else:
        return jsonify({'authenticated': False}), 200


# ============================================================================
# RUTAS DEL DASHBOARD (PROTEGIDAS)
# ============================================================================

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard_data():
    """Endpoint principal del dashboard"""
    try:
        # Obtener fecha seleccionada o usar hoy por defecto
        date_param = request.args.get('date')
        if date_param:
            try:
                selected_date = datetime.strptime(date_param, '%Y-%m-%d').date()
            except ValueError:
                selected_date = date.today()
        else:
            selected_date = date.today()
        
        df = get_bascula_data()
        
        if df.empty:
            print("[API] No hay datos disponibles")
            return jsonify({
                'activeScales': 0,
                'totalScales': 0,
                'todayWeights': 0,
                'weightChange': 0,
                'activeAlerts': 0,
                'alerts': [],
                'chartData': [],
                'volume30dData': [],
                'heatmapData': [],
                'histogramData': [],
                'tableData': [],
                'selectedDate': selected_date.strftime('%Y-%m-%d')
            })
        
        print(f"[API] Procesando {len(df)} registros para fecha {selected_date}...")
        
        # Calcular stats usando las columnas correctas
        today = selected_date
        yesterday = today - timedelta(days=1)
        
        df['date'] = df['created_at'].dt.date
        today_data = df[df['date'] == today]
        yesterday_data = df[df['date'] == yesterday]
        
        today_weights = len(today_data)
        yesterday_weights = len(yesterday_data)
        weight_change = 0
        if yesterday_weights > 0:
            weight_change = round(((today_weights - yesterday_weights) / yesterday_weights) * 100, 1)
        
        # Chart data - últimos 30 días por báscula
        chart_data = []
        volume_30d_data = []
        
        # Datos agregados de los últimos 7 días para el gráfico simple
        for i in range(6, -1, -1):
            fecha = today - timedelta(days=i)
            day_data = df[df['date'] == fecha]
            
            chart_data.append({
                'fecha': fecha.strftime("%d %b"),
                'pesajes': len(day_data),
                'activas': day_data['scale_id'].nunique() if not day_data.empty else 0
            })
        
        # Volumen 30d por báscula (para gráfico de líneas múltiples)
        date_range_30d = pd.date_range(start=today - timedelta(days=29), end=today, freq='D')
        for scale_id in sorted(df['scale_id'].unique()):
            scale_df = df[df['scale_id'] == scale_id]
            data_points = []
            
            for fecha in date_range_30d:
                day_count = len(scale_df[scale_df['date'] == fecha.date()])
                data_points.append({
                    'fecha': fecha.strftime("%d/%m"),
                    'registros': day_count
                })
            
            volume_30d_data.append({
                'scale_id': scale_id,
                'data': data_points,
                'total': len(scale_df)
            })
        
        # Table data - básculas únicas (último pesaje)
        table_data = []
        for scale_id in sorted(df['scale_id'].unique()):
            scale_df = df[df['scale_id'] == scale_id].sort_values('created_at')
            today_scale = scale_df[scale_df['date'] == today]
            
            if not scale_df.empty:
                last_weight = scale_df.iloc[-1]
                
                # Debug: ver el valor del peso
                weight_value = last_weight['weight']
                print(f"[DEBUG] Báscula {scale_id}: weight raw = {weight_value}, type = {type(weight_value)}, pd.notna = {pd.notna(weight_value)}")
                
                table_data.append({
                    'scale_id': scale_id,
                    'nombre': scale_id,
                    'weight': float(last_weight['weight']) if pd.notna(last_weight['weight']) else None,
                    'created_at': last_weight['created_at'].strftime('%Y-%m-%d %H:%M:%S') if pd.notna(last_weight['created_at']) else None,
                    'estado': 'conectado' if not today_scale.empty else 'desconectado',
                    'ultimoPesaje': last_weight['created_at'].strftime('%H:%M') if pd.notna(last_weight['created_at']) else '-',
                    'totalHoy': len(today_scale),
                    'rfid': str(last_weight['epc']) if pd.notna(last_weight['epc']) and last_weight['epc'] != '0' else '-'
                })
        
        print(f"[DEBUG] table_data generado con {len(table_data)} básculas")
        if len(table_data) > 0:
            print(f"[DEBUG] Ejemplo de primera báscula: {table_data[0]}")
        
        # Heatmap data - registros por hora de ayer y hoy (48 horas)
        heatmap_data = []
        yesterday = today - timedelta(days=1)
        last_48h_df = df[(df['date'] == yesterday) | (df['date'] == today)].copy()
        
        if not last_48h_df.empty:
            last_48h_df['hour'] = last_48h_df['created_at'].dt.hour
            last_48h_df['day'] = last_48h_df['created_at'].dt.date
            
            for scale_id in sorted(last_48h_df['scale_id'].unique()):
                scale_hourly = []
                scale_df = last_48h_df[last_48h_df['scale_id'] == scale_id]
                
                # Ayer (0-23)
                yesterday_df = scale_df[scale_df['day'] == yesterday]
                for hour in range(24):
                    count = len(yesterday_df[yesterday_df['hour'] == hour])
                    scale_hourly.append(count)
                
                # Hoy (24-47)
                today_df = scale_df[scale_df['day'] == today]
                for hour in range(24):
                    count = len(today_df[today_df['hour'] == hour])
                    scale_hourly.append(count)
                
                heatmap_data.append({
                    'scale_id': scale_id,
                    'hourly': scale_hourly
                })
        
        # Histogram data - distribución de pesos
        histogram_data = []
        weight_df = df[df['weight'].notna()].copy()
        weight_df = weight_df[weight_df['weight'] >= 100]  # Filtrar ruido
        
        if not weight_df.empty:
            for scale_id in sorted(weight_df['scale_id'].unique()):
                scale_weights = weight_df[weight_df['scale_id'] == scale_id]['weight'].tolist()
                if scale_weights:
                    histogram_data.append({
                        'scale_id': scale_id,
                        'weights': scale_weights
                    })
        
        # Generar alertas simples (sin usar AlertEngine por ahora)
        alerts = []
        alert_id = 1
        
        for scale_id in df['scale_id'].unique():
            scale_data = df[df['scale_id'] == scale_id]
            last_record = scale_data['created_at'].max()
            hours_since = (pd.Timestamp.now() - last_record).total_seconds() / 3600
            
            if hours_since > 24:
                alerts.append({
                    'id': alert_id,
                    'scale_id': scale_id,  # Agregar scale_id para facilitar filtrado
                    'severity': 'warning',
                    'tipo': 'WARNING',
                    'title': f'Báscula {scale_id} sin actividad',
                    'message': f'Sin registros hace {int(hours_since)} horas',
                    'detalle': f'Último registro: {last_record.strftime("%d/%m/%Y %H:%M")}',
                    'details': f'Último registro: {last_record.strftime("%d/%m/%Y %H:%M")}'
                })
                alert_id += 1
        
        result = {
            'activeScales': df['scale_id'].nunique(),
            'totalScales': df['scale_id'].nunique(),
            'todayWeights': today_weights,
            'weightChange': weight_change,
            'activeAlerts': len(alerts),
            'alerts': alerts[:5],
            'chartData': chart_data,
            'volume30dData': volume_30d_data,
            'heatmapData': heatmap_data,
            'histogramData': histogram_data,
            'tableData': table_data,
            'selectedDate': today.strftime('%Y-%m-%d')
        }
        
        print(f"[API] Respuesta: {result['activeScales']} básculas, {result['todayWeights']} pesajes hoy")
        return jsonify(result)
        
    except Exception as e:
        print(f"[API ERROR] Error en /api/dashboard: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/kpis', methods=['GET'])
@login_required
def get_kpis():
    """Endpoint para obtener KPIs del dashboard"""
    try:
        print("[API] Procesando solicitud GET /api/kpis")
        df = get_bascula_data()
        
        if df.empty:
            return jsonify({
                'activeScales': 0,
                'totalAnimals': 0,
                'recordsPerHour': 0,
                'activityTrend': 0,
                'scalesWithAlerts': 0
            })
        
        now = pd.Timestamp.now()
        today = now.normalize()
        yesterday = today - pd.Timedelta(days=1)
        last_24h = now - pd.Timedelta(hours=24)
        
        # 1. Básculas activas (con datos en los últimos 7 días)
        last_7d = now - pd.Timedelta(days=7)
        active_scales = df[df['created_at'] >= last_7d]['scale_id'].nunique()
        
        # 2. Animales monitorizados (EPCs únicos en últimos 7 días)
        total_animals = df[
            (df['created_at'] >= last_7d) & 
            (df['epc'].notna()) & 
            (df['epc'] != '') & 
            (df['epc'] != 'Unknown')
        ]['epc'].nunique()
        
        # 3. Registros por hora (media últimas 24h)
        df_24h = df[df['created_at'] >= last_24h]
        records_per_hour = len(df_24h) / 24.0 if len(df_24h) > 0 else 0
        
        # 4. Tendencia de actividad (ayer vs anteayer - días completos)
        # No se incluye hoy porque es un día incompleto
        day_before_yesterday = yesterday - pd.Timedelta(days=1)
        yesterday_records = len(df[(df['created_at'] >= yesterday) & (df['created_at'] < today)])
        day_before_records = len(df[(df['created_at'] >= day_before_yesterday) & (df['created_at'] < yesterday)])
        
        if day_before_records > 0:
            activity_trend = ((yesterday_records - day_before_records) / day_before_records) * 100
        else:
            activity_trend = 0 if yesterday_records == 0 else 100
        
        # 5. Básculas con alertas (sin actividad en últimas 24h pero con datos en últimos 7 días)
        scales_with_data = set(df[df['created_at'] >= last_7d]['scale_id'].unique())
        scales_with_recent_data = set(df[df['created_at'] >= last_24h]['scale_id'].unique())
        scales_with_alerts = len(scales_with_data - scales_with_recent_data)
        
        result = {
            'activeScales': int(active_scales),
            'totalAnimals': int(total_animals),
            'recordsPerHour': float(records_per_hour),
            'activityTrend': float(activity_trend),
            'scalesWithAlerts': int(scales_with_alerts)
        }
        
        print(f"[API] KPIs: {result}")
        return jsonify(result)
        
    except Exception as e:
        print(f"[API ERROR] Error en /api/kpis: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/remoteiot/status', methods=['GET'])
@login_required
def get_remoteiot_status():
    """Status de RemoteIoT"""
    # Esta función debería usar RemoteIoTClient del dashboard original
    # Por ahora devolvemos mock
    return jsonify({
        'B-001': 'conectado',
        'B-002': 'conectado',
        'B-003': 'desconectado',
    })


@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({'status': 'ok'})


@app.route('/api/cache/clear', methods=['POST'])
@login_required
def clear_cache():
    """Limpia el caché de datos de básculas"""
    global _data_cache
    _data_cache['df'] = None
    _data_cache['timestamp'] = None
    print("[API] Caché limpiado manualmente")
    return jsonify({'status': 'ok', 'message': 'Caché limpiado'})


@app.route('/api/cache/status', methods=['GET'])
@login_required
def cache_status():
    """Obtiene el estado del caché"""
    if _data_cache['df'] is None:
        return jsonify({
            'status': 'empty',
            'rows': 0,
            'age_seconds': None
        })
    
    age = time.time() - _data_cache['timestamp'] if _data_cache['timestamp'] else None
    return jsonify({
        'status': 'active',
        'rows': len(_data_cache['df']),
        'age_seconds': round(age, 1) if age else None,
        'ttl': _data_cache['ttl'],
        'valid': age < _data_cache['ttl'] if age else False
    })


# Archivo para almacenar selección de básculas (legacy - mantener para retrocompatibilidad)
SELECTION_FILE = Path(__file__).parent / 'selected_scales.json'

# Inicializar servicio de monitorización (solo si no está en DEMO_MODE)
monitoring_service = None
if not DEMO_MODE:
    monitoring_service = get_monitoring_service()

    # Migrar datos antiguos si existen
    if SELECTION_FILE.exists():
        try:
            monitoring_service.migrate_from_json(str(SELECTION_FILE), updated_by='auto_migration')
            # Hacer backup del archivo antiguo
            backup_file = SELECTION_FILE.with_suffix('.json.backup')
            # Eliminar backup existente si existe
            if backup_file.exists():
                backup_file.unlink()
            SELECTION_FILE.rename(backup_file)
            print(f"[API] Migración completada. Backup en {backup_file}")
        except Exception as e:
            print(f"[API] Error en migración automática: {e}")


# ==================== MONITORING API (NEW) ====================

@app.route('/api/scales/monitoring', methods=['GET'])
@login_required
def get_monitoring():
    """Obtiene el estado de monitorización de todas las básculas"""
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    try:
        monitoring = monitoring_service.get_all()
        return jsonify({
            'monitoring': [m.to_dict() for m in monitoring]
        })
    except Exception as e:
        print(f"[API] Error en GET /monitoring: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/scales/<scale_id>/monitoring', methods=['GET'])
@login_required
def get_scale_monitoring(scale_id):
    """Obtiene el estado de monitorización de una báscula específica"""
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    try:
        monitoring = monitoring_service.get_by_scale_id(scale_id)
        
        if monitoring:
            return jsonify(monitoring.to_dict())
        else:
            # No existe, devolver estado default
            return jsonify({
                'scale_id': scale_id,
                'enabled': False,
                'updated_at': None,
                'updated_by': None,
                'version': 0
            })
    except Exception as e:
        print(f"[API] Error en GET /monitoring/{scale_id}: {e}")
        return jsonify({'error': str(e)}), 500


@app.route('/api/scales/<scale_id>/monitoring', methods=['PUT'])
@login_required
def update_scale_monitoring(scale_id):
    """
    Actualiza el estado de monitorización de una báscula (IDEMPOTENTE)
    
    Body: {
        "enabled": true|false,
        "updated_by": "user_id",
        "version": 4  // opcional, para optimistic locking
    }
    """
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    try:
        data = request.get_json()
        
        if 'enabled' not in data or not isinstance(data['enabled'], bool):
            return jsonify({
                'error': 'invalid_request',
                'message': "Field 'enabled' is required and must be boolean"
            }), 400
        
        enabled = data['enabled']
        updated_by = data.get('updated_by', 'anonymous')
        version = data.get('version')
        
        result = monitoring_service.update(
            scale_id=scale_id,
            enabled=enabled,
            updated_by=updated_by,
            version=version
        )
        
        return jsonify(result), 200
        
    except VersionConflictError as e:
        return jsonify({
            'error': 'version_conflict',
            'message': str(e),
            'expected': e.expected,
            'current': e.current,
            'current_state': e.current_state
        }), 409
        
    except Exception as e:
        print(f"[API] Error en PUT /monitoring/{scale_id}: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/scales/monitoring/bulk', methods=['PUT'])
@login_required
def bulk_update_monitoring():
    """
    Actualiza múltiples básculas en una sola operación
    
    Body: {
        "scales": [
            {"scale_id": "37", "enabled": true},
            {"scale_id": "38", "enabled": false}
        ],
        "updated_by": "user_id"
    }
    """
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    try:
        data = request.get_json()
        
        scales = data.get('scales', [])
        updated_by = data.get('updated_by', 'anonymous')
        
        if not scales or not isinstance(scales, list):
            return jsonify({
                'error': 'invalid_request',
                'message': "'scales' must be a non-empty array"
            }), 400
        
        result = monitoring_service.bulk_update(
            updates=scales,
            updated_by=updated_by
        )
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[API] Error en PUT /monitoring/bulk: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500


@app.route('/api/scales/monitoring/events')
@login_required
def monitoring_events():
    """
    Server-Sent Events (SSE) endpoint para sincronización en tiempo real
    Los clientes se suscriben aquí y reciben actualizaciones cuando cambia el estado
    """
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    def generate():
        # Cola para este cliente específico
        event_queue = queue.Queue()
        
        # Función listener que agrega eventos a la cola
        def event_listener(event):
            event_queue.put(event)
        
        # Suscribir al event manager
        monitoring_service.event_manager.subscribe(event_listener)
        
        try:
            # Enviar estado inicial completo
            monitoring = monitoring_service.get_all()
            for m in monitoring:
                yield f"event: scale.monitoring.updated\n"
                yield f"data: {json.dumps(m.to_dict())}\n\n"
            
            # Stream de eventos en tiempo real
            last_heartbeat = time.time()
            
            while True:
                try:
                    # Esperar evento con timeout para heartbeat
                    event = event_queue.get(timeout=30)
                    
                    yield f"event: {event['type']}\n"
                    yield f"data: {json.dumps(event['data'])}\n\n"
                    
                    last_heartbeat = time.time()
                    
                except queue.Empty:
                    # Heartbeat cada 30s
                    now = time.time()
                    if now - last_heartbeat >= 30:
                        yield f"event: heartbeat\n"
                        yield f"data: {json.dumps({'timestamp': datetime.utcnow().isoformat() + 'Z'})}\n\n"
                        last_heartbeat = now
                        
        finally:
            # Desuscribir cuando el cliente se desconecta
            monitoring_service.event_manager.unsubscribe(event_listener)
    
    return Response(
        stream_with_context(generate()),
        mimetype='text/event-stream',
        headers={
            'Cache-Control': 'no-cache',
            'X-Accel-Buffering': 'no',
            'Connection': 'keep-alive'
        }
    )


# ==================== LEGACY API (MANTENER PARA RETROCOMPATIBILIDAD) ====================


# ==================== LEGACY API (MANTENER PARA RETROCOMPATIBILIDAD) ====================

@app.route('/api/scales/selection', methods=['GET'])
@login_required
def get_selection():
    """
    Obtener la selección actual de básculas (LEGACY)
    Ahora usa el servicio de monitorización internamente
    """
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    try:
        enabled_scales = monitoring_service.get_enabled_scales()
        return jsonify({
            'selected_scales': enabled_scales,
            'updated_at': datetime.utcnow().isoformat() + 'Z'
        })
    except Exception as e:
        print(f"[API] Error en GET /selection: {e}")
        return jsonify({'selected_scales': []}), 500


@app.route('/api/scales/selection', methods=['POST'])
@login_required
def save_selection():
    """
    Guardar la selección de básculas (LEGACY)
    Ahora usa el servicio de monitorización internamente
    """
    error_response = require_monitoring_service()
    if error_response:
        return error_response
    
    try:
        data = request.get_json()
        selected_scales = data.get('selected_scales', [])
        
        # Obtener todas las básculas actuales
        all_monitoring = {m.scale_id: m.enabled for m in monitoring_service.get_all()}
        
        # Determinar cambios
        updates = []
        
        # Todas las seleccionadas deben estar enabled
        for scale_id in selected_scales:
            scale_id = str(scale_id)
            if not all_monitoring.get(scale_id, False):
                updates.append({'scale_id': scale_id, 'enabled': True})
        
        # Todas las no seleccionadas deben estar disabled
        for scale_id, currently_enabled in all_monitoring.items():
            if currently_enabled and scale_id not in selected_scales:
                updates.append({'scale_id': scale_id, 'enabled': False})
        
        # Aplicar cambios en bulk
        if updates:
            monitoring_service.bulk_update(
                updates=updates,
                updated_by='legacy_api'
            )
        
        return jsonify({
            'status': 'ok',
            'selected_scales': selected_scales
        })
        
    except Exception as e:
        print(f"[API] Error en POST /selection: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'status': 'error', 'message': str(e)}), 500


# ==================== FRONTEND ROUTES (PRODUCTION) ====================

@app.route('/', defaults={'path': ''})
@app.route('/<path:path>')
def serve_frontend(path):
    """
    Sirve el frontend de React en producción
    Si existe el archivo static/templates, lo sirve desde Flask
    """
    # Verificar si estamos en modo producción (existe el build)
    static_folder = Path(__file__).parent / 'static'
    template_folder = Path(__file__).parent / 'templates'
    
    if not template_folder.exists() or not static_folder.exists():
        # Modo desarrollo: el frontend está en Vite (puerto 3000)
        return jsonify({
            'message': 'Dashboard en modo desarrollo',
            'frontend': 'http://localhost:3000',
            'backend': f'http://localhost:{os.environ.get("PORT", 8050)}',
            'note': 'Ejecuta "npm run dev" en react-dashboard/ para iniciar el frontend'
        })
    
    # Modo producción: servir archivos estáticos
    if path and (static_folder / path).exists():
        return send_from_directory(static_folder, path)
    else:
        # SPA: todas las rutas sirven index.html
        return render_template('index.html')


if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8050))
    print(f"🚀 Backend API iniciando en http://0.0.0.0:{port}")
    print(f"   Modo: {'DEMO (datos sintéticos)' if DEMO_MODE else 'PRODUCCIÓN (labs2)'}")
    print(f"   Accesible desde la red local")
    if monitoring_service:
        print(f"   Monitoring DB: {monitoring_service.db_path}")
    print(f"\n💡 Para activar modo DEMO: set DEMO_MODE=1 (Windows) o export DEMO_MODE=1 (Linux/Mac)")
    app.run(host='0.0.0.0', port=port, debug=True)

