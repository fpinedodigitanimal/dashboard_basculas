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
    
    # Datos de ejemplo
    mock_data = {
        'date': request.args.get('date', date.today().isoformat()),
        'summary': {
            'total_weights': 145,
            'active_scales': 8,
            'avg_weight': 652.3,
            'total_animals': 142
        },
        'scales': [
            {
                'id': f'B-{str(i).zfill(3)}',
                'name': f'Báscula {i}',
                'status': 'active' if i % 3 != 0 else 'inactive',
                'last_weight': 650 + (i * 10),
                'weights_today': 15 + i,
                'last_activity': (datetime.now() - timedelta(hours=i)).isoformat()
            }
            for i in range(1, 13)
        ],
        'recent_weights': [
            {
                'timestamp': (datetime.now() - timedelta(minutes=i*5)).isoformat(),
                'scale_id': f'B-{str((i % 12) + 1).zfill(3)}',
                'weight': 600 + (i * 15),
                'epc': f'EPC{str(1000 + i)}'
            }
            for i in range(20)
        ]
    }
    
    return jsonify(mock_data), 200


@app.route('/api/kpis', methods=['GET'])
@login_required
def get_kpis():
    """KPIs del dashboard"""
    
    kpis = {
        'activeScales': 8,
        'totalScales': 12,
        'todayWeights': 145,
        'weightChange': 12,
        'activeAlerts': 2
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
    """Estado de RemoteIoT"""
    return jsonify({
        'status': 'demo',
        'message': 'Modo DEMO - RemoteIoT no disponible'
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


# ==================== VERCEL HANDLER ====================

# Esta es la función que Vercel llamará para cada request
def handler(request):
    """
    Handler para Vercel Serverless Functions
    """
    with app.request_context(request.environ):
        try:
            response = app.full_dispatch_request()
        except Exception as e:
            response = jsonify({
                'error': 'Internal Server Error',
                'message': str(e)
            }), 500
        
        return response


# Para desarrollo local
if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8050, debug=True)
