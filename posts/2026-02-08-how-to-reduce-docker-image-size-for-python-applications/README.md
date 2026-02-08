# How to Reduce Docker Image Size for Python Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: docker, python, image optimization, multi-stage builds, slim images, production

Description: Practical techniques to shrink Python Docker images from over 1GB down to under 100MB

---

Python Docker images are sneakily large. A basic Flask API with a few dependencies can produce an image over 1GB when built on the default `python:3.12` base. That size comes from build tools, header files, pip caches, and system packages that your application never uses at runtime. Smaller images deploy faster, pull faster in autoscaling scenarios, and give attackers less to work with. This guide walks through every technique for reducing Python image size, with real numbers at each step.

## The Bloated Starting Point

Here is the Dockerfile that many Python developers use:

```dockerfile
# Starting point: typically 1.1GB+
FROM python:3.12
WORKDIR /app
COPY . .
RUN pip install -r requirements.txt
CMD ["python", "app.py"]
```

```bash
# Build and check the size
docker build -t myapp:bloated .
docker images myapp:bloated --format "{{.Size}}"
# 1.1GB
```

The `python:3.12` base image alone is nearly 1GB because it includes the full Debian operating system, a C compiler, Python development headers, and various system utilities.

## Step 1: Switch to python:slim

The slim variant strips out compilers, development headers, and unnecessary system packages:

```dockerfile
# Slim base: saves ~850MB
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .
CMD ["python", "app.py"]
```

```bash
# Size comparison
docker images --format "table {{.Repository}}:{{.Tag}}\t{{.Size}}"
# python:3.12         1.0GB
# python:3.12-slim    150MB
# python:3.12-alpine  55MB
```

The `--no-cache-dir` flag tells pip not to store downloaded packages in the cache directory, saving space in the image.

## Step 2: Multi-Stage Build

Some Python packages need C compilers to install (cryptography, pandas, numpy, lxml). Install build tools in a builder stage and copy only the installed packages to the production stage:

```dockerfile
# Stage 1: Build - install packages that need compilation
FROM python:3.12-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev libffi-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Stage 2: Production - no compilers, no dev headers
FROM python:3.12-slim
WORKDIR /app

# Install only runtime libraries (not -dev packages)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 && rm -rf /var/lib/apt/lists/*

# Copy the virtual environment with all installed packages
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY . .

RUN useradd --create-home appuser
USER appuser

CMD ["python", "app.py"]
```

The virtual environment trick is important. By installing everything into `/opt/venv` in the builder stage, you can copy the entire environment to the production stage in a single layer. The production stage does not need pip, setuptools, or wheel.

## Step 3: Remove pip from the Production Image

The production container does not need pip. Remove it to save space and reduce the attack surface:

```dockerfile
FROM python:3.12-slim
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Remove pip, setuptools, and wheel from the venv
RUN pip uninstall -y pip setuptools wheel && \
    rm -rf /opt/venv/lib/python3.12/site-packages/pip* \
           /opt/venv/lib/python3.12/site-packages/setuptools* \
           /opt/venv/lib/python3.12/site-packages/wheel*

COPY . .
CMD ["python", "app.py"]
```

## Step 4: Use Pre-Built Wheels

Pre-building wheels in the builder stage avoids repeating compilation work and keeps the production image clean:

```dockerfile
# Stage 1: Build wheels for all dependencies
FROM python:3.12-slim AS wheel-builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc g++ libpq-dev libffi-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /wheels
COPY requirements.txt .
RUN pip wheel --wheel-dir=/wheels --no-cache-dir -r requirements.txt

# Stage 2: Install from pre-built wheels
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 && rm -rf /var/lib/apt/lists/*

# Install from local wheels - no compilation needed
COPY --from=wheel-builder /wheels /tmp/wheels
COPY requirements.txt .
RUN pip install --no-cache-dir --no-index --find-links=/tmp/wheels \
    -r requirements.txt && \
    rm -rf /tmp/wheels

COPY . .
CMD ["python", "app.py"]
```

