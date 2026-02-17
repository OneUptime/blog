# How to Build a Distroless Python Container Image with a Virtual Environment for Cloud Run

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: GCP, Python, Distroless, Docker, Cloud Run, Container, Security

Description: Learn how to build a distroless Python container image using virtual environments and multi-stage builds for secure Cloud Run deployments.

---

Python container images tend to be large. The official Python image based on Debian is over 900MB. Even the slim variant is around 150MB. And all those extra packages - compilers, package managers, shells - are things an attacker can exploit if they gain access to your container.

Distroless Python images strip away everything except the Python runtime and your application. No shell. No pip. No apt. Just Python and your code. Combined with a virtual environment for clean dependency management and a multi-stage build to keep the image lean, you get a production image that is both secure and efficient.

## The Challenge with Python and Distroless

Unlike Go or Java, Python cannot produce a single static binary. Python applications need the Python interpreter, shared libraries, and all their pip packages at runtime. This makes distroless builds trickier than for compiled languages.

The solution is a multi-stage build where you:

1. Install everything in a full Python image with all build tools
2. Create a virtual environment with all dependencies
3. Copy just the virtual environment and your code into the distroless image

## The Multi-Stage Dockerfile

Here is the Dockerfile that makes this work.

```dockerfile
# Stage 1: Build dependencies in a full Python image
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build dependencies for compiled packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

# Create a virtual environment
RUN python -m venv /opt/venv

# Activate the virtual environment for all subsequent commands
ENV PATH="/opt/venv/bin:$PATH"

# Install Python dependencies into the virtual environment
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application source
COPY . .

# Stage 2: Distroless runtime image
FROM gcr.io/distroless/python3-debian12

WORKDIR /app

# Copy the virtual environment from the builder
COPY --from=builder /opt/venv /opt/venv

# Copy the application code
COPY --from=builder /app /app

# Set the virtual environment as the Python path
ENV PYTHONPATH="/opt/venv/lib/python3.12/site-packages"
ENV PATH="/opt/venv/bin:$PATH"

# Cloud Run uses PORT environment variable
ENV PORT=8080

EXPOSE 8080

# Run the application
CMD ["python", "app.py"]
```

The key insight is that the virtual environment in `/opt/venv` is self-contained. It has all the Python packages your application needs. When we copy it to the distroless image, all the dependencies come along.

## A Sample Flask Application

Here is a Flask application to containerize.

```python
# app.py - A Flask API for Cloud Run
import os
from flask import Flask, jsonify
from datetime import datetime

app = Flask(__name__)

@app.route("/")
def index():
    """Root endpoint with service info."""
    return jsonify({
        "service": "python-distroless-demo",
        "timestamp": datetime.utcnow().isoformat(),
        "python_env": "distroless"
    })

@app.route("/health")
def health():
    """Health check endpoint for Cloud Run."""
    return jsonify({"status": "healthy"})

@app.route("/api/items")
def get_items():
    """Sample API endpoint."""
    items = [
        {"id": 1, "name": "Widget", "price": 9.99},
        {"id": 2, "name": "Gadget", "price": 14.99},
        {"id": 3, "name": "Doohickey", "price": 4.99}
    ]
    return jsonify({"items": items})

if __name__ == "__main__":
    port = int(os.environ.get("PORT", 8080))
    # Use the production WSGI server
    from waitress import serve
    serve(app, host="0.0.0.0", port=port)
```

The requirements file.

```text
# requirements.txt
Flask==3.0.0
waitress==2.1.2
```

I am using waitress instead of gunicorn here because gunicorn requires a shell to start workers. Waitress is a pure-Python WSGI server that works well in distroless containers.

## Building and Testing Locally

```bash
# Build the distroless image
docker build -t my-python-app:distroless .

# Test it locally
docker run -p 8080:8080 my-python-app:distroless

# Check the image size
docker images my-python-app:distroless
```

## Handling Compiled Dependencies

Some Python packages (like psycopg2, numpy, or cryptography) need C libraries at runtime. The distroless Python image includes some basic system libraries, but not all.

For packages that need specific shared libraries, you need to copy those from the builder.

