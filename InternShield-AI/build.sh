#!/usr/bin/env bash
# Exit immediately if a command exits with a non-zero status
set -e

echo "=== Building InternShield AI for Production ==="

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

echo "=== InternShield AI Build Complete ==="
