# How to Deploy a FastAPI + PostgreSQL Stack via Portainer - Postgres

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, FastAPI, PostgreSQL, Python, Docker Compose, REST API, SQLAlchemy

Description: Deploy a FastAPI REST API with PostgreSQL using Docker Compose through Portainer, including SQLAlchemy ORM, Alembic migrations, async database access, and automatic API documentation.

## Introduction

FastAPI is a modern, high-performance Python web framework with automatic OpenAPI documentation and async support. Paired with PostgreSQL and deployed through Portainer, you get a containerized API stack with connection pooling, database migrations, and interactive API docs accessible from the browser. This guide covers the complete deployment using Portainer Stacks.

## Prerequisites

- Portainer CE or BE connected to a Docker Standalone environment with Docker Engine 20.10+
- Basic knowledge of Python and FastAPI
- At least 512 MB of available RAM

## Step 1: Prepare the FastAPI Dockerfile

```dockerfile
# Dockerfile

FROM python:3.12-slim

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libpq-dev gcc curl && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

EXPOSE 8000

# Start with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

```text
# requirements.txt
fastapi==0.110.0
uvicorn[standard]==0.27.1
sqlalchemy==2.0.27
alembic==1.13.1
asyncpg==0.29.0
psycopg2-binary==2.9.9
pydantic==2.6.1
pydantic-settings==2.2.1
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
python-multipart==0.0.9
```

```bash
# Build the image outside Portainer before deploying the stack
docker build -t fastapi-app:latest .
```

If Portainer manages a remote Docker host, push this image to a registry or load it onto that host and set `FASTAPI_IMAGE` accordingly.

## Step 2: Create the Docker Compose Stack in Portainer

Navigate to **Stacks** → **Add Stack** → **Web Editor** and name it `fastapi-app`:

```yaml
services:
  # PostgreSQL database
  db:
    image: postgres:16-alpine
    container_name: fastapi-db
    restart: unless-stopped
    environment:
      POSTGRES_DB: ${POSTGRES_DB:-fastapidb}
      POSTGRES_USER: ${POSTGRES_USER:-fastapiuser}
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD:-fastapipassword}
    volumes:
      - postgres_data:/var/lib/postgresql/data
    networks:
      - fastapi-net
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${POSTGRES_USER:-fastapiuser} -d ${POSTGRES_DB:-fastapidb}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # FastAPI application
  api:
    image: ${FASTAPI_IMAGE:-fastapi-app:latest}
    container_name: fastapi-api
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER:-fastapiuser}:${POSTGRES_PASSWORD:-fastapipassword}@db:5432/${POSTGRES_DB:-fastapidb}
      SECRET_KEY: ${SECRET_KEY:-change-this-secret-key}
      ALGORITHM: HS256
      ACCESS_TOKEN_EXPIRE_MINUTES: "30"
      ENVIRONMENT: production
    ports:
      - "8000:8000"
    depends_on:
      db:
        condition: service_healthy
    networks:
      - fastapi-net
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:8000/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  # Redis for caching (optional)
  redis:
    image: redis:7-alpine
    container_name: fastapi-redis
    restart: unless-stopped
    networks:
      - fastapi-net

volumes:
  postgres_data:
    driver: local

networks:
  fastapi-net:
    driver: bridge
```

## Step 3: FastAPI Application Structure

```python
# app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
from app import models  # Ensure models are registered before create_all
from app.database import engine, Base
from app.routers import users, items

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: create tables (use Alembic in production)
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    yield
    # Shutdown: close database connections
    await engine.dispose()

app = FastAPI(
    title="FastAPI + PostgreSQL Demo",
    description="FastAPI with PostgreSQL via Portainer",
    version="1.0.0",
    lifespan=lifespan
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict in production
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(users.router, prefix="/api/users", tags=["users"])
app.include_router(items.router, prefix="/api/items", tags=["items"])

@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "fastapi"}
```

```python
# app/database.py
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.orm import DeclarativeBase, sessionmaker
from app.config import settings

# Convert psycopg2 URL to asyncpg for async support
DATABASE_URL = settings.DATABASE_URL.replace("postgresql://", "postgresql+asyncpg://")

engine = create_async_engine(
    DATABASE_URL,
    echo=False,
    pool_size=20,
    max_overflow=10,
    pool_pre_ping=True  # Check connection health before use
)

AsyncSessionLocal = sessionmaker(
    engine, class_=AsyncSession, expire_on_commit=False
)

class Base(DeclarativeBase):
    pass

async def get_db():
    async with AsyncSessionLocal() as session:
        yield session
```

```python
# app/models.py
from sqlalchemy import Column, Integer, String, Boolean, DateTime, ForeignKey
from sqlalchemy.sql import func
from app.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

class Item(Base):
    __tablename__ = "items"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True, nullable=False)
    description = Column(String)
    owner_id = Column(Integer, ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
```

## Step 4: Alembic Migration Setup

```bash
# Initialize Alembic in your project directory before building the image
alembic init alembic

# Configure alembic.ini or env.py to use your PostgreSQL URL
# Update alembic/env.py to import Base and set target_metadata = Base.metadata

# Create a migration
alembic revision --autogenerate -m "Initial tables"

# Rebuild and redeploy the API image, then apply migrations
docker exec fastapi-api alembic upgrade head

# Check migration status
docker exec fastapi-api alembic history
docker exec fastapi-api alembic current
```

## Step 5: Access the Auto-Generated API Docs

FastAPI automatically generates interactive documentation:

```bash
# Open these URLs in your browser:
# http://localhost:8000/docs
# http://localhost:8000/redoc

# OpenAPI JSON schema
curl http://localhost:8000/openapi.json
```

## Step 6: Verify the Deployment

```bash
# Check container health
docker ps | grep fastapi

# Test health endpoint
curl http://localhost:8000/health

# Create a user via the API
curl -X POST http://localhost:8000/api/users/ \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"securepassword"}'

# View application logs in Portainer:
# Containers → fastapi-api → Logs

# Check PostgreSQL tables
docker exec fastapi-db psql -U fastapiuser -d fastapidb \
  -c "\dt"
```

## Conclusion

Deploying FastAPI with PostgreSQL via Portainer provides a high-performance Python API stack with automatic interactive documentation, async database access via SQLAlchemy 2.0 and asyncpg, and Alembic for schema migrations. The lifespan context manager handles startup and shutdown cleanly, and the PostgreSQL health check ensures the API only starts after the database is ready. For production, enable proper CORS restrictions, configure rate limiting, and use Alembic migrations exclusively rather than relying on `create_all`.
