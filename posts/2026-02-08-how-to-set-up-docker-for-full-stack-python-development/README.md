# How to Set Up Docker for Full-Stack Python Development

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Python, Full-Stack Development, DevOps, FastAPI, React, Docker Compose

Description: Set up a complete full-stack Python development environment with Docker, featuring FastAPI backend, React frontend, PostgreSQL, and Celery task queues.

---

Python excels as a backend language for web applications, APIs, and data processing. Docker standardizes the development environment so every team member has the same Python version, system libraries, and service dependencies. This guide builds a production-ready full-stack setup with FastAPI on the backend, React on the frontend, PostgreSQL for data, Redis for caching, and Celery for background tasks.

## Prerequisites

Docker and Docker Compose must be installed. Familiarity with Python and basic web development concepts is assumed. We will construct the entire project step by step.

## Project Structure

```
fullstack-python/
  backend/           # FastAPI application
  frontend/          # React application
  worker/            # Celery background worker
  docker-compose.yml
  docker-compose.dev.yml
  .env.example
```

Create the structure:

```bash
mkdir -p fullstack-python/{backend,frontend,worker}/src
cd fullstack-python
```

## Backend Setup with FastAPI

Create the requirements file:

```text
# backend/requirements.txt - Python dependencies
fastapi==0.108.0
uvicorn[standard]==0.25.0
sqlalchemy==2.0.25
asyncpg==0.29.0
alembic==1.13.1
redis==5.0.1
pydantic==2.5.3
pydantic-settings==2.1.0
python-multipart==0.0.6
passlib[bcrypt]==1.7.4
celery[redis]==5.3.6
httpx==0.26.0
```

Create the FastAPI application:

```python
# backend/src/main.py - FastAPI application entry point
from fastapi import FastAPI, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr
from typing import Optional
import os
import time
import redis
import asyncpg

app = FastAPI(title="Full-Stack Python API", version="1.0.0")

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=os.getenv("CORS_ORIGINS", "http://localhost:3000").split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Global state for connections
db_pool = None
redis_client = None
start_time = time.time()


@app.on_event("startup")
async def startup():
    """Initialize database and cache connections on startup."""
    global db_pool, redis_client

    db_pool = await asyncpg.create_pool(
        dsn=os.getenv("DATABASE_URL"),
        min_size=5,
        max_size=20,
    )

    redis_client = redis.from_url(
        os.getenv("REDIS_URL", "redis://redis:6379"),
        decode_responses=True,
    )


@app.on_event("shutdown")
async def shutdown():
    """Clean up connections on shutdown."""
    if db_pool:
        await db_pool.close()


# Pydantic models for request/response
class UserCreate(BaseModel):
    email: str
    name: str
    password: str


class UserResponse(BaseModel):
    id: int
    email: str
    name: str
    created_at: str


class HealthResponse(BaseModel):
    status: str
    version: str
    uptime: float
    database: bool
    cache: bool


# Health check endpoint
@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    db_ok = False
    cache_ok = False

    try:
        async with db_pool.acquire() as conn:
            await conn.fetchval("SELECT 1")
        db_ok = True
    except Exception:
        pass

    try:
        redis_client.ping()
        cache_ok = True
    except Exception:
        pass

    return HealthResponse(
        status="ok" if (db_ok and cache_ok) else "degraded",
        version="1.0.0",
        uptime=time.time() - start_time,
        database=db_ok,
        cache=cache_ok,
    )


# User endpoints
@app.get("/api/users")
async def list_users():
    # Check cache first
    cached = redis_client.get("users:list")
    if cached:
        import json
        return {"data": json.loads(cached), "cached": True}

    async with db_pool.acquire() as conn:
        rows = await conn.fetch(
            "SELECT id, email, name, created_at::text FROM users ORDER BY created_at DESC"
        )
        users = [dict(row) for row in rows]

    import json
    redis_client.setex("users:list", 60, json.dumps(users, default=str))
    return {"data": users, "cached": False}


@app.post("/api/users", status_code=201)
async def create_user(user: UserCreate):
    try:
        async with db_pool.acquire() as conn:
            row = await conn.fetchrow(
                """INSERT INTO users (email, name, password_hash)
                   VALUES ($1, $2, $3)
                   RETURNING id, email, name, created_at::text""",
                user.email, user.name, user.password,  # Hash password in production
            )

        # Invalidate cache
        redis_client.delete("users:list")

        # Trigger async task
        from src.tasks import send_welcome_email
        send_welcome_email.delay(user.email, user.name)

        return {"data": dict(row), "message": "User created"}
    except asyncpg.UniqueViolationError:
        raise HTTPException(status_code=409, detail="Email already exists")
```

Create Celery tasks:

```python
# backend/src/tasks.py - Celery background tasks
from celery import Celery
import os
import time

celery_app = Celery(
    "tasks",
    broker=os.getenv("CELERY_BROKER_URL", "redis://redis:6379/1"),
    backend=os.getenv("CELERY_RESULT_BACKEND", "redis://redis:6379/2"),
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
)


@celery_app.task(bind=True, max_retries=3)
def send_welcome_email(self, email: str, name: str):
    """Send a welcome email to a new user (simulated)."""
    try:
        print(f"Sending welcome email to {name} at {email}")
        time.sleep(2)  # Simulate email sending
        print(f"Welcome email sent to {email}")
        return {"status": "sent", "email": email}
    except Exception as exc:
        raise self.retry(exc=exc, countdown=60)


@celery_app.task
def process_data(data_id: int):
    """Process data in the background."""
    print(f"Processing data {data_id}")
    time.sleep(5)  # Simulate heavy processing
    return {"status": "complete", "data_id": data_id}
```

## Backend Dockerfile

