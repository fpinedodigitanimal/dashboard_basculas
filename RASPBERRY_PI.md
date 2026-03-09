# 🍓 Dashboard Básculas - Raspberry Pi

## Inicio Rápido

### 1️⃣ Clonar Proyecto
```bash
git clone <tu-repo>
cd <nombre-proyecto>
```

### 2️⃣ Copiar archivo .env
```bash
# Copia el archivo .env con el token DIGITANIMAL_TOKEN al directorio raíz
# Debe contener: DIGITANIMAL_TOKEN=tu_token_aqui
nano .env
```

### 3️⃣ Instalar Node.js (si no está instalado)
```bash
# Raspberry Pi OS 64-bit
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Instalar herramientas Python para venv
sudo apt install python3-venv python3-full

# Verificar instalación
node --version  # Debe ser v16+
npm --version
python3 --version
```

### 4️⃣ Deploy Automático
```bash
cd react-dashboard
chmod +x deploy-raspberry.sh
./deploy-raspberry.sh   # ⚠️ SIN sudo
```

### 5️⃣ Iniciar Dashboard
```bash
cd backend
./start.sh
```

✅ **Listo!** Abre `http://<raspberry-pi-ip>:8050`

---

## ⚙️ Configuración Avanzada

### Inicio Automático con systemd

```bash
# Instalar servicio
sudo cp /tmp/basculas-dashboard.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable basculas-dashboard
sudo systemctl start basculas-dashboard

# Ver estado
sudo systemctl status basculas-dashboard

# Ver logs en tiempo real
sudo journalctl -u basculas-dashboard -f
```

### Abrir Puerto en Firewall

```bash
sudo ufw allow 8050/tcp
sudo ufw status
```

---

## 🔧 Comandos Útiles

### Backend
```bash
# Iniciar manualmente
cd backend
source venv/bin/activate  # Activar venv
python api.py

# Ver base de datos
sqlite3 monitoring.db "SELECT * FROM scale_monitoring;"

# Limpiar base de datos
rm monitoring.db

# Reinstalar dependencias en venv
source venv/bin/activate
pip install -r requirements.txt
deactivate
```

### Servicio (si usas systemd)
```bash
# Iniciar
sudo systemctl start basculas-dashboard

# Detener
sudo systemctl stop basculas-dashboard

# Reiniciar
sudo systemctl restart basculas-dashboard

# Ver logs
sudo journalctl -u basculas-dashboard -n 50
```

### Encontrar IP de Raspberry Pi
```bash
hostname -I
# o
ip addr show
```

---

## 🐛 Troubleshooting

### ❌ "externally-managed-environment"
**Causa:** Raspberry Pi OS Bookworm+ requiere entornos virtuales

**Solución:**
El script ya maneja esto automáticamente creando un venv. Si ves este error:
```bash
# Asegúrate de tener python3-venv instalado
sudo apt install python3-venv python3-full

# Ejecuta el script de nuevo
./deploy-raspberry.sh
```

### ❌ "vite: Permission denied" o "EACCES: permission denied"
**Causa:** Ejecutaste `deploy-raspberry.sh` con sudo

**Solución:**
```bash
# NUNCA uses sudo para ejecutar el script
chmod +x deploy-raspberry.sh
./deploy-raspberry.sh   # Sin sudo

# Si ya instalaste con sudo, limpia node_modules
sudo rm -rf node_modules package-lock.json
npm install
./deploy-raspberry.sh
```

### "No module named 'flask'"
```bash
cd backend
pip3 install -r requirements.txt
```

### "Address already in use"
```bash
# Encontrar proceso
sudo lsof -i :8050

# Matar proceso
sudo kill -9 <PID>
```

### Frontend no carga (muestra JSON)
El build no se copió correctamente:
```bash
./deploy-raspberry.sh
sudo systemctl restart basculas-dashboard  # Si usas systemd
```

