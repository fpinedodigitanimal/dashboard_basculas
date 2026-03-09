# -*- coding: utf-8 -*-
"""
API Serverless para Vercel
Adaptado del backend Flask para funcionar como funciones serverless
"""

import os
import json
import random
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
    
    today = datetime.now()
    
    # Lista de básculas
    scale_ids = ['B-001', 'B-002', 'B-003', 'B-004', 'B-005', 'B-006', 'B-007', 'B-008']
    
    # ==== VOLUME30D DATA ====
    # Estructura: [{scale_id, total, data: [{fecha, registros}]}]
    volume30d_data = []
    for scale_id in scale_ids:
        daily_data = []
        total_registros = 0
        for i in range(30, 0, -1):
            day = today - timedelta(days=i)
            registros = 10 + (int(scale_id.split('-')[1]) + i) % 15
            total_registros += registros
            daily_data.append({
                'fecha': day.strftime('%d %b'),
                'registros': registros
            })
        
        volume30d_data.append({
            'scale_id': scale_id,
            'total': total_registros,
            'data': daily_data
        })
    
    # ==== HEATMAP DATA ====
    # Estructura: [{scale_id, hourly: [24 valores]}]
    heatmap_data = []
    for scale_id in scale_ids:
        # Generar 24 valores (uno por hora)
        hourly_values = []
        for hour in range(24):
            # Más actividad entre 8-18h
            base_value = 15 if 8 <= hour <= 18 else 3
            value = base_value + random.randint(-5, 5)
            hourly_values.append(max(0, value))
        
        heatmap_data.append({
            'scale_id': scale_id,
            'hourly': hourly_values
        })
    
    # ==== HISTOGRAM DATA ====
    # Estructura: [{scale_id, weights: [array de pesos]}]
    histogram_data = []
    for scale_id in scale_ids:
        # Generar array de pesos con distribución normal centrada en 600kg
        weights = []
        num_weights = 50 + random.randint(-10, 10)
        for _ in range(num_weights):
            # Distribución normal: media=600, desv_std=80
            weight = random.gauss(600, 80)
            # Limitar entre 300-900kg
            weight = max(300, min(900, weight))
            weights.append(round(weight, 1))
        
        histogram_data.append({
            'scale_id': scale_id,
            'weights': weights
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
        'volume30dData': volume30d_data,
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
