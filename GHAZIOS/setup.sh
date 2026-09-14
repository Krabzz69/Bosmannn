#!/bin/bash

# ============================================
# GHAZIOS - Quick Setup Script
# ============================================

echo ""
echo "🚀 ========================================"
echo "   GHAZIOS Multi-Tenant Platform Setup"
echo "🚀 ========================================"
echo ""

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Check Docker
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker not found! Install Docker first.${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker found${NC}"

# Check Docker Compose
if docker compose version &> /dev/null; then
    COMPOSE_CMD="docker compose"
elif command -v docker-compose &> /dev/null; then
    COMPOSE_CMD="docker-compose"
else
    echo -e "${RED}Docker Compose not found!${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Docker Compose found${NC}"
echo ""

# Create .env if not exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cp .env.example .env 2>/dev/null || cat > .env << 'EOF'
POSTGRES_PASSWORD=GhaziosSecure2024!
JWT_SECRET=GhaziosJWTSecret2024!
EOF
    echo -e "${GREEN}✓ .env created${NC}"
fi

# Create receipts folder
mkdir -p receipts

# Build and start
echo ""
echo -e "${YELLOW}Building and starting services...${NC}"
$COMPOSE_CMD up -d --build

echo ""
echo -e "${GREEN}✓ Setup complete!${NC}"
echo ""

# Get server IP
SERVER_IP=$(hostname -I | awk '{print $1}')

echo "🌐 Access URLs:"
echo "   Ordering: http://$SERVER_IP:7000"
echo "   POS:      http://$SERVER_IP:7000/pos"
echo "   Kitchen:  http://$SERVER_IP:7000/kitchen"
echo "   Admin:    http://$SERVER_IP:7000/admin"
echo ""
echo "🔐 Login: admin / admin123"
echo ""
echo "📊 Database: PostgreSQL on port 5433"
echo "🔧 Backend API: http://$SERVER_IP:4000"
echo ""
