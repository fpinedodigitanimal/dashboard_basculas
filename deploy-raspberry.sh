#!/bin/bash
# Script de deployment para Raspberry Pi
# IMPORTANTE: NO ejecutar con sudo

# Verificar que NO se ejecuta con sudo
if [ "$EUID" -eq 0 ]; then 
    echo "❌ ERROR: NO ejecutes este script con sudo"
    echo "Ejecuta: chmod +x deploy-raspberry.sh && ./deploy-raspberry.sh"
    exit 1
fi

echo "🍓 Dashboard Básculas - Deployment para Raspberry Pi"
echo "===================================================="

# Colores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Verificar dependencias
echo -e "${YELLOW}Verificando dependencias...${NC}"
if ! command -v node &> /dev/null; then
    echo "❌ Node.js no está instalado. Instala con: sudo apt install nodejs npm"
    exit 1
fi

if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 no está instalado. Instala con: sudo apt install python3 python3-pip"
    exit 1
fi

# Instalar dependencias npm si es necesario
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Instalando dependencias npm...${NC}"
    npm install
fi

# 1. Build del frontend
echo -e "\n${YELLOW}[1/5]${NC} Building frontend..."
cd "$(dirname "$0")"
npm run build

if [ $? -ne 0 ]; then
    echo "❌ Error building frontend"
    exit 1
fi

# 2. Copiar build al backend
echo -e "\n${YELLOW}[2/5]${NC} Copying build to backend..."
rm -rf backend/static backend/templates
mkdir -p backend/static backend/templates

# Copiar archivos estáticos
cp -r dist/assets backend/static/
cp dist/index.html backend/templates/

echo -e "${GREEN}✓${NC} Build copied"

# 3. Crear entorno virtual y instalar dependencias Python
echo -e "\n${YELLOW}[3/5]${NC} Setting up Python virtual environment..."
cd backend

# Crear venv si no existe
if [ ! -d "venv" ]; then
    echo "Creating virtual environment..."
    python3 -m venv venv
    
    if [ $? -ne 0 ]; then
        echo "❌ Error creating virtual environment"
        echo "Instala python3-venv: sudo apt install python3-venv python3-full"
        exit 1
    fi
fi

# Activar venv e instalar dependencias
echo "Installing dependencies in venv..."
source venv/bin/activate
pip install --upgrade pip --quiet
pip install -r requirements.txt --quiet

if [ $? -ne 0 ]; then
    echo "❌ Error installing Python dependencies"
    deactivate
    exit 1
fi

deactivate
echo -e "${GREEN}✓${NC} Python virtual environment ready"

# Verificar archivo .env
if [ ! -f "../../.env" ]; then
    echo -e "${YELLOW}⚠${NC}  Archivo .env no encontrado en el proyecto raíz"
    echo "   El backend necesita el archivo .env con DIGITANIMAL_TOKEN"
    echo "   Copia el archivo .env al directorio raíz del proyecto"
fi

# 4. Crear servicio systemd (opcional)
echo -e "\n${YELLOW}[4/5]${NC} Creating systemd service..."

SERVICE_FILE="/tmp/basculas-dashboard.service"
cat > $SERVICE_FILE << EOF
[Unit]
Description=Dashboard Basculas
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=$(pwd)
ExecStart=$(pwd)/venv/bin/python $(pwd)/api.py
Restart=always
RestartSec=10
Environment="PORT=8050"

[Install]
WantedBy=multi-user.target
EOF

echo "Servicio creado en: $SERVICE_FILE"
echo "Para instalarlo ejecuta:"
echo "  sudo cp $SERVICE_FILE /etc/systemd/system/"
echo "  sudo systemctl daemon-reload"
echo "  sudo systemctl enable basculas-dashboard"
echo "  sudo systemctl start basculas-dashboard"

# 5. Crear script de inicio
echo -e "\n${YELLOW}[5/5]${NC} Creating start script..."

START_SCRIPT="start.sh"
cat > $START_SCRIPT << 'EOF'
#!/bin/bash
cd "$(dirname "$0")"

# Activar entorno virtual
if [ -d "venv" ]; then
    source venv/bin/activate
fi

export PORT=8050
echo "🚀 Starting Dashboard on port $PORT..."
python api.py
EOF

chmod +x $START_SCRIPT

echo -e "${GREEN}✓${NC} Start script created: backend/$START_SCRIPT"

# Resumen
echo ""
echo "===================================================="
echo -e "${GREEN}✅ Deployment completado!${NC}"
echo ""
echo "Para iniciar el servidor:"
echo "  cd backend"
echo "  ./start.sh"
echo ""
echo "El dashboard estará disponible en:"
echo "  http://localhost:8050"
echo "  http://<raspberry-pi-ip>:8050"
echo ""
echo "Para abrir puerto en el firewall:"
echo "  sudo ufw allow 8050/tcp"
echo ""
