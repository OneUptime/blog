# How to Use docker init for Python Projects

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Docker, Docker Init, Python, Django, Flask, FastAPI, Containerization, DevOps

Description: A practical guide to using docker init with Python projects, covering Flask, Django, FastAPI, and virtual environment management in containers.

---

Python applications have unique containerization challenges. Virtual environments, system-level dependencies for packages like psycopg2 or Pillow, and the choice between pip, pipenv, and poetry all complicate the Dockerfile. The `docker init` command detects Python projects and generates Docker configuration that handles these concerns properly.

This guide walks through using docker init with various Python web frameworks and customizing the output for production deployments.

## Setting Up a Sample Flask Project

Let's start with a Flask application:

```bash
# Create a project directory
mkdir python-docker-demo && cd python-docker-demo

# Create a virtual environment and install dependencies
python3 -m venv venv
source venv/bin/activate
pip install flask gunicorn
pip freeze > requirements.txt
```

Create the application:

```python
# app.py - A simple Flask application with a health endpoint
from flask import Flask, jsonify
import os

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({'status': 'healthy'})

@app.route('/api/items')
def items():
    return jsonify([
        {'id': 1, 'name': 'Widget', 'price': 9.99},
        {'id': 2, 'name': 'Gadget', 'price': 24.99},
    ])

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 8000))
    app.run(host='0.0.0.0', port=port)
```

## Running docker init

Deactivate your virtual environment first (docker init should analyze the project files, not the local venv), then run it:

```bash
deactivate
docker init
```

Docker init detects the requirements.txt and identifies the project as Python:

```
? What application platform does your project use? Python
? What version of Python do you want to use? 3.12
? What port does your server listen on? 8000
? What is the command to run your app? gunicorn app:app --bind 0.0.0.0:8000
```

## Understanding the Generated Dockerfile

The generated Dockerfile for Python projects follows best practices for pip-based dependency management:

