# How to Set Up a FastAPI + PostgreSQL + Celery Stack with Docker Compose

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Compose, FastAPI, PostgreSQL, Celery, Python, Redis, Async

Description: Step-by-step guide to building a FastAPI application with PostgreSQL, Celery workers, and Redis broker using Docker Compose.

---

FastAPI has become one of the most popular Python web frameworks thanks to its speed, async support, and automatic API documentation. Pairing it with PostgreSQL for data persistence and Celery for background task processing gives you a powerful stack for building production applications. Docker Compose makes it straightforward to run all these services together.

This tutorial walks through setting up the full stack from scratch. You will have FastAPI serving HTTP requests, PostgreSQL storing data, Redis acting as a message broker, and Celery processing background tasks.

## Architecture Overview

```mermaid
graph LR
    Client --> FastAPI
    FastAPI --> PostgreSQL
    FastAPI --> Redis
    Redis --> CeleryWorker
    CeleryWorker --> PostgreSQL
    Redis --> CeleryBeat
```

The client sends requests to FastAPI. For immediate operations, FastAPI talks directly to PostgreSQL. For long-running work like sending emails or processing files, FastAPI pushes tasks onto a Redis queue. Celery workers pick up those tasks and execute them asynchronously.

## Project Structure

```
fastapi-celery/
├── docker-compose.yml
├── Dockerfile
├── requirements.txt
├── app/
│   ├── __init__.py
│   ├── main.py
│   ├── config.py
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── tasks.py
│   └── worker.py
└── alembic/
    └── ...
```

## The Dockerfile

Build a single image that serves both the FastAPI app and the Celery worker. The entrypoint determines which process runs.

```dockerfile
# Python 3.11 slim image for smaller footprint
FROM python:3.11-slim

WORKDIR /app

# Install system dependencies needed by psycopg2
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Copy and install Python dependencies first for layer caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source code
COPY . .

# Create non-root user
RUN useradd -m appuser
USER appuser

EXPOSE 8000

# Default command runs the FastAPI server
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

## Requirements File

```
# Python package dependencies
fastapi==0.109.0
uvicorn[standard]==0.27.0
sqlalchemy==2.0.25
psycopg2-binary==2.9.9
celery[redis]==5.3.6
redis==5.0.1
alembic==1.13.1
pydantic-settings==2.1.0
```

## Docker Compose Configuration

```yaml
# Full stack: FastAPI + PostgreSQL + Redis + Celery
version: "3.8"

services:
  # FastAPI web application
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql://appuser:apppassword@postgres:5432/appdb
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    volumes:
      - ./app:/app/app
    restart: unless-stopped
    networks:
      - app-network

  # Celery worker for background task processing
  celery-worker:
    build: .
    command: celery -A app.worker worker --loglevel=info --concurrency=4
    environment:
      DATABASE_URL: postgresql://appuser:apppassword@postgres:5432/appdb
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    networks:
      - app-network

  # Celery Beat for scheduled/periodic tasks
  celery-beat:
    build: .
    command: celery -A app.worker beat --loglevel=info
    environment:
      DATABASE_URL: postgresql://appuser:apppassword@postgres:5432/appdb
      REDIS_URL: redis://redis:6379/0
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    depends_on:
      - celery-worker
    restart: unless-stopped
    networks:
      - app-network

  # PostgreSQL database
  postgres:
    image: postgres:16-alpine
    ports:
      - "5432:5432"
    environment:
      POSTGRES_USER: appuser
      POSTGRES_PASSWORD: apppassword
      POSTGRES_DB: appdb
    volumes:
      - postgres-data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U appuser -d appdb"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Redis as message broker and result backend
  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - app-network

  # Flower for monitoring Celery tasks (optional)
  flower:
    build: .
    command: celery -A app.worker flower --port=5555
    ports:
      - "5555:5555"
    environment:
      CELERY_BROKER_URL: redis://redis:6379/0
      CELERY_RESULT_BACKEND: redis://redis:6379/1
    depends_on:
      - celery-worker
    networks:
      - app-network