```dockerfile
# Stage 1: Builder
FROM python:3.12-slim AS builder

WORKDIR /app

# Install build tools and runtime libraries
RUN apt-get update && apt-get install -y --no-install-recommends \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

RUN python -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Find shared libraries needed by compiled packages
RUN ldd /opt/venv/lib/python3.12/site-packages/*.so 2>/dev/null \
    | grep "=> /" | awk '{print $3}' | sort -u > /tmp/needed-libs.txt || true

COPY . .

# Stage 2: Distroless
FROM gcr.io/distroless/python3-debian12

WORKDIR /app

# Copy the virtual environment
COPY --from=builder /opt/venv /opt/venv

# Copy needed shared libraries for compiled packages
COPY --from=builder /usr/lib/x86_64-linux-gnu/libpq.so* /usr/lib/x86_64-linux-gnu/
COPY --from=builder /usr/lib/x86_64-linux-gnu/libldap*.so* /usr/lib/x86_64-linux-gnu/

COPY --from=builder /app /app

ENV PYTHONPATH="/opt/venv/lib/python3.12/site-packages"
ENV PATH="/opt/venv/bin:$PATH"
ENV PORT=8080

EXPOSE 8080
CMD ["python", "app.py"]
```

## Using Gunicorn with Distroless

If you need gunicorn (for its worker management), you can use it as a Python module instead of as a CLI command.

```python
# gunicorn_config.py - Gunicorn configuration
import os

bind = f"0.0.0.0:{os.environ.get('PORT', '8080')}"
workers = 2
threads = 4
timeout = 120
worker_class = "sync"
```

```dockerfile
# Modified CMD for gunicorn
CMD ["python", "-m", "gunicorn", "--config", "gunicorn_config.py", "app:app"]
```

## Deploying to Cloud Run

```bash
# Build and push to Artifact Registry
docker build -t us-central1-docker.pkg.dev/my-project/my-repo/python-app:v1 .
docker push us-central1-docker.pkg.dev/my-project/my-repo/python-app:v1

# Deploy to Cloud Run
gcloud run deploy python-app \
    --image=us-central1-docker.pkg.dev/my-project/my-repo/python-app:v1 \
    --region=us-central1 \
    --platform=managed \
    --allow-unauthenticated \
    --memory=256Mi \
    --cpu=1 \
    --min-instances=0 \
    --max-instances=10 \
    --port=8080
```

## Cloud Build Integration

```yaml
# cloudbuild.yaml - Build and deploy distroless Python image
steps:
  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'build'
      - '-t'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/python-app:$SHORT_SHA'
      - '.'

  - name: 'gcr.io/cloud-builders/docker'
    args:
      - 'push'
      - 'us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/python-app:$SHORT_SHA'

  - name: 'gcr.io/google.com/cloudsdktool/cloud-sdk'
    entrypoint: 'gcloud'
    args:
      - 'run'
      - 'deploy'
      - 'python-app'
      - '--image=us-central1-docker.pkg.dev/$PROJECT_ID/my-repo/python-app:$SHORT_SHA'
      - '--region=us-central1'
      - '--platform=managed'
```

## Image Size Comparison

Here is how different base images compare for the same Flask application:

- `python:3.12`: ~1.0GB
- `python:3.12-slim`: ~155MB
- `python:3.12-alpine`: ~60MB
- `gcr.io/distroless/python3-debian12`: ~55MB

The distroless image is comparable in size to Alpine but without Alpine's musl compatibility issues.

## Debugging Distroless Python Containers

Since there is no shell, debugging requires different techniques.

**Use the debug variant during development.**

```dockerfile
# For debugging only - not for production
FROM gcr.io/distroless/python3-debian12:debug
```

The debug variant includes a busybox shell.

**Use Cloud Run logs for production debugging.**

```python
# app.py - Add structured logging
import logging
import json
import sys

# Configure structured logging for Cloud Logging
class JsonFormatter(logging.Formatter):
    def format(self, record):
        log_entry = {
            "severity": record.levelname,
            "message": record.getMessage(),
            "module": record.module,
            "timestamp": self.formatTime(record)
        }
        return json.dumps(log_entry)

handler = logging.StreamHandler(sys.stdout)
handler.setFormatter(JsonFormatter())
logging.root.handlers = [handler]
logging.root.setLevel(logging.INFO)

logger = logging.getLogger(__name__)
```

## Wrapping Up

Distroless Python images give you a minimal, secure base for Cloud Run deployments. The multi-stage build with a virtual environment is the key technique - you get all your dependencies installed cleanly in the builder stage and copy only what is needed into the distroless runtime. The result is an image with a tiny attack surface, fast startup times, and significantly less storage usage compared to standard Python images.
