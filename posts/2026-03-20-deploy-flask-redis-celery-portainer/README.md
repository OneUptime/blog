# How to Deploy a Flask + Redis + Celery Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Flask, Redis, Celery, Python, Docker Compose, Task Queue

Description: Learn how to deploy a Flask web application with Redis and Celery for background task processing via Portainer, with separate worker and scheduler containers.

---

Flask + Redis + Celery is the go-to Python stack for web applications that need background task processing (email sending, report generation, data processing). Portainer manages all four services together.

## Compose Stack

```yaml
version: "3.8"

services:
  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data
    command: redis-server --appendonly yes   # Persist queue data to disk

  flask:
    image: python:3.12-slim
    restart: unless-stopped
    depends_on:
      - redis
    ports:
      - "5000:5000"
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
      FLASK_SECRET_KEY: changeme-random-secret
    volumes:
      - ./app:/app
    working_dir: /app
    command: sh -c "pip install -r requirements.txt && gunicorn -w 4 -b 0.0.0.0:5000 app:app"

  celery-worker:
    image: python:3.12-slim
    restart: unless-stopped
    depends_on:
      - redis
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    volumes:
      - ./app:/app
    working_dir: /app
    # Start a Celery worker consuming from the default queue
    command: sh -c "pip install -r requirements.txt && celery -A app.celery worker --loglevel=info"

  celery-beat:
    image: python:3.12-slim
    restart: unless-stopped
    depends_on:
      - redis
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
    volumes:
      - ./app:/app
    working_dir: /app
    # Celery Beat schedules periodic tasks
    command: sh -c "pip install -r requirements.txt && celery -A app.celery beat --loglevel=info"

volumes:
  redis_data:
```

## Flask Application with Celery

```python
# app/app.py

from flask import Flask, jsonify
from celery import Celery
import os

app = Flask(__name__)

# Configure Celery to use Redis
celery = Celery(
    app.name,
    broker=os.environ['CELERY_BROKER_URL'],
    backend=os.environ['CELERY_RESULT_BACKEND'],
)

@celery.task
def send_email(to: str, subject: str) -> dict:
    """Background task to send an email."""
    # Email sending logic here
    return {'status': 'sent', 'to': to}

@app.route('/send-email', methods=['POST'])
def queue_email():
    # Queue the task - returns immediately
    task = send_email.delay('user@example.com', 'Welcome!')
    return jsonify({'task_id': task.id, 'status': 'queued'})

@app.route('/health')
def health():
    return jsonify({'status': 'ok'})
```

## Monitoring

Use OneUptime to monitor `http://<host>:5000/health`. Also monitor the Celery worker by checking its container status in Portainer - a crashed worker means background tasks are not being processed.
