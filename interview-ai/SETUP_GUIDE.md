# Interview AI — Setup Guide

This zip has **3 independent projects**. Each goes to its **own GitHub repo**
and gets deployed separately. Don't put them all in one repo.

```
interview-ai/
├── ai-service/    → GitHub repo #1 → HuggingFace Spaces (or run in Colab)
├── backend/       → GitHub repo #2 → Render (open in IntelliJ)
└── frontend/      → GitHub repo #3 → Vercel (open in VS Code / any editor)
```

---

## STEP 0 — Get free API keys (5 minutes)

1. **Groq** (LLM, free, no card): https://console.groq.com → API Keys → Create → copy `gsk_...`
2. **ngrok** (only needed for Colab dev, free): https://ngrok.com → Dashboard → copy your authtoken

---

## STEP 1 — Run the AI service (Colab — for development)

This is the part that was giving you import errors. The fix: **one single
file**, no `app.routers` folder needed.

1. Open https://colab.research.google.com → New notebook
2. **Upload `ai-service/interview_server.py`** to the Colab file sidebar
   (left panel → folder icon → upload file). It must sit at `/content/interview_server.py`.
3. **Cell 1** — paste and run:
   ```python
   !pip install -q "fastapi==0.111.0" "uvicorn[standard]==0.30.1" \
     "langchain==0.2.16" "langchain-core==0.2.38" \
     "langchain-groq==0.1.9" "langchain-community==0.2.16" \
     "python-multipart==0.0.9" "pypdf2==3.0.1" \
     "openai-whisper==20231117" "pyngrok==7.2.0" \
     "python-dotenv==1.0.1" "httpx==0.27.0"
   ```
4. **Cell 2** — paste, fill in your 2 keys, and run:
   ```python
   import os, time, threading, requests
   import uvicorn
   from pyngrok import ngrok

   GROQ_API_KEY = "gsk_xxxxxxxxxxxxxxxxxxxxxxxxxxxx"   # from console.groq.com
   NGROK_TOKEN  = "xxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"     # from ngrok.com/dashboard

   os.environ["GROQ_API_KEY"] = GROQ_API_KEY
   ngrok.set_auth_token(NGROK_TOKEN)

   def run_server():
       uvicorn.run("interview_server:app", host="0.0.0.0", port=8000,
                   log_level="warning", reload=False)

   threading.Thread(target=run_server, daemon=True).start()

   print("Starting...", end="")
   for _ in range(20):
       try:
           if requests.get("http://localhost:8000/health", timeout=2).status_code == 200:
               print(" ready!"); break
       except Exception:
           print(".", end="", flush=True); time.sleep(1)

   tunnel = ngrok.connect(8000)
   print(f"\n✅ AI Service URL: {tunnel.public_url}")
   print(f"   Swagger docs:   {tunnel.public_url}/docs")
   ```
5. Copy the printed URL (e.g. `https://abcd-1234.ngrok-free.app`). You'll
   paste this into Spring Boot and React in the next steps.

   **Why your earlier code failed:**
   - `from langchain.prompts import ...` → moved to `langchain_core.prompts`
     (already fixed in `interview_server.py`)
   - `from app.routers import ...` → that folder never existed in Colab.
     `interview_server.py` is a single file — no sub-imports needed.

   Keep this Colab tab open while you develop. The ngrok URL changes every
   time you restart, so you'll re-paste it when it changes.

---

## STEP 2 — Run the Spring Boot backend (IntelliJ)

1. Open IntelliJ → **Open** → select the `backend/` folder (it has `pom.xml`
   at its root — IntelliJ will detect it as a Maven project and download
   dependencies automatically).
2. Open `src/main/resources/application.properties`.
3. Update this line with your Colab ngrok URL from Step 1:
   ```properties
   ai.service.url=https://abcd-1234.ngrok-free.app
   ```
4. Run `InterviewAiApplication.java` (right-click → Run).
   - Uses an in-memory H2 database — nothing to install.
   - Starts on `http://localhost:8080`
   - H2 console (to inspect tables): `http://localhost:8080/h2-console`
     - JDBC URL: `jdbc:h2:mem:interviewdb`, user: `sa`, no password

5. **Email verification** (optional for local dev): if you don't want to set
   up Gmail SMTP yet, registration will fail at the "send email" step. To
   skip this temporarily, comment out this line in `AuthController.java`:
   ```java
   // verificationService.sendVerification(user);
   ```
   and manually set `enabled = true` when creating the user in
   `UserService.register()`. Re-enable both before deploying if you want
   real verification.

