# -*- coding: utf-8 -*-
"""
API Serverless para Vercel
Adaptado del backend Flask para funcionar como funciones serverless
"""

import os
import json
from datetime import date, timedelta, datetime
from flask import Flask, jsonify, request, session
from flask_cors import CORS

# Crear app Flask
app = Flask(__name__)

# Configuración
app.config['SECRET_KEY'] = os.getenv('SECRET_KEY', 'vercel-secret-key-change-in-production')
app.config['SESSION_COOKIE_HTTPONLY'] = True
app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
app.config['SESSION_COOKIE_SECURE'] = True  # HTTPS en producción

# CORS
CORS(app, resources={
    r"/api/*": {
        "origins": "*",
        "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        "allow_headers": ["Content-Type", "Authorization"],
        "supports_credentials": True
    }
})

# Credenciales
ADMIN_USERNAME = os.getenv('ADMIN_USERNAME', 'admin')
ADMIN_PASSWORD = os.getenv('ADMIN_PASSWORD', 'admin')

# Decorador de autenticación
def login_required(f):
    from functools import wraps
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not session.get('logged_in'):
            return jsonify({'error': 'No autenticado', 'message': 'Debe iniciar sesión'}), 401
        return f(*args, **kwargs)
    return decorated_function

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
    """Datos del dashboard (DEMO MODE)"""
    
    # Generar datos para los últimos 30 días
    today = datetime.now()
    
    volume30d = []
    for i in range(30, 0, -1):
        day = today - timedelta(days=i)
        volume30d.append({
            'date': day.strftime('%Y-%m-%d'),
            'total': 120 + (i % 20),
            'B-001': 15 + (i % 5),
            'B-002': 12 + (i % 4),
            'B-003': 10 + (i % 3),
            'B-004': 18 + (i % 6),
            'B-005': 14 + (i % 4),
            'B-006': 16 + (i % 5),
            'B-007': 11 + (i % 3),
            'B-008': 13 + (i % 4),
        })
    
    # Datos de heatmap (día de semana vs hora)
    heatmap_data = []
    days = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom']
    for day_idx, day in enumerate(days):
        for hour in range(24):
            # Más actividad entre 8-18h, menos en fines de semana
            base_value = 10 if day_idx < 5 else 3
            peak_multiplier = 2 if 8 <= hour <= 18 else 0.3
            heatmap_data.append({
                'day': day,
                'hour': f'{hour:02d}:00',
                'value': int(base_value * peak_multiplier * (1 + (hour % 3) * 0.5))
            })
    
    # Datos de histograma de pesos
    histogram_data = []
    weight_ranges = [
        (300, 350), (350, 400), (400, 450), (450, 500),
        (500, 550), (550, 600), (600, 650), (650, 700),
        (700, 750), (750, 800)
    ]
    for min_w, max_w in weight_ranges:
        # Distribución normal centrada en 600kg
        center = 600
        distance = abs((min_w + max_w) / 2 - center)
        count = int(50 * (1 - distance / 300))
        if count > 0:
            histogram_data.append({
                'range': f'{min_w}-{max_w}',
                'count': count,
                'weight': (min_w + max_w) / 2
            })
    
    # Estructura que el frontend espera
    dashboard_data = {
        'activeScales': 8,
        'totalScales': 12,
        'todayWeights': 145,
        'weightChange': 12,
        'activeAlerts': 2,
        'alerts': [
            {
                'id': 1,
                'severity': 'warning',
                'title': 'Báscula B-003 sin actividad',
                'message': 'No se han registrado pesajes en las últimas 24 horas',
                'details': 'Última conexión: 25 Feb 2026 14:30',
            },
            {
                'id': 2,
                'severity': 'critical',
                'title': 'Conexión perdida',
                'message': 'Báscula B-007 no responde',
                'details': 'Error desde: 26 Feb 2026 08:15',
            },
        ],
        'chartData': [
            {'fecha': '22 Feb', 'pesajes': 120, 'activas': 10},
            {'fecha': '23 Feb', 'pesajes': 135, 'activas': 11},
            {'fecha': '24 Feb', 'pesajes': 128, 'activas': 10},
            {'fecha': '25 Feb', 'pesajes': 142, 'activas': 12},
            {'fecha': '26 Feb', 'pesajes': 145, 'activas': 11},
        ],
        'tableData': [
            {'nombre': 'B-001', 'estado': 'conectado', 'ultimoPesaje': '10:45', 'totalHoy': 18, 'rfid': 'A1B2C3'},
            {'nombre': 'B-002', 'estado': 'conectado', 'ultimoPesaje': '10:42', 'totalHoy': 15, 'rfid': 'D4E5F6'},
            {'nombre': 'B-003', 'estado': 'desconectado', 'ultimoPesaje': '08:20', 'totalHoy': 0, 'rfid': '-'},
            {'nombre': 'B-004', 'estado': 'conectado', 'ultimoPesaje': '10:40', 'totalHoy': 22, 'rfid': 'G7H8I9'},
            {'nombre': 'B-005', 'estado': 'conectado', 'ultimoPesaje': '10:38', 'totalHoy': 19, 'rfid': 'J1K2L3'},
            {'nombre': 'B-006', 'estado': 'conectado', 'ultimoPesaje': '10:35', 'totalHoy': 16, 'rfid': 'M4N5O6'},
            {'nombre': 'B-007', 'estado': 'desconectado', 'ultimoPesaje': '-', 'totalHoy': 0, 'rfid': '-'},
            {'nombre': 'B-008', 'estado': 'conectado', 'ultimoPesaje': '10:30', 'totalHoy': 21, 'rfid': 'P7Q8R9'},
        ],
        'volume30dData': volume30d,
        'heatmapData': heatmap_data,
        'histogramData': histogram_data,
    }
    
    return jsonify(dashboard_data), 200