```dockerfile
# backend/Dockerfile - production FastAPI image
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt

# Production stage
FROM python:3.12-slim

WORKDIR /app

# Install runtime dependencies only
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl \
    && rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /install /usr/local

# Copy application code
COPY src/ ./src/

# Create non-root user
RUN useradd -m -r appuser
USER appuser

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --retries=3 \
  CMD curl -f http://localhost:8000/api/health || exit 1

# Run with uvicorn
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

## Celery Worker Dockerfile

```dockerfile
# worker/Dockerfile - Celery worker image
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Use the same requirements as the backend
COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy the task definitions
COPY backend/src/ ./src/

RUN useradd -m -r celeryuser
USER celeryuser

# Run Celery worker
CMD ["celery", "-A", "src.tasks", "worker", "--loglevel=info", "--concurrency=4"]
```

## Docker Compose for Development

```yaml
# docker-compose.dev.yml - full development environment
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - ./backend/src:/app/src
    environment:
      - DATABASE_URL=postgres://app:devpass@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
      - CORS_ORIGINS=http://localhost:3000
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_started

  worker:
    build:
      context: .
      dockerfile: backend/Dockerfile.dev
    volumes:
      - ./backend/src:/app/src
    environment:
      - DATABASE_URL=postgres://app:devpass@postgres:5432/appdb
      - REDIS_URL=redis://redis:6379/0
      - CELERY_BROKER_URL=redis://redis:6379/1
    command: ["celery", "-A", "src.tasks", "worker", "--loglevel=info", "--concurrency=2"]
    depends_on:
      - redis

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile.dev
    ports:
      - "3000:3000"
    volumes:
      - ./frontend/src:/app/src
    environment:
      - VITE_API_URL=http://localhost:8000

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: app
      POSTGRES_PASSWORD: devpass
      POSTGRES_DB: appdb
    ports:
      - "5432:5432"
    volumes:
      - pgdata:/var/lib/postgresql/data
      - ./backend/init.sql:/docker-entrypoint-initdb.d/init.sql
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U app"]
      interval: 5s
      timeout: 5s
      retries: 5

  redis:
    image: redis:7-alpine
    ports:
      - "6379:6379"
    volumes:
      - redisdata:/data

  # Celery monitoring dashboard
  flower:
    build:
      context: .
      dockerfile: backend/Dockerfile.dev
    ports:
      - "5555:5555"
    environment:
      - CELERY_BROKER_URL=redis://redis:6379/1
    command: ["celery", "-A", "src.tasks", "flower", "--port=5555"]
    depends_on:
      - redis

volumes:
  pgdata:
  redisdata:
```

Development Dockerfile for the backend:

```dockerfile
# backend/Dockerfile.dev - development image with hot reload
FROM python:3.12-slim

WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev curl \
    && rm -rf /var/lib/apt/lists/*

COPY backend/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY backend/src/ ./src/

EXPOSE 8000

# Uvicorn with reload for development
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

## Database Initialization

```sql
-- backend/init.sql - initial database schema
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Seed data for development
INSERT INTO users (email, name, password_hash)
VALUES
    ('alice@example.com', 'Alice', 'hashed_password_1'),
    ('bob@example.com', 'Bob', 'hashed_password_2')
ON CONFLICT (email) DO NOTHING;
```

## Starting Development

```bash
# Start the full development environment
docker compose -f docker-compose.dev.yml up --build

# Start specific services
docker compose -f docker-compose.dev.yml up backend postgres redis

# Run database migrations
docker compose -f docker-compose.dev.yml exec backend alembic upgrade head

# Open Celery Flower monitoring
# Visit http://localhost:5555

# View backend logs
docker compose -f docker-compose.dev.yml logs -f backend worker
```

## Testing

```bash
# Run backend tests inside the container
docker compose -f docker-compose.dev.yml exec backend pytest

# Run with coverage
docker compose -f docker-compose.dev.yml exec backend pytest --cov=src
```

## The .dockerignore File

```text
# .dockerignore
**/__pycache__/
**/*.pyc
**/.venv/
**/.git/
**/.env
**/README.md
**/Dockerfile*
**/docker-compose*
**/.pytest_cache/
**/.mypy_cache/
```

## Production Deployment

```yaml
# docker-compose.yml - production configuration
version: "3.8"

services:
  backend:
    build:
      context: .
      dockerfile: backend/Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - REDIS_URL=${REDIS_URL}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
    deploy:
      replicas: 3
      resources:
        limits:
          cpus: "1"
          memory: 512M

  worker:
    build:
      context: .
      dockerfile: worker/Dockerfile
    environment:
      - DATABASE_URL=${DATABASE_URL}
      - CELERY_BROKER_URL=${CELERY_BROKER_URL}
    deploy:
      replicas: 2
      resources:
        limits:
          cpus: "2"
          memory: 1G

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "80:80"

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - pgdata:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--requirepass", "${REDIS_PASSWORD}"]
    volumes:
      - redisdata:/data

volumes:
  pgdata:
  redisdata:
```

## Monitoring the Full Stack

A full-stack Python application has multiple failure points: the API, the database, the cache, and the background workers. [OneUptime](https://oneuptime.com) can monitor the `/api/health` endpoint, which reports the status of all dependent services in a single response. Set up alerts for degraded status so you catch issues before they cascade. Celery Flower (included in our dev setup) provides visibility into background task queues and worker health.

## Summary

Docker Compose transforms full-stack Python development by standardizing the entire service stack. FastAPI provides a high-performance async backend with automatic API documentation. Celery handles background processing through Redis as a message broker. The development environment uses volume mounts for hot reloading, while production builds use multi-stage Dockerfiles to minimize image sizes. This setup handles the common patterns of modern web applications: API endpoints, database operations, caching, and asynchronous task processing, all in a reproducible, portable configuration.
