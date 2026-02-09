# How to Containerize a FastAPI Application with Docker

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, FastAPI, Python, Containerization, Backend, DevOps, Uvicorn, API

Description: Learn how to containerize a FastAPI application with Docker using Uvicorn, multi-stage builds, and production-ready configuration

---

FastAPI has rapidly become the go-to Python framework for building high-performance APIs. It combines Python type hints with automatic OpenAPI documentation generation and async support. Docker packages your FastAPI app with all its dependencies into a portable container that runs identically everywhere. This guide covers the full containerization journey, from a basic Dockerfile through production deployment with Uvicorn workers and database connectivity.

## Prerequisites

You need:

- Python 3.11+
- Docker Engine 20.10+
- Basic familiarity with Python type hints and REST APIs

## Creating a FastAPI Project

Set up a basic FastAPI application:

```bash
mkdir my-fastapi-app && cd my-fastapi-app
python -m venv venv
source venv/bin/activate
pip install fastapi uvicorn[standard]
```

Create the main application file:

```python
# app/main.py - FastAPI application entry point
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="My FastAPI App", version="1.0.0")

class HealthResponse(BaseModel):
    status: str
    version: str

@app.get("/")
async def root():
    return {"message": "Hello from FastAPI!"}

@app.get("/health", response_model=HealthResponse)
async def health_check():
    return HealthResponse(status="ok", version="1.0.0")
```

Create `requirements.txt`:

```
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
```

Test locally:

```bash
uvicorn app.main:app --host 0.0.0.0 --port 8000
curl http://localhost:8000/docs  # Check auto-generated Swagger UI
```

## Writing the Dockerfile

FastAPI does not require a build step since it is pure Python. The Dockerfile is straightforward.

This Dockerfile creates a production-ready FastAPI container:

```dockerfile
# Use Python slim for a smaller image
FROM python:3.12-slim

# Prevent .pyc files and enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Install system dependencies if needed (e.g., for database drivers)
RUN apt-get update && \
    apt-get install -y --no-install-recommends gcc libpq-dev && \
    rm -rf /var/lib/apt/lists/*

# Create non-root user
RUN groupadd -r appuser && useradd -r -g appuser appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Set ownership
RUN chown -R appuser:appuser /app

USER appuser

EXPOSE 8000

# Run with Uvicorn, using multiple workers for production
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

## The .dockerignore File

```
venv
__pycache__
*.pyc
.git
.gitignore
.vscode
*.md
.env
.env.*
.pytest_cache
.mypy_cache
tests/
```

## Building and Running

```bash
# Build the image
docker build -t my-fastapi-app:latest .

# Run the container
docker run -d -p 8000:8000 --name fastapi-app my-fastapi-app:latest

# Test the API
curl http://localhost:8000
curl http://localhost:8000/docs  # Swagger UI
curl http://localhost:8000/redoc  # ReDoc documentation
```

FastAPI's auto-generated documentation is available immediately at `/docs` and `/redoc`.

## Docker Compose with PostgreSQL

Most FastAPI applications connect to a database. Here is a Compose file with PostgreSQL and SQLAlchemy.

Install additional dependencies:

```
# Add to requirements.txt
sqlalchemy>=2.0
psycopg2-binary>=2.9
alembic>=1.13
```

Docker Compose configuration:

```yaml
version: "3.8"

services:
  api:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://fastapi:secret@postgres:5432/fastapidb
      - SECRET_KEY=your-secret-key
    depends_on:
      postgres:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "python", "-c", "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"]
      interval: 30s
      timeout: 10s
      retries: 3

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fastapi
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: fastapidb
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fastapi -d fastapidb"]
      interval: 10s
      timeout: 5s
      retries: 5

volumes:
  pgdata:
```

## Database Configuration with SQLAlchemy

Set up a database connection that reads from environment variables:

```python
# app/database.py - SQLAlchemy database configuration
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Read the database URL from environment
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "sqlite:///./dev.db"
)

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