@app.route('/api/kpis', methods=['GET'])
@login_required
def get_kpis():
    """KPIs del dashboard"""
    
    kpis = {
        'activeScales': 8,
        'totalAnimals': 142,
        'recordsPerHour': 12.5,
        'activityTrend': 8.3,
        'scalesWithAlerts': 2
    }
    
    return jsonify(kpis), 200


# ==================== MONITORING ====================

@app.route('/api/scales/monitoring', methods=['GET'])
@login_required
def get_monitoring():
    """Estado de monitorización de todas las básculas"""
    
    monitoring = [
        {
            'scale_id': f'B-{str(i).zfill(3)}',
            'enabled': i % 2 == 0,
            'last_updated': datetime.now().isoformat()
        }
        for i in range(1, 13)
    ]
    
    return jsonify(monitoring), 200


@app.route('/api/scales/monitoring/events', methods=['GET'])
@login_required
def monitoring_events():
    """
    NOTA: SSE no funciona en Vercel serverless.
    El frontend debe usar polling en su lugar.
    """
    return jsonify({
        'error': 'SSE no disponible en modo serverless',
        'message': 'Use polling con GET /api/scales/monitoring'
    }), 501


# ==================== REMOTEIOT ====================

@app.route('/api/remoteiot/status', methods=['GET'])
@login_required
def remoteiot_status():
    """Estado de RemoteIoT - Devuelve estado de conexión de cada báscula"""
    return jsonify({
        'B-001': 'conectado',
        'B-002': 'conectado',
        'B-003': 'desconectado',
        'B-004': 'conectado',
        'B-005': 'conectado',
        'B-006': 'conectado',
        'B-007': 'desconectado',
        'B-008': 'conectado',
    }), 200


# ==================== HEALTH ====================

@app.route('/api/health', methods=['GET'])
def health():
    """Health check"""
    return jsonify({
        'status': 'ok',
        'mode': 'serverless',
        'timestamp': datetime.now().isoformat()
    }), 200


# Para desarrollo local
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8050, debug=True)