### SSE no conecta
```bash
# Verificar que backend está corriendo
sudo systemctl status basculas-dashboard

# Ver logs de errores
sudo journalctl -u basculas-dashboard -f

# Verificar firewall
sudo ufw status
```

### Performance lento en RPi 3
El build puede tardar. Opciones:
1. Hacer build en tu PC y copiar solo `backend/`:
   ```bash
   # En tu PC
   npm run build
   scp -r backend pi@<raspberry-ip>:~/
   ```
2. Usar Raspberry Pi 4/5 (mucho más rápido)

---

## 📊 Monitoreo

### Uso de CPU/RAM
```bash
htop
# o
top
```

### Logs del servicio
```bash
# Últimas 100 líneas
sudo journalctl -u basculas-dashboard -n 100

# Tiempo real
sudo journalctl -u basculas-dashboard -f

# Desde hoy
sudo journalctl -u basculas-dashboard --since today
```

### Estado de la base de datos
```bash
cd backend
sqlite3 monitoring.db

# SQL commands:
.tables                           # Listar tablas
.schema scale_monitoring          # Ver estructura
SELECT * FROM scale_monitoring;   # Ver datos
.quit                             # Salir
```

---

## 🔄 Actualizar Dashboard

Cuando hagas cambios en tu código:

```bash
# Opción 1: Build local + SCP
npm run build
scp -r backend/static backend/templates pi@<raspberry-ip>:~/react-dashboard/backend/

# Opción 2: Git pull + rebuild en RPi
ssh pi@<raspberry-ip>
cd react-dashboard
git pull
./deploy-raspberry.sh
sudo systemctl restart basculas-dashboard

# Opción 3: Solo código Python (sin rebuild frontend)
scp backend/*.py pi@<raspberry-ip>:~/react-dashboard/backend/
ssh pi@<raspberry-ip> "sudo systemctl restart basculas-dashboard"
```

---

## 🌐 Acceso Remoto

### Desde tu red local
```
http://<raspberry-pi-ip>:8050
```

### Desde internet (avanzado)

**⚠️ Advertencia de seguridad:** Exponer el dashboard a internet sin autenticación es peligroso.

Opciones seguras:
1. **VPN** (recomendado): WireGuard, OpenVPN
2. **Reverse Proxy con SSL**: nginx + Let's Encrypt + autenticación básica
3. **SSH Tunnel**: `ssh -L 8050:localhost:8050 pi@<raspberry-ip>`

---

## 📱 Acceso desde Móvil

Una vez funcionando en la red local:
- Abre navegador en tu móvil
- Navega a: `http://<raspberry-pi-ip>:8050`
- Opcional: Añade a "pantalla de inicio" para acceso rápido

---

## 💾 Backup

### Base de datos
```bash
# Backup
cp backend/monitoring.db backend/monitoring.db.backup

# Restaurar
cp backend/monitoring.db.backup backend/monitoring.db
sudo systemctl restart basculas-dashboard
```

### Configuración completa
```bash
# Backup
tar -czf dashboard-backup-$(date +%Y%m%d).tar.gz react-dashboard/

# Restaurar
tar -xzf dashboard-backup-20240101.tar.gz
```

---

## 🎯 Especificaciones Técnicas

- **Puerto:** 8050
- **Host:** 0.0.0.0 (todas las interfaces)
- **Base de datos:** SQLite (`backend/monitoring.db`)
- **Sincronización:** Server-Sent Events (SSE)
- **Persistencia:** ACID compliant (SQLite)
- **RAM requerida:** ~100-200 MB
- **CPU:** Funciona bien en RPi 3/4/5

---

Para documentación completa ver:
- [IMPLEMENTATION_GUIDE.md](./IMPLEMENTATION_GUIDE.md) - Guía de uso completa
- [MONITORING_ARCHITECTURE.md](./MONITORING_ARCHITECTURE.md) - Arquitectura técnica
