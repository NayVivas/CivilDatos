FROM python:3.11-slim

WORKDIR /app

# El contexto de build es ./back, así que el código queda plano en /app
# (main.py, app.py, config.py, ...) y CMD puede usar "main:app".
COPY . .

RUN pip install --no-cache-dir fastapi uvicorn python-multipart pymupdf

EXPOSE 8000

CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