6. Test with Postman/curl:
   ```bash
   curl -X POST http://localhost:8080/api/auth/register \
     -H "Content-Type: application/json" \
     -d '{"name":"Test","email":"a@b.com","password":"password123"}'
   ```

---

## STEP 3 — Run the React frontend

1. Open `frontend/` folder in VS Code (or any editor) **or** just use a terminal.
2. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```
3. Open `.env.development` and update the AI URL with your ngrok URL:
   ```
   VITE_API_URL=http://localhost:8080
   VITE_AI_URL=https://abcd-1234.ngrok-free.app
   ```
4. **(Optional but recommended)** Download face-api.js models so the
   anti-cheat face detection works — see
   `public/models/DOWNLOAD_MODELS.md` for the 4-file download.
   The app works without them, just without face/gaze detection.
5. Start the dev server:
   ```bash
   npm run dev
   ```
6. Open `http://localhost:5173` — register, login, upload a resume PDF,
   start an interview.

---

## STEP 4 — Deploy everything (all free)

### 4a. Database — Supabase
1. https://supabase.com → New project (free tier)
2. Settings → Database → copy the **connection string** (use the
   "Connection pooling" / Transaction mode one, port 6543)

### 4b. AI service — HuggingFace Spaces
1. Create a **new GitHub repo** called `interview-ai-service`
2. Push only the contents of `ai-service/` to it:
   ```bash
   cd ai-service
   git init
   git add .
   git commit -m "initial commit"
   git branch -M main
   git remote add origin https://github.com/YOUR_USERNAME/interview-ai-service.git
   git push -u origin main
   ```
3. https://huggingface.co/new-space → SDK: **Docker** → Create
4. Space → Settings → link your GitHub repo (auto-deploys on push)
5. Space → Settings → Repository secrets → add `GROQ_API_KEY`
6. Wait ~8 min for first build. Your service is live at:
   `https://YOUR_USERNAME-interview-ai-service.hf.space`
7. Test: `curl https://YOUR_USERNAME-interview-ai-service.hf.space/health`

### 4c. Backend — Render
1. Create a **new GitHub repo** called `interview-ai-backend`, push `backend/`
2. https://render.com → New → Web Service → connect repo
3. Build command: `mvn clean package -DskipTests`
4. Start command: `java -jar target/*.jar`
5. Environment: Java 17
6. Add environment variables:
   ```
   SPRING_PROFILES_ACTIVE=prod
   DB_URL=jdbc:postgresql://...supabase.co:6543/postgres?pgbouncer=true&sslmode=require
   DB_USER=postgres
   DB_PASSWORD=your-supabase-password
   JWT_SECRET=some-random-32+-char-string
   AI_SERVICE_URL=https://YOUR_USERNAME-interview-ai-service.hf.space
   FRONTEND_URL=https://your-app.vercel.app
   MAIL_USERNAME=your-gmail@gmail.com
   MAIL_PASSWORD=your-16-char-gmail-app-password
   ```
7. Deploy. Your backend is live at `https://your-service.onrender.com`
   (free tier sleeps after 15 min idle — first request after sleep takes ~30s)

### 4d. Frontend — Vercel
1. Create a **new GitHub repo** called `interview-ai-frontend`, push `frontend/`
2. https://vercel.com → Add New Project → import repo (auto-detects Vite)
3. Settings → Environment Variables:
   ```
   VITE_API_URL=https://your-service.onrender.com
   VITE_AI_URL=https://YOUR_USERNAME-interview-ai-service.hf.space
   ```
4. Deploy. Live at `https://your-app.vercel.app`

---

## Quick troubleshooting

| Error | Fix |
|---|---|
| `No module named 'langchain.prompts'` | Already fixed — uses `langchain_core.prompts` |
| `No module named 'app'` | Already fixed — single-file `interview_server.py`, run as `interview_server:app` |
| CORS error in browser | Make sure Spring Boot is running and `ai.service.url` / `VITE_API_URL` are correct |
| `face-api.js` 404 | Download the 4 model files into `frontend/public/models/` (optional) |
| Gmail verification email fails | Use a Gmail **App Password** (not your normal password) — requires 2FA enabled |
| ngrok URL changed | Re-paste new URL into `application.properties` (`ai.service.url`) and `.env.development` (`VITE_AI_URL`), restart Spring Boot |
EOF

echo done