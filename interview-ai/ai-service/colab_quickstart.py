# ═══════════════════════════════════════════════════
# COLAB QUICKSTART — Run each block as a separate cell
# ═══════════════════════════════════════════════════

# ───────────────────────────────────────────────────
# CELL 1: Install dependencies
# ───────────────────────────────────────────────────
"""
%%capture
!pip install -q \
  "fastapi==0.111.0" "uvicorn[standard]==0.30.1" \
  "langchain==0.2.16" "langchain-core==0.2.38" \
  "langchain-groq==0.1.9" "langchain-community==0.2.16" \
  "python-multipart==0.0.9" "pypdf2==3.0.1" \
  "openai-whisper==20231117" "pyngrok==7.2.0" \
  "python-dotenv==1.0.1" "httpx==0.27.0"

print("✅ All packages installed")
"""

# ───────────────────────────────────────────────────
# CELL 2: Upload interview_server.py or clone from GitHub
# ───────────────────────────────────────────────────
"""
# Option A – clone from your GitHub repo (recommended):
!git clone https://github.com/YOUR_USERNAME/interview-ai-service.git
%cd interview-ai-service

# Option B – if you uploaded interview_server.py manually via Colab sidebar:
# %cd /content
"""

# ───────────────────────────────────────────────────
# CELL 3: Set keys and start server
# ───────────────────────────────────────────────────
"""
import os, sys, time, threading, requests
import uvicorn
from pyngrok import ngrok

# Keys come from the environment / Colab Secrets (key icon in sidebar) — never paste them here
try:
    from google.colab import userdata
    GROQ_API_KEY = userdata.get("GROQ_API_KEY")
    NGROK_TOKEN  = userdata.get("NGROK_TOKEN")
except Exception:
    GROQ_API_KEY = os.getenv("GROQ_API_KEY", "")
    NGROK_TOKEN  = os.getenv("NGROK_TOKEN", "")

os.environ["GROQ_API_KEY"] = GROQ_API_KEY
ngrok.set_auth_token(NGROK_TOKEN)

def run_server():
    uvicorn.run("interview_server:app", host="0.0.0.0", port=8000,
                log_level="warning", reload=False)

t = threading.Thread(target=run_server, daemon=True)
t.start()

print("⏳ Starting server...", end="")
for _ in range(20):
    try:
        if requests.get("http://localhost:8000/health", timeout=2).status_code == 200:
            print(" ready!")
            break
    except Exception:
        print(".", end="", flush=True)
        time.sleep(1)

tunnel = ngrok.connect(8000)
URL = tunnel.public_url

print(f"\n{'='*60}")
print(f"✅  AI Service LIVE at: {URL}")
print(f"    Swagger docs:        {URL}/docs")
print(f"{'='*60}")
print(f"\n📋 Paste into Spring Boot application.properties:")
print(f"    ai.service.url={URL}")
print(f"\n📋 Paste into frontend .env.development:")
print(f"    VITE_AI_URL={URL}")

# Keep-alive
def keep_alive():
    while True:
        time.sleep(600)
        try: requests.get(f"{URL}/health", timeout=5)
        except: pass
threading.Thread(target=keep_alive, daemon=True).start()
print("\n♻️  Keep-alive active")
"""
