# How to Deploy a FastAPI + PostgreSQL Stack via Portainer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, FastAPI, PostgreSQL, Python, Docker Compose, REST API

Description: Learn how to deploy a FastAPI application with PostgreSQL via Portainer, including SQLAlchemy configuration, Alembic migrations, and production deployment with Uvicorn.

---

FastAPI is the fastest-growing Python API framework, combining high performance with automatic OpenAPI documentation. Portainer simplifies managing the FastAPI + PostgreSQL stack in production.

## Compose Stack

```yaml
version: "3.8"

services:
  db:
    image: postgres:16-alpine
    restart: unless-stopped
    environment:
      POSTGRES_DB: fastapiapp
      POSTGRES_USER: fastapi
      POSTGRES_PASSWORD: fastapipass      # Change this
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U fastapi"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    image: python:3.12-slim
    restart: unless-stopped
    depends_on:
      db:
        condition: service_healthy
    ports:
      - "8000:8000"
    environment:
      DATABASE_URL: postgresql+asyncpg://fastapi:fastapipass@db:5432/fastapiapp
      SECRET_KEY: changeme-random-32-char-string
    volumes:
      - ./app:/app
    working_dir: /app
    command: >
      bash -c "
        pip install -r requirements.txt &&
        alembic upgrade head &&
        uvicorn main:app --host 0.0.0.0 --port 8000 --workers 4
      "

volumes:
  postgres_data:
```

## FastAPI Application

```python
# app/main.py

from fastapi import FastAPI
from fastapi.responses import JSONResponse
from sqlalchemy import text
from sqlalchemy.ext.asyncio import create_async_engine
import os

app = FastAPI(title="My API")

engine = create_async_engine(os.environ["DATABASE_URL"], echo=False)

@app.get("/health")
async def health():
    """Health check endpoint for monitoring."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
        return {"status": "healthy", "database": "connected"}
    except Exception as e:
        return JSONResponse(
            status_code=503,
            content={"status": "unhealthy", "database": str(e)},
        )

@app.get("/docs-url")
async def root():
    return {"message": "Visit /docs for the interactive API documentation"}
```

## Requirements

```text
# app/requirements.txt
fastapi>=0.110.0
uvicorn[standard]>=0.27.0
sqlalchemy[asyncio]>=2.0.0
asyncpg>=0.29.0
alembic>=1.13.0
```

## Monitoring

Use OneUptime to monitor `http://<host>:8000/health`. FastAPI returns JSON health status. Also monitor `http://<host>:8000/docs` to ensure the Swagger UI is accessible, which confirms the application is fully initialized.