# Dependency injection for FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
```

Use it in your routes:

```python
# app/main.py - Using database dependency
from fastapi import FastAPI, Depends
from sqlalchemy.orm import Session
from app.database import get_db

app = FastAPI()

@app.get("/users")
async def list_users(db: Session = Depends(get_db)):
    # Query users from the database
    users = db.execute("SELECT * FROM users").fetchall()
    return {"users": users}
```

## Running Database Migrations

Use Alembic for database migrations. Initialize it inside the container:

```bash
# Initialize Alembic (do this once in your project)
docker compose exec api alembic init alembic

# Generate a migration
docker compose exec api alembic revision --autogenerate -m "initial tables"

# Run migrations
docker compose exec api alembic upgrade head
```

Or add migration running to an entrypoint script:

```bash
#!/bin/sh
# entrypoint.sh
echo "Running database migrations..."
alembic upgrade head

echo "Starting FastAPI server..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 4
```

## Async Database Drivers

FastAPI excels at async operations. Use an async database driver for better performance under load.

Install async dependencies:

```
asyncpg>=0.29.0
sqlalchemy[asyncio]>=2.0
```

Async database setup:

```python
# app/database.py - Async SQLAlchemy configuration
import os
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import sessionmaker, DeclarativeBase

# Async PostgreSQL URL uses asyncpg driver
DATABASE_URL = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://fastapi:secret@postgres:5432/fastapidb"
)

engine = create_async_engine(DATABASE_URL, echo=False)
AsyncSessionLocal = sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

## Development Workflow

For development with auto-reload:

```dockerfile
# Dockerfile.dev
FROM python:3.12-slim
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app
RUN apt-get update && apt-get install -y --no-install-recommends gcc libpq-dev && rm -rf /var/lib/apt/lists/*
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
EXPOSE 8000

# Use Uvicorn's reload flag for development
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]
```

Development Compose file:

```yaml
version: "3.8"

services:
  api-dev:
    build:
      context: .
      dockerfile: Dockerfile.dev
    ports:
      - "8000:8000"
    volumes:
      - .:/app
    environment:
      - DATABASE_URL=postgresql://fastapi:secret@postgres:5432/fastapidb
    depends_on:
      - postgres

  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: fastapi
      POSTGRES_PASSWORD: secret
      POSTGRES_DB: fastapidb
    ports:
      - "5432:5432"
```

## Uvicorn Production Configuration

For production, configure Uvicorn with appropriate worker counts and timeouts:

```python
# uvicorn_config.py - Production Uvicorn configuration
import multiprocessing

# Worker count: 2 * CPU cores + 1
workers = multiprocessing.cpu_count() * 2 + 1
bind = "0.0.0.0:8000"
worker_class = "uvicorn.workers.UvicornWorker"
timeout = 120
keepalive = 5
accesslog = "-"
errorlog = "-"
```

Alternatively, use Gunicorn as the process manager with Uvicorn workers:

```dockerfile
CMD ["gunicorn", "app.main:app", "-w", "4", "-k", "uvicorn.workers.UvicornWorker", "--bind", "0.0.0.0:8000"]
```

This gives you Gunicorn's process management with Uvicorn's async performance.

## Graceful Shutdown

FastAPI and Uvicorn handle SIGTERM gracefully by default. Add shutdown event handlers for cleanup:

```python
# app/main.py - Shutdown handling
@app.on_event("shutdown")
async def shutdown_event():
    # Close database connections, flush caches, etc.
    print("Application shutting down, cleaning up resources")
```

## Conclusion

FastAPI and Docker complement each other perfectly. FastAPI's auto-generated documentation works out of the box in containers, and its async capabilities shine when deployed with Uvicorn workers. Use the straightforward Dockerfile for pure Python applications, add Docker Compose for database connectivity, and run Alembic for migrations. The combination of FastAPI's developer experience and Docker's deployment consistency produces APIs that are both pleasant to build and reliable to run.
