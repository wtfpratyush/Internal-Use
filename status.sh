#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd "$DIR"

echo "=================================================="
echo " Service Status Check"
echo "=================================================="

# Check MongoDB
if lsof -i :27017 >/dev/null 2>&1; then
    echo "✓ MongoDB:  RUNNING (port 27017)"
else
    echo "✗ MongoDB:  STOPPED"
fi

# Check Backend
if lsof -i :8000 >/dev/null 2>&1; then
    echo "✓ Backend:  RUNNING (port 8000)"
else
    echo "✗ Backend:  STOPPED"
fi

# Check Frontend
if lsof -i :3000 >/dev/null 2>&1; then
    echo "✓ Frontend: RUNNING (port 3000)"
else
    echo "✗ Frontend: STOPPED"
fi

echo "=================================================="
