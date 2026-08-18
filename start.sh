#!/bin/bash
set -e

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

export PATH="$DIR/.tools/node/bin:$DIR/.tools/mongodb_pkg/bin:$PATH"

echo "=================================================="
echo " Starting Full-Stack Application on Localhost"
echo "=================================================="

# 1. Start MongoDB
mkdir -p "$DIR/.tools/mongodb/data" "$DIR/.tools/logs"
if lsof -i :27017 >/dev/null 2>&1; then
    echo "✓ MongoDB is already running on port 27017"
else
    echo "▶ Starting MongoDB..."
    "$DIR/.tools/mongodb_pkg/bin/mongod" --dbpath "$DIR/.tools/mongodb/data" --port 27017 --logpath "$DIR/.tools/logs/mongodb.log" --fork
    echo "✓ MongoDB started on port 27017"
fi

# 2. Start Backend
if lsof -i :8000 >/dev/null 2>&1; then
    echo "✓ Backend is already running on port 8000"
else
    echo "▶ Starting Backend (FastAPI on port 8000)..."
    cd "$DIR/backend"
    nohup "$DIR/backend/venv/bin/uvicorn" server:app --host 127.0.0.1 --port 8000 --reload > "$DIR/.tools/logs/backend.log" 2>&1 &
    BACKEND_PID=$!
    echo $BACKEND_PID > "$DIR/.tools/logs/backend.pid"
    cd "$DIR"
    echo "✓ Backend started (PID: $BACKEND_PID, Log: .tools/logs/backend.log)"
fi

# 3. Start Frontend
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✓ Frontend is already running on port 3000"
else
    echo "▶ Starting Frontend (React on port 3000)..."
    cd "$DIR/frontend"
    BROWSER=none nohup "$DIR/.tools/node/bin/yarn" start > "$DIR/.tools/logs/frontend.log" 2>&1 &
    FRONTEND_PID=$!
    echo $FRONTEND_PID > "$DIR/.tools/logs/frontend.pid"
    cd "$DIR"
    echo "✓ Frontend started (PID: $FRONTEND_PID, Log: .tools/logs/frontend.log)"
fi

echo ""
echo "=================================================="
echo " Services are running:"
echo " - Frontend: http://localhost:3000"
echo " - Backend:  http://localhost:8000 (API: http://localhost:8000/api)"
echo " - MongoDB:  mongodb://127.0.0.1:27017"
echo ""
echo " Default Admin Credentials:"
echo " - Email:    coconutwater2911@gmail.com"
echo " - Password: admin123"
echo "=================================================="
