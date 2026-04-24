# How to Deploy a Flask + Redis + Celery Stack via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Flask, Redis, Celery, Python, Docker Compose, Task Queue

Description: Deploy a Flask web application with Redis as a message broker and Celery for background task processing using Docker Compose through Portainer, with Flower for real-time task monitoring.

## Introduction

Flask is a lightweight Python web framework that pairs well with Celery and Redis for handling background tasks such as email sending, report generation, or data processing. Deploying this stack via Portainer gives you a web interface for managing all components - the Flask API, Redis broker, Celery workers, and Flower monitoring dashboard - from a single place.

## Prerequisites

- Portainer CE or BE with Docker Engine 20.10+
- Basic knowledge of Python, Flask, and task queues
- At least 512 MB of available RAM

## Step 1: Prepare the Flask Dockerfile

```dockerfile
# Dockerfile

FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application
COPY . .

# Non-root user for security
RUN useradd -m flaskuser && chown -R flaskuser /app
USER flaskuser

EXPOSE 5000
```

```text
# requirements.txt
Flask==3.0.2
celery==5.3.6
redis==5.0.1
flower==2.0.1
gunicorn==21.2.0
SQLAlchemy==2.0.27
psycopg2-binary==2.9.9
Flask-SQLAlchemy==3.1.1
python-dotenv==1.0.1
requests==2.31.0
```

Before deploying the stack in Portainer, build this image and push it to a registry that the Portainer host can pull from, then set `FLASK_IMAGE` to that published tag:

```bash
docker build -t ghcr.io/your-user/flask-app:latest .
docker push ghcr.io/your-user/flask-app:latest
```

## Step 2: Create the Docker Compose Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and name it `flask-celery-app`, then set `FLASK_IMAGE` to the image tag you built in Step 1:

```yaml
services:
  # Redis - message broker and result backend
  redis:
    image: redis:7-alpine
    container_name: flask-redis
    restart: unless-stopped
    command: redis-server --appendonly yes --maxmemory 256mb --maxmemory-policy allkeys-lru
    volumes:
      - redis_data:/data
    networks:
      - flask-net
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5

  # PostgreSQL for persistent data
  db:
    image: postgres:16-alpine
    container_name: flask-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-flaskdb}
      POSTGRES_USER: ${POSTGRES_USER:-flaskuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-flaskpassword}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - flask-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-flaskuser}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # Flask web application
  web:
    image: ${FLASK_IMAGE:-flask-app:latest}
    container_name: flask-web
    restart: unless-stopped
    command: gunicorn app:app --bind 0.0.0.0:5000 --workers 2 --threads 2
    environment:
      SECRET_KEY: ${SECRET_KEY:-change-this-secret}
      DATABASE_URL: postgresql://${POSTGRES_USER:-flaskuser}:${POSTGRES_PASSWORD:-flaskpassword}@db:5432/${POSTGRES_DB:-flaskdb}
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    ports:
      - "5000:5000"
    depends_on:
      redis:
        condition: service_healthy
      db:
        condition: service_healthy
    networks:
      - flask-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:5000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Celery worker - processes background tasks
  worker:
    image: ${FLASK_IMAGE:-flask-app:latest}
    container_name: flask-worker
    restart: unless-stopped
    command: celery -A app:celery worker --loglevel=info --concurrency=4 --queues=celery,email,reports
    environment:
      SECRET_KEY: ${SECRET_KEY:-change-this-secret}
      DATABASE_URL: postgresql://${POSTGRES_USER:-flaskuser}:${POSTGRES_PASSWORD:-flaskpassword}@db:5432/${POSTGRES_DB:-flaskdb}
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    depends_on:
      redis:
        condition: service_healthy
      db:
        condition: service_healthy
    networks:
      - flask-net

  # Celery Beat - scheduled tasks
  beat:
    image: ${FLASK_IMAGE:-flask-app:latest}
    container_name: flask-beat
    restart: unless-stopped
    command: celery -A app:celery beat --loglevel=info --scheduler celery.beat:PersistentScheduler --schedule /app/celerybeat-schedule/celerybeat-schedule
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
      DATABASE_URL: postgresql://${POSTGRES_USER:-flaskuser}:${POSTGRES_PASSWORD:-flaskpassword}@db:5432/${POSTGRES_DB:-flaskdb}
    volumes:
      - celery_beat_schedule:/app/celerybeat-schedule
    depends_on:
      redis:
        condition: service_healthy
      db:
        condition: service_healthy
    networks:
      - flask-net

  # Flower - Celery monitoring dashboard
  flower:
    image: mher/flower:2.0
    container_name: flask-flower
    restart: unless-stopped
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
      FLOWER_BASIC_AUTH: ${FLOWER_USER:-admin}:${FLOWER_PASSWORD:-flowerpassword}
    ports:
      - "5555:5555"
    depends_on:
      redis:
        condition: service_healthy
    networks:
      - flask-net

volumes:
  redis_data:
  postgres_data:
  celery_beat_schedule:

networks:
  flask-net:
    driver: bridge
```

