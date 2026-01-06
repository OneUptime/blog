# How to Containerize Python Apps with Multi-Stage Dockerfiles

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Python, Docker, Containers, DevOps, Security, pip, Poetry, uv, Optimization

Description: Learn how to create minimal, secure Docker images for Python applications using multi-stage builds. This guide covers pip, Poetry, and uv with best practices for production deployments.

---

> Docker images bloat quickly with Python dependencies. Multi-stage builds let you use full build tools in one stage and copy only the runtime essentials to a minimal final image. The result: smaller, faster, more secure containers.

A typical Python image can shrink from 1GB+ to under 100MB with proper multi-stage builds.

---

## Why Multi-Stage Builds?

| Single Stage | Multi-Stage |
|--------------|-------------|
| Build tools in production | Only runtime in production |
| 1GB+ image size | 50-200MB image size |
| More attack surface | Minimal attack surface |
| Slow pulls/deploys | Fast pulls/deploys |
| Dev dependencies included | Only production deps |

---

## Basic Multi-Stage with pip

### Simple Flask Application

```dockerfile
# Dockerfile
# Stage 1: Build
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install only runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment from builder
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application code
COPY . .

# Create non-root user
RUN useradd --create-home --shell /bin/bash app \
    && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

### requirements.txt

```text
flask==3.0.0
gunicorn==21.2.0
psycopg2-binary==2.9.9
redis==5.0.1
```

---

## Poetry Multi-Stage Build

### Poetry with Export

```dockerfile
# Dockerfile
# Stage 1: Export dependencies
FROM python:3.12-slim AS exporter

WORKDIR /app

# Install Poetry
RUN pip install poetry==1.7.1

# Copy only dependency files
COPY pyproject.toml poetry.lock ./

# Export to requirements.txt (without dev dependencies)
RUN poetry export -f requirements.txt --output requirements.txt --without-hashes

# Stage 2: Build
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install dependencies from exported requirements
COPY --from=exporter /app/requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 3: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Install runtime dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application
COPY src/ ./src/

# Non-root user
RUN useradd --create-home app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

### Poetry Direct Install (Alternative)

```dockerfile
# Dockerfile
# Stage 1: Build with Poetry
FROM python:3.12-slim AS builder

ENV POETRY_HOME="/opt/poetry" \
    POETRY_VIRTUALENVS_IN_PROJECT=true \
    POETRY_NO_INTERACTION=1

WORKDIR /app

# Install Poetry
RUN pip install poetry==1.7.1

# Copy dependency files
COPY pyproject.toml poetry.lock ./

# Install dependencies (no dev)
RUN poetry install --no-root --only main

# Copy and install project
COPY src/ ./src/
RUN poetry install --only main

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy virtual environment
COPY --from=builder /app/.venv /app/.venv
ENV PATH="/app/.venv/bin:$PATH"

# Copy application
COPY --from=builder /app/src ./src/

# Non-root user
RUN useradd --create-home app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## uv Multi-Stage Build (Fastest)

uv is a fast Python package installer written in Rust:

```dockerfile
# Dockerfile
# Stage 1: Build with uv
FROM python:3.12-slim AS builder

WORKDIR /app

# Install uv
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Create virtual environment
RUN uv venv /opt/venv

# Install dependencies
COPY requirements.txt .
RUN uv pip install --python=/opt/venv/bin/python -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application
COPY . .

# Non-root user
RUN useradd --create-home app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

---

## Distroless Images (Maximum Security)

Google's distroless images contain only the application and runtime:

```dockerfile
# Dockerfile
# Stage 1: Build
FROM python:3.12-slim AS builder

WORKDIR /app

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

# Stage 2: Distroless runtime
FROM gcr.io/distroless/python3-debian12

WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Copy application
COPY --from=builder /app .

# Distroless runs as nonroot by default
USER nonroot

EXPOSE 8000

# Distroless requires full path
CMD ["/opt/venv/bin/python", "-m", "gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

---

## Alpine-Based Builds

Smaller but requires extra care for C extensions:

```dockerfile
# Dockerfile
# Stage 1: Build
FROM python:3.12-alpine AS builder

WORKDIR /app

# Install build dependencies
RUN apk add --no-cache \
    build-base \
    libffi-dev \
    postgresql-dev

# Create virtual environment
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Runtime
FROM python:3.12-alpine AS runtime

WORKDIR /app

# Install runtime dependencies only
RUN apk add --no-cache \
    libpq \
    libffi

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

# Non-root user
RUN adduser -D app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["gunicorn", "--bind", "0.0.0.0:8000", "app:app"]
```

---

## FastAPI Production Build

Complete example for FastAPI:

```dockerfile
# Dockerfile
ARG PYTHON_VERSION=3.12

