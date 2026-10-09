# Deploying InternShield AI on Render 🚀

This repository is pre-configured to deploy seamlessly to **Render** as a unified fullstack web service (FastAPI Backend + React SPA Frontend + In-House Scikit-Learn ML Model) under Render's **Free Tier**.

---

## ⚡ Quick Start: 3 Deployment Options

You can deploy using any of the following 3 methods:

### Method 1: Using Render Blueprint (`render.yaml`) — Recommended (1-Click)

Render Blueprints automate service configuration using the repository's [`render.yaml`](render.yaml).

1. Push your latest code to your GitHub repository:
   ```bash
   git add .
   git commit -m "Configure production deployment for Render"
   git push origin main
   ```
2. Go to the [Render Dashboard](https://dashboard.render.com/).
3. Click **New +** in the top right and select **Blueprint**.
4. Connect your GitHub repository (`internshield-ai`).
5. Render will automatically detect [`render.yaml`](render.yaml) and configure:
   - **Service Name**: `internshield-ai`
   - **Runtime**: `Python`
   - **Build Command**: `bash build.sh`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Health Check Path**: `/api/health`
   - **Plan**: `Free`
6. Click **Apply**.
7. Wait 2–3 minutes for the build to finish. Once live, Render will provide your public URL:
   `https://internshield-ai.onrender.com`

---

### Method 2: Manual Web Service (Native Python)

If you prefer to configure manually via the Render UI:

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select **Build and deploy from a Git repository** and connect your repo.
3. Configure the following settings:
   - **Name**: `internshield-ai`
   - **Region**: Oregon (or closest to your users)
   - **Branch**: `main`
   - **Root Directory**: *(leave blank)*
   - **Runtime**: `Python 3`
   - **Build Command**: `bash build.sh`
   - **Start Command**: `cd backend && uvicorn main:app --host 0.0.0.0 --port $PORT`
   - **Instance Type**: `Free`
4. Expand **Advanced**:
   - **Health Check Path**: `/api/health`
5. Click **Create Web Service**.

---

### Method 3: Docker Deployment (`Dockerfile`)

Render also natively supports multi-stage Docker builds using the included [`Dockerfile`](Dockerfile).

1. In Render Dashboard, click **New +** -> **Web Service**.
2. Select your repository.
3. Choose **Docker** as the Runtime.
4. Select the **Free** instance type.
5. In **Advanced**, set **Health Check Path** to `/api/health`.
6. Click **Create Web Service**.
   Render will automatically build Stage 1 (Node.js builds React Vite UI) and Stage 2 (Python 3.10 slim runs FastAPI and pre-trains ML model).

---

## ⚙️ Environment Variables (Optional)

Configure these in Render's **Environment** tab if you want to use Google OAuth features in production:

| Variable | Description | Example / Default |
| :--- | :--- | :--- |
| `FRONTEND_URL` | Base frontend URL for OAuth redirects | `https://internshield-ai.onrender.com` (defaults to `/`) |
| `GMAIL_REDIRECT_URI` | Google OAuth redirect URI | `https://internshield-ai.onrender.com/api/auth/gmail/callback` |
| `GOOGLE_CLIENT_SECRET_JSON` | Content of `client_secret.json` for Gmail API | Paste raw JSON contents directly |

> [!NOTE]
> All core features (Universal Scanner, 10,000-sample ML Scam Classifier, MCA CIN / GSTIN Company Verification, Recruiter Credibility Engine, Cybercrime FIR Generator, Video Interview Checklist, and Multi-Sheet Excel Reports) work **100% out of the box with zero external API keys or paid services**.

---

## 🔍 Verification After Deployment

Once the build finishes:
1. Open `https://<your-service-name>.onrender.com/` in your browser. The InternShield AI Cyber-Defense dashboard should load immediately.
2. Verify API health: `https://<your-service-name>.onrender.com/api/health` should return:
   ```json
   {
     "status": "ok",
     "name": "InternShield AI",
     "version": "0.3.0",
     "ml_model_loaded": true
   }
   ```
3. Test the **Universal Scanner** with sample text to ensure the local Scikit-Learn model is scoring offers in real time.
4. Click **Export Excel** in the header to ensure report generation functions correctly.
