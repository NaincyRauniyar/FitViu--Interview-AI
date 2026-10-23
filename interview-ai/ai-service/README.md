# Interview AI — FastAPI Service

LangChain + Groq backend for the Interview AI platform.

## Endpoints
| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Health check |
| POST | `/api/resume/parse` | Parse PDF resume |
| POST | `/api/questions/generate` | Generate questions from resume |
| POST | `/api/questions/adaptive` | Get next adaptive question |
| DELETE | `/api/questions/session/{id}` | Clear session memory |
| POST | `/api/answers/evaluate` | Evaluate a candidate answer |
| POST | `/api/answers/report` | Generate coaching report |
| POST | `/api/voice/transcribe` | Speech-to-text (Groq Whisper API) |

## Setup

> **Note:** We moved deployment from Hugging Face Spaces to **Render**, because Docker Spaces on Hugging Face are no longer free.
> Speech-to-text now uses Groq's hosted Whisper API instead of a local Whisper model, so the service is light enough for Render's free tier.

### Render (deploy)
1. Render → **New → Web Service** → connect the GitHub repo
2. Root Directory: `interview-ai/ai-service` · Runtime: **Docker**
3. Environment variables: `GROQ_API_KEY` (from console.groq.com), optional `GROQ_MODEL` (default `openai/gpt-oss-20b`)

### Local (dev)
```bash
pip install -r requirements.txt
export GROQ_API_KEY=...   # or put it in interview-ai/.env
uvicorn interview_server:app --host 0.0.0.0 --port 8000
```

Or with Docker, from `interview-ai/`:
```bash
docker build -t fitviu-ai ai-service
docker run -p 8000:8000 --env-file .env fitviu-ai
```