# Stage 1: Build
FROM python:${PYTHON_VERSION}-slim AS builder

WORKDIR /app

# Install build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv for fast package installation
COPY --from=ghcr.io/astral-sh/uv:latest /uv /bin/uv

# Create virtual environment
RUN uv venv /opt/venv

# Install dependencies
COPY requirements.txt .
RUN uv pip install --python=/opt/venv/bin/python -r requirements.txt

# Stage 2: Runtime
FROM python:${PYTHON_VERSION}-slim AS runtime

# Security: Don't run as root
RUN groupadd --gid 1000 app \
    && useradd --uid 1000 --gid app --shell /bin/bash --create-home app

WORKDIR /app

# Copy virtual environment
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1

# Copy application code
COPY --chown=app:app . .

USER app

EXPOSE 8000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8000/health')"

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]
```

### requirements.txt for FastAPI

```text
fastapi==0.109.0
uvicorn[standard]==0.27.0
pydantic==2.5.3
sqlalchemy==2.0.25
asyncpg==0.29.0
redis==5.0.1
httpx==0.26.0
python-jose[cryptography]==3.3.0
passlib[bcrypt]==1.7.4
```

---

## Django Production Build

```dockerfile
# Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Collect static files
FROM builder AS static

COPY . .
RUN python manage.py collectstatic --noinput

# Stage 3: Runtime
FROM python:3.12-slim AS runtime

WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    DJANGO_SETTINGS_MODULE=config.settings.production

COPY . .
COPY --from=static /app/staticfiles ./staticfiles

RUN useradd --create-home app && chown -R app:app /app
USER app

EXPOSE 8000

CMD ["gunicorn", "config.wsgi:application", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

---

## Layer Caching Optimization

Order instructions for maximum cache reuse:

```dockerfile
# Dockerfile
FROM python:3.12-slim AS builder

WORKDIR /app

# 1. System dependencies (rarely change)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# 2. Python environment (rarely changes)
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# 3. Dependencies (changes occasionally)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# 4. Application code (changes frequently)
COPY . .

FROM python:3.12-slim AS runtime

WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY --from=builder /app .

CMD ["python", "-m", "app"]
```

---

## .dockerignore

Essential for smaller build contexts:

```text
# .dockerignore
# Git
.git
.gitignore

# Python
__pycache__
*.py[cod]
*$py.class
*.so
.Python
.venv
venv
ENV

# Testing
.pytest_cache
.coverage
htmlcov
.tox

# IDE
.idea
.vscode
*.swp

# Docker
Dockerfile*
docker-compose*
.docker

# Documentation
docs
*.md
!README.md

# CI/CD
.github
.gitlab-ci.yml
.circleci

# Local files
.env
.env.*
*.log
```

---

## Security Scanning

Add scanning to your build:

```dockerfile
# Dockerfile
FROM python:3.12-slim AS builder

# ... build steps ...

# Security scan stage
FROM builder AS scanner

RUN pip install safety pip-audit

# Check for known vulnerabilities
RUN safety check -r requirements.txt || true
RUN pip-audit || true

# Production stage
FROM python:3.12-slim AS runtime

# ... runtime steps ...
```

### CI Integration

```yaml
# .github/workflows/docker.yml
name: Docker Build

on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Build image
        run: docker build -t myapp:${{ github.sha }} .

      - name: Scan with Trivy
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: myapp:${{ github.sha }}
          severity: HIGH,CRITICAL
```

---

## Size Comparison

Typical image sizes for a Flask app:

| Approach | Size |
|----------|------|
| python:3.12 (single stage) | ~1.1 GB |
| python:3.12-slim (single stage) | ~350 MB |
| python:3.12-slim (multi-stage) | ~150 MB |
| python:3.12-alpine (multi-stage) | ~80 MB |
| Distroless | ~120 MB |

---

## Best Practices

1. **Use multi-stage builds** - separate build and runtime
2. **Choose the right base** - slim for most, alpine if no C extensions
3. **Order layers properly** - dependencies before code
4. **Run as non-root** - security essential
5. **Add health checks** - for orchestration
6. **Use .dockerignore** - reduce context size
7. **Pin versions** - reproducible builds
8. **Scan for vulnerabilities** - before deployment

---

## Conclusion

Multi-stage Docker builds dramatically reduce Python image size and improve security. Key takeaways:

- **Separate build and runtime** stages
- **Copy only what's needed** to final image
- **Use slim base images** for production
- **Run as non-root user** always

---

*Need to monitor your containerized Python apps? [OneUptime](https://oneuptime.com) provides comprehensive container monitoring with resource tracking and alerting.*
