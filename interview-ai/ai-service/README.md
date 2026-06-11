---
title: Interview AI Service
emoji: 🎤
colorFrom: indigo
colorTo: purple
sdk: docker
pinned: false
app_port: 7860
---

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
| POST | `/api/voice/transcribe` | Whisper speech-to-text |

## Setup

### HuggingFace Spaces (deploy)
1. Fork/push this folder to a GitHub repo
2. Create a new Space at huggingface.co/new-space — SDK: Docker
3. Connect your GitHub repo
4. Add secret: `GROQ_API_KEY` = your key from console.groq.com (free)
5. Build takes ~8 min first time

### Local / Colab (dev)
```bash
pip install -r requirements.txt
export GROQ_API_KEY=gsk_your_key_here
uvicorn interview_server:app --host 0.0.0.0 --port 8000
```

### Colab with ngrok
Open `colab_quickstart.ipynb` and run the 3 cells.