## Step 5: Alpine for Maximum Size Reduction

Alpine Linux produces the smallest images, but it uses musl libc instead of glibc. Many Python packages with C extensions have trouble compiling or may behave differently on musl:

```dockerfile
# Alpine: smallest possible base, but test carefully
FROM python:3.12-alpine AS builder
RUN apk add --no-cache gcc musl-dev libffi-dev postgresql-dev

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

FROM python:3.12-alpine
RUN apk add --no-cache libpq libffi
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .

USER nobody
CMD ["python", "app.py"]
```

Alpine works well for projects that use pure Python packages or have few native dependencies. If you depend heavily on numpy, pandas, or scipy, stick with slim.

## Step 6: Use Distroless for Security

Google's distroless Python image provides a minimal runtime without a shell or package manager:

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Distroless Python: no shell, no package manager
FROM gcr.io/distroless/python3-debian12
WORKDIR /app

COPY --from=builder /opt/venv /opt/venv
COPY --from=builder /app .

ENV PATH="/opt/venv/bin:$PATH"
CMD ["app.py"]
```

Distroless images are not the smallest option, but they are hardened against common attack vectors.

## Step 7: Clean Up apt and pip Artifacts

Every `apt-get install` and `pip install` leaves behind caches. Clean them in the same RUN instruction:

```dockerfile
FROM python:3.12-slim
WORKDIR /app

# Combine install and cleanup in a single layer
RUN apt-get update && \
    apt-get install -y --no-install-recommends libpq5 curl && \
    apt-get purge -y --auto-remove && \
    rm -rf /var/lib/apt/lists/* /tmp/* /var/tmp/*

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
CMD ["python", "app.py"]
```

If you split the install and cleanup into separate RUN instructions, the cleanup does not actually reduce image size because Docker layers are additive.

## Step 8: Use .dockerignore

```
# .dockerignore
__pycache__
*.pyc
*.pyo
.git
.gitignore
.env
.env.*
.venv
venv
.pytest_cache
.mypy_cache
.ruff_cache
.coverage
htmlcov
dist
build
*.egg-info
.tox
docs
tests
test
*.md
.vscode
.idea
docker-compose*.yml
Dockerfile*
```

## Step 9: Use UV for Smaller Installs

UV's `--compile-bytecode` flag and lean installation approach produces smaller site-packages directories:

```dockerfile
FROM python:3.12-slim AS builder
WORKDIR /app

# Copy uv from its official image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
# UV installs cleanly without leaving caches
RUN uv pip install --no-cache -r requirements.txt

FROM python:3.12-slim
WORKDIR /app
COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"
COPY . .
USER nobody
CMD ["python", "app.py"]
```

## Size Comparison

Measurements for a Flask API with PostgreSQL, Redis, and JWT dependencies (~30 packages):

| Approach | Image Size |
|---|---|
| python:3.12 + all deps | 1.1 GB |
| python:3.12-slim + all deps | 280 MB |
| Multi-stage, slim, prod deps | 180 MB |
| Multi-stage, slim, cleaned | 150 MB |
| Alpine + venv copy | 90 MB |
| Distroless | 120 MB |

## Complete Production Dockerfile

```dockerfile
# syntax=docker/dockerfile:1

# Build stage: compile native extensions
FROM python:3.12-slim AS builder
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc libpq-dev && rm -rf /var/lib/apt/lists/*

WORKDIR /app
RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Production stage: minimal runtime
FROM python:3.12-slim
WORKDIR /app

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 curl && \
    rm -rf /var/lib/apt/lists/* && \
    useradd --create-home appuser

COPY --from=builder /opt/venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH" \
    PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

COPY . .

USER appuser
EXPOSE 8000
CMD ["gunicorn", "app:create_app()", "--bind", "0.0.0.0:8000", "--workers", "4"]
```

Start with multi-stage builds on the slim base. That single change typically cuts image size by 80%. Add Alpine only if your dependencies compile cleanly on musl. The effort-to-reward ratio is best at the slim + multi-stage level for most Python projects.
