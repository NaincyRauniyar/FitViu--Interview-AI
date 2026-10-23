FROM python:3.11-slim

WORKDIR /app

# Install Python dependencies (cached layer)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Render sets PORT; default 8000 locally
EXPOSE 8000
CMD ["sh", "-c", "uvicorn interview_server:app --host 0.0.0.0 --port ${PORT:-8000} --workers 1 --timeout-keep-alive 30"]
