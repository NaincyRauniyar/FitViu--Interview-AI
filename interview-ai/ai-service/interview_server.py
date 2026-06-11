# ══════════════════════════════════════════════════════════════
#  Interview AI — Complete FastAPI Server
#  Single file, Colab-compatible, all routes included.
#  Uses langchain_core (LangChain 0.2+)
# ══════════════════════════════════════════════════════════════

import os, json, io, tempfile
from fastapi import FastAPI, UploadFile, File, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
import PyPDF2

# ── App setup ─────────────────────────────────────────────────
app = FastAPI(title="Interview AI Service", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── LLMs (Groq — free tier) ───────────────────────────────────
_key = os.getenv("GROQ_API_KEY", "")
if not _key:
    print("⚠️  GROQ_API_KEY not set — set it before starting")

llm = ChatGroq(
    groq_api_key=_key,
    model_name="llama3-8b-8192",
    temperature=0.7,
    max_tokens=1500,
)
llm_eval = ChatGroq(
    groq_api_key=_key,
    model_name="llama3-8b-8192",
    temperature=0.2,
    max_tokens=800,
)

# ── Adaptive session memory ────────────────────────────────────
_session_memory: dict[str, list[str]] = {}

# ── Whisper (lazy-load on first call) ─────────────────────────
_whisper_model = None

def get_whisper():
    global _whisper_model
    if _whisper_model is None:
        import whisper
        print("⏳ Loading Whisper base model (one-time, ~30s)...")
        _whisper_model = whisper.load_model("base")
        print("✅ Whisper ready")
    return _whisper_model

# ── JSON cleaner helper ────────────────────────────────────────
def clean_json(text: str) -> str:
    """Strip markdown fences and extract JSON from AI response."""
    t = text.strip()
    # Remove ```json ... ``` or ``` ... ```
    t = t.strip("```json").strip("```").strip()
    # Extract array
    if t.startswith("["):
        try:
            end = t.rindex("]")
            return t[:end+1]
        except ValueError:
            pass
    # Extract object
    if "{" in t:
        try:
            start = t.index("{")
            end   = t.rindex("}")
            return t[start:end+1]
        except ValueError:
            pass
    return t


# ══════════════════════════════════════════════════════════════
#  HEALTH
# ══════════════════════════════════════════════════════════════
@app.get("/health")
def health():
    return {"status": "ok", "model": "llama3-8b-8192", "version": "1.0.0"}


# ══════════════════════════════════════════════════════════════
#  RESUME PARSER
# ══════════════════════════════════════════════════════════════
_PARSE_PROMPT = ChatPromptTemplate.from_template("""
Extract structured information from this resume.
Return ONLY valid JSON. No markdown. No explanation. Start with {{ and end with }}.

{{
  "name": "full name",
  "role": "most recent job title or desired role",
  "skills": ["skill1", "skill2", "skill3"],
  "experience_years": 0,
  "companies": ["company1", "company2"],
  "education": "highest degree and university",
  "projects": ["one-line project summary 1", "summary 2"]
}}

Resume:
{text}
""")

@app.post("/api/resume/parse")
async def parse_resume(file: UploadFile = File(...)):
    try:
        content = await file.read()
        reader  = PyPDF2.PdfReader(io.BytesIO(content))
        text    = "\n".join(p.extract_text() or "" for p in reader.pages)
        if not text.strip():
            raise HTTPException(400, "Could not extract text. Make sure PDF is not image-only.")
        result = (_PARSE_PROMPT | llm).invoke({"text": text[:4000]})
        try:
            structured = json.loads(clean_json(result.content))
        except json.JSONDecodeError:
            structured = {}
        return {"raw_text": text, "structured": structured}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(500, f"Parse error: {e}")


# ══════════════════════════════════════════════════════════════
#  QUESTION GENERATOR
# ══════════════════════════════════════════════════════════════
class QuestionRequest(BaseModel):
    resume_text: str
    num_questions: int = 10
    history: list[str] = []

_Q_PROMPT = ChatPromptTemplate.from_template("""
You are an expert technical interviewer. Based on this resume, generate exactly {num} interview questions.
Cover: technical skills mentioned, project experience, behavioral situations, and problem-solving.
Do NOT repeat these already-asked questions: {history}

Resume:
{resume}

Return ONLY a valid JSON array. No markdown. No explanation. Start with [ and end with ].
[
  {{"id": 1, "question": "...", "category": "technical", "difficulty": "medium"}},
  {{"id": 2, "question": "...", "category": "behavioral", "difficulty": "easy"}}
]
Valid categories: technical, behavioral, problem-solving
Valid difficulties: easy, medium, hard
""")

@app.post("/api/questions/generate")
async def generate_questions(req: QuestionRequest):
    try:
        result = (_Q_PROMPT | llm).invoke({
            "resume":   req.resume_text[:4000],
            "num":      req.num_questions,
            "history":  "\n".join(req.history) if req.history else "None yet",
        })
        questions = json.loads(clean_json(result.content))
        if not isinstance(questions, list):
            raise ValueError("Expected a JSON array")
        return {"questions": questions}
    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(500, f"AI returned invalid JSON. Error: {e}. Raw: {result.content[:200]}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ══════════════════════════════════════════════════════════════
#  ADAPTIVE QUESTION
# ══════════════════════════════════════════════════════════════
class AdaptiveRequest(BaseModel):
    session_id: str
    last_score: float = 5.0
    skills: list[str] = []
    covered: list[str] = []

_ADAPT_PROMPT = ChatPromptTemplate.from_template("""
You are an adaptive technical interviewer. Generate the next interview question.

Candidate's last answer score: {last_score}/10
Difficulty rule:
  - Score 7-10 → harder (edge cases, system design, trade-offs)
  - Score 4-6  → same difficulty
  - Score 0-3  → easier (foundational concept)

Candidate's skills: {skills}
Topics already covered (do not repeat): {covered}
Recent history: {history}

Return ONLY valid JSON. No markdown. Start with {{.
{{"question": "...", "category": "technical|behavioral|problem-solving", "difficulty": "easy|medium|hard", "reasoning": "one line why this question"}}
""")

@app.post("/api/questions/adaptive")
async def adaptive_question(req: AdaptiveRequest):
    try:
        history = _session_memory.get(req.session_id, [])
        result  = (_ADAPT_PROMPT | llm).invoke({
            "last_score": req.last_score,
            "skills":     ", ".join(req.skills) if req.skills else "general software engineering",
            "covered":    "\n".join(req.covered[-10:]) if req.covered else "None yet",
            "history":    "\n".join(history[-8:]) if history else "None yet",
        })
        parsed = json.loads(clean_json(result.content))
        _session_memory.setdefault(req.session_id, []).append(f"Asked: {parsed['question']}")
        return parsed
    except (json.JSONDecodeError, KeyError) as e:
        raise HTTPException(500, f"AI returned invalid JSON: {e}. Raw: {result.content[:200]}")
    except Exception as e:
        raise HTTPException(500, str(e))

@app.delete("/api/questions/session/{session_id}")
def clear_session_memory(session_id: str):
    _session_memory.pop(session_id, None)
    return {"cleared": session_id}


# ══════════════════════════════════════════════════════════════
#  ANSWER EVALUATOR
# ══════════════════════════════════════════════════════════════
class EvalRequest(BaseModel):
    question: str
    answer: str
    role: str = "Software Engineer"

_EVAL_PROMPT = ChatPromptTemplate.from_template("""
You are a strict but fair technical interviewer evaluating a candidate's answer.

Question: {question}
Candidate's answer: {answer}
Job role: {role}

Return ONLY valid JSON. No markdown. Start with {{.
{{
  "overall_score": <integer 0-10>,
  "technical_accuracy": <integer 0-10>,
  "communication": <integer 0-10>,
  "completeness": <integer 0-10>,
  "feedback": "2-3 sentences of specific, actionable feedback",
  "ideal_answer_hints": "what the ideal answer would cover in 1-2 sentences",
  "keywords_used": ["keyword1"],
  "missing_keywords": ["missing1"],
  "next_difficulty": "easier|same|harder"
}}
""")

@app.post("/api/answers/evaluate")
async def evaluate_answer(req: EvalRequest):
    try:
        result = (_EVAL_PROMPT | llm_eval).invoke({
            "question": req.question,
            "answer":   req.answer or "(no answer provided)",
            "role":     req.role,
        })
        return json.loads(clean_json(result.content))
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"AI returned invalid JSON: {e}. Raw: {result.content[:200]}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ══════════════════════════════════════════════════════════════
#  COACHING REPORT
# ══════════════════════════════════════════════════════════════
class ReportRequest(BaseModel):
    qa_pairs: list[dict]

_REPORT_PROMPT = ChatPromptTemplate.from_template("""
You are a professional interview coach. Analyse these Q&A pairs from a mock interview.

{qa_pairs}

Return ONLY valid JSON. No markdown. Start with {{.
{{
  "overall_grade": "A+|A|B+|B|C+|C|D",
  "summary": "2-3 sentence overall performance summary",
  "strengths": ["specific strength 1", "strength 2", "strength 3"],
  "improvements": ["specific area to improve 1", "area 2"],
  "recommended_topics": ["topic to study 1", "topic 2", "topic 3"],
  "readiness_score": <integer 0-100>,
  "next_steps": ["concrete action 1", "concrete action 2"]
}}
""")

@app.post("/api/answers/report")
async def generate_report(req: ReportRequest):
    try:
        pairs_str = "\n\n".join(
            f"Q{i+1}: {p.get('question', '')}\n"
            f"Answer: {p.get('answer', '')}\n"
            f"Score: {p.get('score', p.get('overall_score', 0))}/10\n"
            f"Feedback: {p.get('feedback', '')}"
            for i, p in enumerate(req.qa_pairs)
        )
        result = (_REPORT_PROMPT | llm).invoke({"qa_pairs": pairs_str})
        return json.loads(clean_json(result.content))
    except json.JSONDecodeError as e:
        raise HTTPException(500, f"AI returned invalid JSON: {e}. Raw: {result.content[:200]}")
    except Exception as e:
        raise HTTPException(500, str(e))


# ══════════════════════════════════════════════════════════════
#  VOICE — Whisper STT
# ══════════════════════════════════════════════════════════════
@app.post("/api/voice/transcribe")
async def transcribe_audio(audio: UploadFile = File(...)):
    try:
        model = get_whisper()
        data  = await audio.read()
        with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as f:
            f.write(data)
            tmp = f.name
        result = model.transcribe(tmp)
        os.unlink(tmp)
        return {"text": result["text"].strip(), "language": result["language"]}
    except Exception as e:
        raise HTTPException(500, f"Transcription failed: {e}")
