# -*- coding: utf-8 -*-
"""
API Serverless para Vercel
Conecta con la API de Digitanimal usando labs2.py para obtener datos reales
"""

import os
import json
import time
import pandas as pd
from datetime import date, timedelta, datetime
from flask import Flask, jsonify, request, session
from flask_cors import CORS
from functools import wraps

# Importar módulo labs2 para acceso a datos reales
import labs2

# Crear app Flask
app = Flask(__name__)

# Configuración
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'vercel-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS en producción

# Configurar CORS
ALLOWED_ORIGINS = os.getenv('ALLOWED_ORIGINS', '*').split(',')
CORS(app, resources={
    r"/api/*": {
        "origins": ALLOWED_ORIGINS,
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Configuración de autenticación
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin')

# Cache para datos de básculas
_data_cache = {
    'df': None,
    'timestamp': None,
    'ttl': 30  # segundos - cache válido por 30 segundos
}

BASE_COLS = ["created_at", "scale_id", "weight", "epc"]

# ==================== FUNCIONES AUXILIARES ====================

def login_required(f):
    """Decorador para proteger rutas que requieren autenticación"""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'No autenticado', 'message': 'Debe iniciar sesión'}), 401
        return f(*args, **kwargs)
    return decorated_function

def normalize_log_weight(df: pd.DataFrame) -> pd.DataFrame:
    """Normaliza datos de log_weight"""
    if df is None or df.empty:
        return pd.DataFrame(columns=BASE_COLS)
    
    for c in BASE_COLS:
        if c not in df.columns:
            df[c] = None
    
    df = df[BASE_COLS].copy()
    df["created_at"] = pd.to_datetime(df["created_at"], errors="coerce")
    df = df.dropna(subset=["created_at"])
    df["scale_id"] = df["scale_id"].astype(str)
    df["epc"] = df["epc"].astype(str)
    df["weight"] = pd.to_numeric(df["weight"], errors="coerce")
    
    # Filtrar básculas de simulación
    df = df[~df["scale_id"].isin(["B00000", "B00100"])]
    
    return df

def get_bascula_data():
    """Obtiene datos de básculas desde la API con caché"""
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

# ==================== HEALTH CHECK ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({'status': 'ok', 'mode': 'real-data', 'timestamp': datetime.now().isoformat()}), 200

# ==================== AUTENTICACIÓN ====================

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

# ==================== DASHBOARD DATA ====================

@app.route('/api/dashboard', methods=['GET'])
@login_required
def get_dashboard():
    """Datos del dashboard con datos reales de la API"""
    try:
        # Obtener datos reales
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
                'tableData': []
            }), 200
        
        print(f"[API] Procesando {len(df)} registros...")
        
        # Calcular stats
        today = date.today()
        yesterday = today - timedelta(days=1)
        
        df['date'] = df['created_at'].dt.date
        today_data = df[df['date'] == today]
        yesterday_data = df[df['date'] == yesterday]
        
        today_weights = len(today_data)
        yesterday_weights = len(yesterday_data)
        weight_change = 0
        if yesterday_weights > 0:
            weight_change = round(((today_weights - yesterday_weights) / yesterday_weights) * 100, 1)
        
        # Chart data - últimos 7 días agregados
        chart_data = []
        for i in range(6, -1, -1):
            fecha = today - timedelta(days=i)
            day_data = df[df['date'] == fecha]
            
            chart_data.append({
                'fecha': fecha.strftime("%d %b"),
                'pesajes': len(day_data),
                'activas': day_data['scale_id'].nunique() if not day_data.empty else 0
            })
        
        # Volume 30d por báscula (para gráfico de líneas múltiples)
        volume_30d_data = []
        date_range_30d = pd.date_range(start=today - timedelta(days=29), end=today, freq='D')
        
        for scale_id in sorted(df['scale_id'].unique()):
            scale_df = df[df['scale_id'] == scale_id]
            data_points = []
            
            for fecha in date_range_30d:
                day_count = len(scale_df[scale_df['date'] == fecha.date()])
                data_points.append({
                    'fecha': fecha.strftime("%d %b"),
                    'registros': day_count
                })
            
            volume_30d_data.append({
                'scale_id': scale_id,
                'data': data_points,
                'total': len(scale_df)
            })
        
        # Heatmap data - registros por hora (últimas 48 horas)
        heatmap_data = []
        last_48h_df = df[(df['date'] == yesterday) | (df['date'] == today)].copy()
        
        if not last_48h_df.empty:
            last_48h_df['hour'] = last_48h_df['created_at'].dt.hour
            last_48h_df['day'] = last_48h_df['created_at'].dt.date
            
            for scale_id in sorted(last_48h_df['scale_id'].unique()):
                scale_hourly = []
                scale_df = last_48h_df[last_48h_df['scale_id'] == scale_id]
                
                # Ayer (horas 0-23)
                yesterday_df = scale_df[scale_df['day'] == yesterday]
                for hour in range(24):
                    count = len(yesterday_df[yesterday_df['hour'] == hour])
                    scale_hourly.append(count)
                
                # Hoy (horas 0-23)
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
        
        # Table data - básculas únicas
        table_data = []
        for scale_id in sorted(df['scale_id'].unique()):
            scale_df = df[df['scale_id'] == scale_id].sort_values('created_at')
            today_scale = scale_df[scale_df['date'] == today]
            
            if not scale_df.empty:
                last_weight = scale_df.iloc[-1]
                
                table_data.append({
                    'nombre': scale_id,
                    'estado': 'conectado' if not today_scale.empty else 'desconectado',
                    'ultimoPesaje': last_weight['created_at'].strftime('%H:%M') if pd.notna(last_weight['created_at']) else '-',
                    'totalHoy': len(today_scale),
                    'rfid': str(last_weight['epc']) if pd.notna(last_weight['epc']) and str(last_weight['epc']) != '0' else '-'
                })
        
        # Generar alertas simples
        alerts = []
        alert_id = 1
        
        for scale_id in df['scale_id'].unique():
            scale_data = df[df['scale_id'] == scale_id]
            last_record = scale_data['created_at'].max()
            hours_since = (pd.Timestamp.now() - last_record).total_seconds() / 3600
            
            if hours_since > 24:
                alerts.append({
                    'id': alert_id,
                    'severity': 'warning',
                    'title': f'Báscula {scale_id} sin actividad',
                    'message': f'Sin registros hace {int(hours_since)} horas',
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
            'tableData': table_data
        }
        
        return jsonify(result), 200
        
    except Exception as e:
        print(f"[ERROR] Error en /api/dashboard: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

@app.route('/api/kpis', methods=['GET'])
@login_required
def get_kpis():
    """KPIs del dashboard"""
    try:
        df = get_bascula_data()
        
        if df.empty:
            return jsonify({
                'activeScales': 0,
                'totalAnimals': 0,
                'recordsPerHour': 0,
                'activityTrend': 0,
                'scalesWithAlerts': 0
            }), 200
        
        # Calcular KPIs
        today = date.today()
        df['date'] = df['created_at'].dt.date
        today_data = df[df['date'] == today]
        
        # Registros por hora (promedio del día de hoy)
        if not today_data.empty:
            hours_elapsed = (datetime.now() - datetime.now().replace(hour=0, minute=0, second=0)).total_seconds() / 3600
            records_per_hour = len(today_data) / max(hours_elapsed, 1)
        else:
            records_per_hour = 0
        
        # Animales únicos (EPCs únicos del día)
        total_animals = today_data['epc'].nunique() if not today_data.empty else 0
        
        # Tendencia de actividad (comparación con ayer)
        yesterday = today - timedelta(days=1)
        yesterday_data = df[df['date'] == yesterday]
        
        if len(yesterday_data) > 0:
            activity_trend = round(((len(today_data) - len(yesterday_data)) / len(yesterday_data)) * 100, 1)
        else:
            activity_trend = 0
        
        # Básculas con alertas (inactivas > 24h)
        scales_with_alerts = 0
        for scale_id in df['scale_id'].unique():
            scale_data = df[df['scale_id'] == scale_id]
            last_record = scale_data['created_at'].max()
            hours_since = (pd.Timestamp.now() - last_record).total_seconds() / 3600
            if hours_since > 24:
                scales_with_alerts += 1
        
        kpis = {
            'activeScales': df['scale_id'].nunique(),
            'totalAnimals': int(total_animals),
            'recordsPerHour': round(records_per_hour, 1),
            'activityTrend': activity_trend,
            'scalesWithAlerts': scales_with_alerts
        }
        
        return jsonify(kpis), 200
        
    except Exception as e:
        print(f"[ERROR] Error en /api/kpis: {e}")
        import traceback
        traceback.print_exc()
        return jsonify({'error': str(e)}), 500

# ==================== MONITORING ====================

@app.route('/api/scales/monitoring', methods=['GET'])
def get_monitoring():
    """Estado de monitorización de todas las básculas"""
    # Si no está autenticado, devolver array vacío
    if not session.get('logged_in'):
        return jsonify([]), 200
    
    try:
        df = get_bascula_data()
        
        monitoring = []
        for scale_id in sorted(df['scale_id'].unique()):
            monitoring.append({
                'scale_id': scale_id,
                'enabled': True,  # Por defecto todas habilitadas
                'last_updated': datetime.now().isoformat()
            })
        
        return jsonify(monitoring), 200
        
    except Exception as e:
        print(f"[ERROR] Error en /api/scales/monitoring: {e}")
        return jsonify({'error': str(e)}), 500

@app.route('/api/scales/monitoring/<scale_id>', methods=['PUT'])
@login_required
def update_monitoring(scale_id):
    """Actualizar estado de monitorización de una báscula"""
    data = request.get_json()
    enabled = data.get('enabled', True)
    
    # En serverless no podemos persistir, solo retornamos confirmación
    return jsonify({
        'scale_id': scale_id,
        'enabled': enabled,
        'last_updated': datetime.now().isoformat()
    }), 200

@app.route('/api/remoteiot/status', methods=['GET'])
def get_remoteiot_status():
    """Estado de conexión RemoteIoT"""
    # Si no está autenticado, devolver objeto vacío
    if not session.get('logged_in'):
        return jsonify({}), 200
    
    try:
        df = get_bascula_data()
        
        status = {}
        for scale_id in df['scale_id'].unique():
            scale_data = df[df['scale_id'] == scale_id]
            last_record = scale_data['created_at'].max()
            hours_since = (pd.Timestamp.now() - last_record).total_seconds() / 3600
            
            # Conectado si hay registros en las últimas 2 horas
            status[scale_id] = 'conectado' if hours_since < 2 else 'desconectado'
        
        return jsonify(status), 200
        
    except Exception as e:
        print(f"[ERROR] Error en /api/remoteiot/status: {e}")
        return jsonify({'error': str(e)}), 500

# ==================== HANDLER PARA VERCEL ====================

# Vercel handler
def handler(event, context):
    """Handler para Vercel Serverless"""
    return app(event, context)