```dockerfile
# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim as base

# Prevents Python from writing .pyc files and enables unbuffered output
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1

WORKDIR /app

# Create a non-root user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Install dependencies using cache mount for pip
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    pip install --no-cache-dir -r requirements.txt

# Switch to non-root user
USER appuser

# Copy application code
COPY . .

EXPOSE 8000

# Run with gunicorn for production
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

Key details in this Dockerfile:

- **python:slim** base image instead of alpine, because many Python packages need C compilation that works better on Debian
- **PYTHONDONTWRITEBYTECODE=1** prevents .pyc file creation, reducing image size
- **PYTHONUNBUFFERED=1** ensures logs appear in real time
- **Cache mount** for pip speeds up rebuilds

## Customizing for Django Projects

Django projects need a few additional considerations. Create a Django project:

```bash
pip install django gunicorn psycopg2-binary whitenoise
django-admin startproject mysite .
pip freeze > requirements.txt
```

Modify the generated Dockerfile for Django:

```dockerfile
# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install system dependencies for psycopg2 and Pillow
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    libpq-dev \
    libjpeg-dev \
    && rm -rf /var/lib/apt/lists/*

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

# Install Python dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    --mount=type=bind,source=requirements.txt,target=requirements.txt \
    pip install -r requirements.txt

# Copy application code
COPY . .

# Collect static files during build
RUN python manage.py collectstatic --noinput

# Switch to non-root user after collectstatic
USER appuser

EXPOSE 8000
CMD ["gunicorn", "mysite.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "3"]
```

The Django compose.yaml should include a database:

```yaml
# compose.yaml - Django with PostgreSQL
services:
  web:
    build: .
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgres://django:django@db:5432/django_db
      - DJANGO_SECRET_KEY=change-me-in-production
      - DJANGO_DEBUG=0
    depends_on:
      db:
        condition: service_healthy

  db:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: django
      POSTGRES_PASSWORD: django
      POSTGRES_DB: django_db
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U django"]
      interval: 5s
      timeout: 5s
      retries: 5

volumes:
  postgres_data:
```

## Customizing for FastAPI Projects

FastAPI applications use uvicorn as the ASGI server. Adjust the startup command:

```python
# main.py - FastAPI application
from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI()

class Item(BaseModel):
    name: str
    price: float

@app.get("/health")
def health():
    return {"status": "healthy"}

@app.get("/api/items")
def list_items():
    return [
        {"id": 1, "name": "Widget", "price": 9.99},
        {"id": 2, "name": "Gadget", "price": 24.99},
    ]
```

When running docker init, specify uvicorn as the start command:

```bash
# During docker init, set the command to:
# uvicorn main:app --host 0.0.0.0 --port 8000
```

The Dockerfile CMD becomes:

```dockerfile
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

## Using Poetry Instead of pip

If your project uses Poetry for dependency management, modify the generated Dockerfile:

```dockerfile
# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12
FROM python:${PYTHON_VERSION}-slim as base

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install Poetry
ENV POETRY_HOME=/opt/poetry
ENV POETRY_VERSION=1.7.1
RUN pip install "poetry==${POETRY_VERSION}"

# Configure Poetry to not create virtual environments in containers
ENV POETRY_VIRTUALENVS_CREATE=false

# Install dependencies (copy lock file for caching)
COPY pyproject.toml poetry.lock ./
RUN poetry install --no-interaction --no-ansi --no-root --only main

# Create non-root user
ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

COPY . .
USER appuser

EXPOSE 8000
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

## Multi-Stage Build for Smaller Images

For production, use a multi-stage build to exclude build tools from the final image:

```dockerfile
# syntax=docker/dockerfile:1

ARG PYTHON_VERSION=3.12

# Build stage - install compilation dependencies
FROM python:${PYTHON_VERSION}-slim as builder
WORKDIR /app

RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --user --no-cache-dir -r requirements.txt

# Final stage - runtime only
FROM python:${PYTHON_VERSION}-slim as final

ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
WORKDIR /app

# Install only runtime libraries (not build tools)
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 && \
    rm -rf /var/lib/apt/lists/*

# Copy installed packages from builder
COPY --from=builder /root/.local /root/.local
ENV PATH=/root/.local/bin:$PATH

ARG UID=10001
RUN adduser \
    --disabled-password \
    --gecos "" \
    --home "/nonexistent" \
    --shell "/sbin/nologin" \
    --no-create-home \
    --uid "${UID}" \
    appuser

COPY . .
USER appuser

EXPOSE 8000
CMD ["gunicorn", "app:app", "--bind", "0.0.0.0:8000"]
```

This approach keeps build-essential and compiler headers out of the production image, reducing its size significantly.

## Python-Specific .dockerignore

Extend the generated .dockerignore for Python projects:

```
# Virtual environments
venv
.venv
env
.env

# Python artifacts
__pycache__
*.pyc
*.pyo
*.egg-info
dist
build

# Testing
.pytest_cache
.coverage
htmlcov
.tox

# IDE files
.vscode
.idea
*.swp

# Docker files
Dockerfile
compose.yaml
.dockerignore

# Documentation
*.md
docs
```

## Building and Running

```bash
# Build the image
docker build -t my-python-app:latest .

# Run standalone
docker run -p 8000:8000 my-python-app:latest

# Run with compose (includes database)
docker compose up --build

# Test the health endpoint
curl http://localhost:8000/health
```

## Debugging Container Issues

If your Python application fails to start in the container, these commands help:

```bash
# Start the container with a shell to investigate
docker run -it --entrypoint /bin/bash my-python-app:latest

# Check installed packages inside the container
pip list

# Verify the application can import correctly
python -c "import app"
```

Docker init gives Python developers a solid starting point that accounts for the quirks of containerizing Python applications. The generated files handle pip caching, non-root users, and unbuffered output correctly. From there, add your framework-specific customizations and you are ready for production.
