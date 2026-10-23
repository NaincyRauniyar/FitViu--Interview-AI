# FitViu — AI Interview Practice

FitViu is a mock-interview platform. You upload your resume, and the AI asks interview questions tailored to it. You answer by typing or speaking. The AI scores each answer and gives you a coaching report at the end.

**Live:** https://fitviu.onrender.com

## Features
- **Resume parsing**: upload a PDF and the AI extracts your skills, projects and experience.
- **Personalised questions**: generated from your resume, and they adapt to how well you're answering.
- **Voice answers**: speech-to-text with Whisper.
- **Answer evaluation**: a score and feedback for every answer.
- **Coaching report**: a summary of strengths and weak spots after each interview.
- **Webcam presence check**: face detection in the browser while you answer.
- **Accounts and history**: sign up, log in, and look back at past sessions.

## Architecture

```
 Browser ──► frontend (React + Vite)          https://fitviu.onrender.com
               │
               ├──► backend (Spring Boot)     https://fitviu-backend.onrender.com
               │       auth (JWT), sessions, answers, database
               │       └──► ai-service
               │
               └──► ai-service (FastAPI)      https://fitviu-ai.onrender.com
                       LangChain + Groq (LLM + Whisper)
```

| Folder | Stack | What it does |
|---|---|---|
| `interview-ai/frontend` | React 18, Vite, React Router, face-api.js | UI, interview room, dashboard |
| `interview-ai/backend` | Java 17, Spring Boot 3, Spring Security, JPA | Accounts, login (JWT), interview sessions, stores answers, forwards calls to the AI service |
| `interview-ai/ai-service` | Python 3.11, FastAPI, LangChain, Groq | Resume parsing, question generation, answer evaluation, reports, speech-to-text |

## Running locally

1. Copy the keys into `interview-ai/.env`. This file is git-ignored, so never commit it.
   ```env
   GROQ_API_KEY=...          # console.groq.com
   GROQ_MODEL=openai/gpt-oss-20b
   JWT_SECRET=...            # any random string, 32+ chars
   AI_SERVICE_URL=http://host.docker.internal:8000
   APP_FRONTEND_URL=http://localhost:5173
   ```
2. Start the AI service and the backend with Docker, from `interview-ai/`:
   ```bash
   docker build -t fitviu-ai ai-service
   docker run -d -p 8000:8000 --env-file .env fitviu-ai

   docker build -t fitviu-backend backend
   docker run -d -p 8080:8080 --env-file .env fitviu-backend
   ```
3. Start the frontend:
   ```bash
   cd frontend && npm install && npm run dev   # http://localhost:5173
   ```

## Deployment (Render)

All three parts run on Render's free tier and redeploy automatically on every push to `main`.

| Service | Render type | Root directory | Environment variables |
|---|---|---|---|
| AI service | Web Service (Docker) | `interview-ai/ai-service` | `GROQ_API_KEY`, `GROQ_MODEL` |
| Backend | Web Service (Docker) | `interview-ai/backend` | `JWT_SECRET`, `AI_SERVICE_URL`, `APP_FRONTEND_URL` |
| Frontend | Static Site | `interview-ai/frontend` | `VITE_API_URL`, `VITE_AI_URL` |

Frontend build settings: build command `npm install && npm run build`, publish directory `dist`, and a rewrite rule `/*` → `/index.html`.

## Decisions and why we made them

**Render instead of Hugging Face Spaces.**
The plan was to host the AI service on Hugging Face, but Docker Spaces there are now paid. The free option (Gradio) can't run the Java backend either. Render runs all three parts for free, so everything lives in one place.

**Groq's hosted Whisper instead of a local Whisper model.**
Running Whisper locally pulls in PyTorch, which makes a very large image that needs more RAM than Render's free tier has, and the Docker build kept failing. Groq's Whisper API uses the same Groq key we already have. It's free on the current tier and accurate, and the AI service image dropped to about 500 MB.

**The LLM model is a setting (`GROQ_MODEL`), not hardcoded.**
The original model (`llama3-8b-8192`) was shut down by Groq, which broke every AI feature. We now default to `openai/gpt-oss-20b`, and the model can be changed with an environment variable without touching code.

**Login is required, but email verification is skipped.**
Users sign up and can log in straight away. Verification emails would need a Gmail app password and a mail setup, which isn't worth it at this stage. The verification code is still in the backend if we want it back.

**An in-memory database (H2) on the deployed backend.**
The free Render backend sleeps after inactivity and loses its data when it restarts, which means users have to register again. We decided that's acceptable for now. To keep data, point the backend at any Postgres database by setting `SPRING_DATASOURCE_URL` (`jdbc:postgresql://host:5432/db`), `SPRING_DATASOURCE_USERNAME` and `SPRING_DATASOURCE_PASSWORD`. No code change is needed, and this has been tested.

**Secrets only come from environment variables.**
No API keys, tokens or passwords are in the code. Locally they live in `interview-ai/.env`, which is git-ignored. On Render they're set as environment variables. Older commits contained a real Groq key and ngrok token. Both must be revoked, and the code no longer uses them.

## Known limitations
- Free Render services take about 30–60 seconds to wake up after 15 minutes without traffic.
- Accounts and interview history reset whenever the backend restarts (see the H2 decision above).
- The Groq free tier has rate limits, so heavy use can temporarily cause AI errors.