volumes:
  postgres-data:
  redis-data:

networks:
  app-network:
    driver: bridge
```

Notice that the `celery-worker` and `celery-beat` services use the same Docker image as the web service, just with a different command. This keeps things simple and ensures consistency.

## Application Configuration

```python
# app/config.py - Centralized configuration using pydantic-settings
from pydantic_settings import BaseSettings

class Settings(BaseSettings):
    database_url: str = "postgresql://appuser:apppassword@localhost:5432/appdb"
    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    class Config:
        env_file = ".env"

settings = Settings()
```

## Database Setup

```python
# app/database.py - SQLAlchemy async engine and session setup
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

from app.config import settings

engine = create_engine(settings.database_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

## Celery Worker Configuration

```python
# app/worker.py - Celery application setup with Redis broker
from celery import Celery
from app.config import settings

celery_app = Celery(
    "worker",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
)

# Configure task serialization and result expiration
celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    result_expires=3600,
    task_track_started=True,
)

# Auto-discover tasks in the app.tasks module
celery_app.autodiscover_tasks(["app"])
```

## Defining Tasks

```python
# app/tasks.py - Background task definitions
import time
from app.worker import celery_app
from app.database import SessionLocal

@celery_app.task(bind=True, max_retries=3)
def process_data(self, item_id: int):
    """Process a data item in the background with retry logic."""
    try:
        db = SessionLocal()
        # Simulate heavy processing
        time.sleep(5)
        # Update the database with processed results
        db.close()
        return {"status": "completed", "item_id": item_id}
    except Exception as exc:
        # Retry with exponential backoff
        raise self.retry(exc=exc, countdown=2 ** self.request.retries)

@celery_app.task
def send_notification(user_id: int, message: str):
    """Send a notification to a user asynchronously."""
    # Your notification logic here
    return {"sent_to": user_id, "message": message}
```

## FastAPI Integration

```python
# app/main.py - FastAPI application with Celery task dispatch
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session

from app.database import get_db
from app.tasks import process_data, send_notification

app = FastAPI(title="FastAPI + Celery Demo")

@app.post("/process/{item_id}")
async def trigger_processing(item_id: int):
    """Dispatch a background task and return the task ID immediately."""
    task = process_data.delay(item_id)
    return {"task_id": task.id, "status": "queued"}

@app.get("/task/{task_id}")
async def get_task_status(task_id: str):
    """Check the status of a background task."""
    from app.worker import celery_app
    result = celery_app.AsyncResult(task_id)
    return {
        "task_id": task_id,
        "status": result.status,
        "result": result.result if result.ready() else None,
    }

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

## Running the Stack

```bash
# Build and start everything
docker compose up --build -d

# Verify all services are running
docker compose ps

# Watch Celery worker logs
docker compose logs -f celery-worker
```

## Testing the Pipeline

```bash
# Submit a background task
curl -X POST http://localhost:8000/process/42

# Response: {"task_id": "abc123...", "status": "queued"}

# Check task status using the returned task_id
curl http://localhost:8000/task/abc123

# Monitor tasks via Flower dashboard
# Open http://localhost:5555 in your browser
```

## Scaling Workers

One of the big advantages of this setup is that you can scale Celery workers independently:

```bash
# Scale to 3 Celery worker containers
docker compose up -d --scale celery-worker=3
```

Each worker container runs with 4 concurrent processes (set via `--concurrency=4`), giving you 12 parallel task execution slots.

## Database Migrations with Alembic

Run migrations inside the container to keep your database schema up to date:

```bash
# Run Alembic migrations
docker compose exec web alembic upgrade head

# Generate a new migration after model changes
docker compose exec web alembic revision --autogenerate -m "add users table"
```

## Summary

This setup gives you a complete async task processing pipeline. FastAPI handles HTTP requests with high throughput, PostgreSQL provides reliable data storage, Redis serves as both the Celery broker and result backend, and Celery workers process tasks in the background. The Flower dashboard lets you monitor task execution in real time. Scaling is as simple as bumping the worker replica count.
