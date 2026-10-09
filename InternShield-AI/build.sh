#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Building InternShield AI for Production ==="

# Ensure Node.js and npm exist in PATH (crucial for Render Python runtime)
if ! command -v npm >/dev/null 2>&1; then
    echo "--> Node.js / npm not found in system PATH."
    echo "--> Installing portable Node.js LTS (v20) for production bundle build..."
    NODE_VERSION="v20.18.0"
    NODE_ARCH="linux-x64"
    if [ "$(uname -m)" = "aarch64" ] || [ "$(uname -m)" = "arm64" ]; then
        NODE_ARCH="linux-arm64"
    fi
    mkdir -p /tmp/nodejs
    curl -fsSL "https://nodejs.org/dist/${NODE_VERSION}/node-${NODE_VERSION}-${NODE_ARCH}.tar.xz" -o /tmp/node.tar.xz
    tar -xf /tmp/node.tar.xz -C /tmp/nodejs --strip-components=1
    rm -f /tmp/node.tar.xz
    export PATH="/tmp/nodejs/bin:$PATH"
    echo "--> Node $(node -v) and npm $(npm -v) successfully activated."
fi

# 1. Build React Frontend
echo "--> Installing frontend dependencies and building production bundle..."
cd frontend
npm install --include=dev
npm run build
cd ..

# 2. Setup Python Backend Dependencies
echo "--> Installing Python backend dependencies..."
cd backend
python -m pip install --upgrade pip
pip install -r requirements.txt

# 3. Pre-train & Benchmark Machine Learning Pipeline
echo "--> Verifying and pre-training ML scam classification pipeline..."
python train_model.py
cd ..

echo "=== InternShield AI Build Complete ==="