## Step 3: Flask Application with Celery

```python
# app/__init__.py
from flask import Flask
from celery import Celery
from app.extensions import db

def create_app():
    app = Flask(__name__)
    app.config.from_object('app.config.Config')

    db.init_app(app)

    with app.app_context():
        db.create_all()

    from app.routes import main
    app.register_blueprint(main)

    return app

def make_celery(app=None):
    app = app or create_app()
    celery = Celery(
        app.import_name,
        broker=app.config['CELERY_BROKER_URL'],
        backend=app.config['CELERY_RESULT_BACKEND'],
        include=['app.tasks']
    )
    celery.conf.update(app.config)

    class ContextTask(celery.Task):
        def __call__(self, *args, **kwargs):
            with app.app_context():
                return self.run(*args, **kwargs)

    celery.Task = ContextTask
    return celery

# Entry point for both Flask and Celery
app = create_app()
celery = make_celery(app)
```

```python
# app/tasks.py - Celery tasks
from app import celery
from celery.utils.log import get_task_logger
import time

logger = get_task_logger(__name__)

@celery.task(bind=True, max_retries=3, queue='email')
def send_email_task(self, recipient, subject, body):
    """Background email sending task."""
    try:
        logger.info(f"Sending email to {recipient}")
        # Add your email sending logic here (smtplib, sendgrid, etc.)
        time.sleep(1)  # Simulate email sending
        logger.info(f"Email sent to {recipient}")
        return {'status': 'sent', 'recipient': recipient}
    except Exception as exc:
        logger.error(f"Email failed: {exc}")
        raise self.retry(exc=exc, countdown=60)

@celery.task(queue='reports')
def generate_report_task(report_id):
    """Long-running report generation task."""
    logger.info(f"Generating report {report_id}")
    time.sleep(5)  # Simulate report generation
    return {'report_id': report_id, 'status': 'complete'}
```

```python
# app/routes/__init__.py - Flask API routes
from flask import Blueprint, jsonify, request

main = Blueprint('main', __name__)

@main.route('/health')
def health():
    return jsonify({'status': 'ok'})

@main.route('/api/send-email', methods=['POST'])
def send_email():
    from app.tasks import send_email_task

    data = request.get_json()
    task = send_email_task.apply_async(
        args=[data['recipient'], data['subject'], data['body']],
        queue='email'
    )
    return jsonify({'task_id': task.id, 'status': 'queued'}), 202

@main.route('/api/tasks/<task_id>', methods=['GET'])
def get_task_status(task_id):
    from app import celery

    task = celery.AsyncResult(task_id)
    return jsonify({
        'task_id': task_id,
        'status': task.state,
        'result': task.result if task.ready() else None
    })
```

## Step 4: Monitor Tasks with Flower

```bash
# Access Flower dashboard at http://localhost:5555
# Login: admin / flowerpassword (from FLOWER_USER/FLOWER_PASSWORD env vars)

# Via CLI - check active tasks
docker exec flask-worker celery -A app:celery inspect active

# Check registered tasks
docker exec flask-worker celery -A app:celery inspect registered

# Check queue lengths
docker exec flask-redis redis-cli llen celery  # default queue

# Purge a queue (clear pending tasks)
docker exec flask-worker celery -A app:celery purge -Q email
```

## Step 5: Verify the Stack

```bash
# Check all containers are running
docker ps | grep flask

# Test health endpoint
curl http://localhost:5000/health

# Submit a background task
curl -X POST http://localhost:5000/api/send-email \
  -H "Content-Type: application/json" \
  -d '{"recipient":"user@example.com","subject":"Test","body":"Hello"}'

# Check task status (use the task_id from previous response)
curl http://localhost:5000/api/tasks/TASK-ID-HERE

# View worker logs
docker logs flask-worker -f

# View Flower dashboard for visual task monitoring
# Open http://localhost:5555 in your browser
```

## Conclusion

Deploying Flask with Redis and Celery via Portainer provides a complete asynchronous task processing stack with Flower for real-time monitoring of task queues, workers, and execution history. Separate queues (`celery`, `email`, `reports`) allow task routing and make it easier to split work across specialized workers for better isolation and priority control. Celery Beat handles scheduled tasks within the same infrastructure. For production, set strong passwords for both Flower and the Flask secret key, configure Celery's task soft and hard time limits to prevent runaway tasks, and monitor queue depths with Redis metrics to tune worker concurrency or add more worker services as needed.
