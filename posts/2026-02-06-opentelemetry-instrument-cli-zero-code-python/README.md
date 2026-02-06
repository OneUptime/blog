# How to Use opentelemetry-instrument CLI for Zero-Code Python Instrumentation

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, CLI, Zero-Code, Auto-Instrumentation, opentelemetry-instrument

Description: Master the opentelemetry-instrument CLI tool to add comprehensive observability to Python applications without modifying a single line of code, including configuration, best practices, and troubleshooting.

The fastest way to add OpenTelemetry to your Python application is to not write any instrumentation code at all. The `opentelemetry-instrument` CLI automatically instruments your application by injecting tracing at runtime, detecting libraries you use, and configuring exporters through environment variables. You can go from zero observability to full distributed tracing in minutes.

## Why Zero-Code Instrumentation

Writing manual instrumentation takes time and introduces bugs. You need to identify every library that needs tracing, add initialization code, configure exporters, and handle edge cases. Zero-code instrumentation eliminates this work.

The `opentelemetry-instrument` tool:
- Automatically detects installed libraries (Flask, Django, requests, SQLAlchemy, etc.)
- Instruments them before your application starts
- Configures exporters from environment variables
- Requires no code changes to your application
- Works with any Python application

## Installation

Install the base instrumentation tool and the libraries for frameworks you use.

```bash
# Install the core instrumentation CLI
pip install opentelemetry-distro opentelemetry-exporter-otlp

# Install automatic instrumentation for your stack
# This command detects and installs instrumentors for installed packages
opentelemetry-bootstrap -a install
```

The bootstrap command examines your environment and installs appropriate instrumentation packages. For example, if you have Flask installed, it installs `opentelemetry-instrumentation-flask`.

## Basic Usage

Run your application with the `opentelemetry-instrument` wrapper instead of running it directly.

```bash
# Before: Run application normally
python app.py

# After: Run with automatic instrumentation
opentelemetry-instrument python app.py
```

That's it. Your application now exports traces to the default OTLP endpoint (localhost:4317).

## Configuring Exporters

Control where traces go using environment variables. No code changes needed.

```bash
# Export to a specific OTLP endpoint
export OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"

# Set service name
export OTEL_SERVICE_NAME="user-service"

# Run instrumented application
opentelemetry-instrument python app.py
```

Here's a complete configuration example:

```bash
#!/bin/bash

# Service identification
export OTEL_SERVICE_NAME="payment-service"
export OTEL_SERVICE_VERSION="1.2.3"
export OTEL_DEPLOYMENT_ENVIRONMENT="production"

# OTLP exporter configuration
export OTEL_EXPORTER_OTLP_ENDPOINT="https://otel-collector.company.com:4317"
export OTEL_EXPORTER_OTLP_PROTOCOL="grpc"

# Optional: Add authentication headers
export OTEL_EXPORTER_OTLP_HEADERS="api-key=your-api-key-here"

# Trace configuration
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="otlp"
export OTEL_LOGS_EXPORTER="otlp"

# Sampling configuration (sample 10% of traces)
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"

# Resource attributes
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,team=payments,region=us-east-1"

# Run application
opentelemetry-instrument python app.py
```

## Example Flask Application

Here's a Flask application that requires zero code changes for full instrumentation.

```python
# app.py - No OpenTelemetry imports needed!
from flask import Flask, jsonify, request
import requests
import time
import random

app = Flask(__name__)

# This will be automatically instrumented
@app.route("/")
def home():
    return jsonify({"message": "Hello, World!"})

@app.route("/users/<int:user_id>")
def get_user(user_id):
    """
    This endpoint will automatically create spans for:
    - HTTP request handling
    - External HTTP call to user API
    - No manual instrumentation needed
    """
    # External HTTP call - automatically traced
    response = requests.get(f"https://jsonplaceholder.typicode.com/users/{user_id}")

    if response.status_code == 200:
        return jsonify(response.json())
    else:
        return jsonify({"error": "User not found"}), 404

@app.route("/slow")
def slow_endpoint():
    """Simulate slow operation"""
    # Even plain Python code inside HTTP handlers is traced
    time.sleep(random.uniform(0.1, 0.5))
    return jsonify({"status": "completed"})

@app.route("/chain")
def chain_requests():
    """
    Make multiple requests in sequence.
    All automatically appear as child spans.
    """
    users = []
    for user_id in range(1, 4):
        response = requests.get(f"http://localhost:5000/users/{user_id}")
        if response.status_code == 200:
            users.append(response.json())

    return jsonify({"users": users})

if __name__ == "__main__":
    # No OpenTelemetry setup code required
    app.run(host="0.0.0.0", port=5000)
```

Run this application with automatic instrumentation:

```bash
# Set configuration
export OTEL_SERVICE_NAME="flask-app"
export OTEL_EXPORTER_OTLP_ENDPOINT="http://localhost:4317"

# Run with instrumentation
opentelemetry-instrument python app.py
```

Every HTTP request, external call, and database query is automatically traced without modifying `app.py`.

## Database Auto-Instrumentation

Database queries are automatically instrumented when you use supported libraries.

```python
# db_app.py - SQLAlchemy automatically instrumented
from flask import Flask, jsonify
from sqlalchemy import create_engine, Column, Integer, String
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker

app = Flask(__name__)

# Database setup - no OpenTelemetry code needed
engine = create_engine("postgresql://user:pass@localhost:5432/mydb")
Session = sessionmaker(bind=engine)
Base = declarative_base()

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True)
    name = Column(String(100))
    email = Column(String(100))

Base.metadata.create_all(engine)

@app.route("/users")
def list_users():
    """
    Database queries are automatically traced.
    Each SELECT statement creates a span with:
    - Query text
    - Duration
    - Database name
    - Table names
    """
    session = Session()
    users = session.query(User).all()
    session.close()

    return jsonify([
        {"id": u.id, "name": u.name, "email": u.email}
        for u in users
    ])

@app.route("/users/<int:user_id>")
def get_user(user_id):
    """Single user lookup - also automatically traced"""
    session = Session()
    user = session.query(User).filter(User.id == user_id).first()
    session.close()

    if user:
        return jsonify({"id": user.id, "name": user.name})
    else:
        return jsonify({"error": "Not found"}), 404

if __name__ == "__main__":
    app.run(port=5000)
```

Run with instrumentation:

```bash
export OTEL_SERVICE_NAME="db-app"

# This automatically instruments SQLAlchemy, Flask, and psycopg2
opentelemetry-instrument python db_app.py
```

## Async Application Support

Zero-code instrumentation works with async applications too.

```python
# async_app.py - FastAPI with async/await
from fastapi import FastAPI
import httpx
import asyncio

app = FastAPI()

@app.get("/")
async def root():
    """Async endpoint - automatically traced"""
    return {"message": "Hello Async World"}

@app.get("/fetch/{user_id}")
async def fetch_user(user_id: int):
    """
    Async HTTP calls are automatically traced.
    Works with httpx, aiohttp, etc.
    """
    async with httpx.AsyncClient() as client:
        response = await client.get(
            f"https://jsonplaceholder.typicode.com/users/{user_id}"
        )
        return response.json()

@app.get("/parallel")
async def parallel_requests():
    """
    Concurrent operations are traced correctly.
    Parent-child relationships preserved.
    """
    async with httpx.AsyncClient() as client:
        tasks = [
            client.get(f"https://jsonplaceholder.typicode.com/users/{i}")
            for i in range(1, 4)
        ]
        responses = await asyncio.gather(*tasks)

        return {
            "users": [r.json() for r in responses]
        }

# No special async instrumentation code needed
```

Run with Uvicorn and automatic instrumentation:

```bash
export OTEL_SERVICE_NAME="async-app"

# Instrument both FastAPI and Uvicorn automatically
opentelemetry-instrument uvicorn async_app:app --host 0.0.0.0 --port 8000
```

## Advanced Configuration

Fine-tune instrumentation behavior with additional environment variables.

```bash
#!/bin/bash

# Exclude specific URLs from tracing
export OTEL_PYTHON_FLASK_EXCLUDED_URLS="/health,/metrics,/ready"

# Exclude specific HTTP request headers from spans
export OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SANITIZE_FIELDS="authorization,cookie,x-api-key"

# Capture HTTP request/response headers
export OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_REQUEST="content-type,user-agent"
export OTEL_INSTRUMENTATION_HTTP_CAPTURE_HEADERS_SERVER_RESPONSE="content-type"

# SQLAlchemy specific configuration
export OTEL_PYTHON_SQLALCHEMY_CAPTURE_STATEMENT_PARAMS="true"

# Logging integration
export OTEL_PYTHON_LOGGING_AUTO_INSTRUMENTATION_ENABLED="true"

# Propagator configuration for distributed tracing
export OTEL_PROPAGATORS="tracecontext,baggage"

# Run application
opentelemetry-instrument python app.py
```

## Selective Instrumentation

Control which libraries are instrumented using command-line flags.

```bash
# List available instrumentors
opentelemetry-instrument --list

# This shows output like:
# - flask
# - requests
# - sqlalchemy
# - psycopg2
# - redis
# etc.

# Instrument only specific libraries
opentelemetry-instrument \
    --instrumentors flask,requests \
    python app.py

# Exclude specific instrumentors
opentelemetry-instrument \
    --exclude-instrumentors redis,celery \
    python app.py
```

## Debugging Instrumentation

Enable debug logging to troubleshoot instrumentation issues.

```bash
# Enable OpenTelemetry debug logging
export OTEL_LOG_LEVEL="debug"

# Enable Python logging to see what's being instrumented
export OTEL_PYTHON_LOG_LEVEL="debug"

# Run application
opentelemetry-instrument python app.py
```

You'll see output showing:

```text
Instrumented flask
Instrumented requests
Instrumented sqlalchemy
Instrumented urllib3
Starting trace exporter to http://localhost:4317
```

## Multi-Process Applications

For applications using multiple processes (Gunicorn, Celery), each process is automatically instrumented.

```bash
# Gunicorn with 4 worker processes
# Each worker is independently instrumented
export OTEL_SERVICE_NAME="gunicorn-app"

opentelemetry-instrument \
    gunicorn app:app \
    --workers 4 \
    --bind 0.0.0.0:8000
```

## Celery Task Tracing

Celery tasks are automatically instrumented, including distributed trace context propagation.

```python
# tasks.py - No OpenTelemetry code needed
from celery import Celery
import requests

app = Celery("tasks", broker="redis://localhost:6379/0")

@app.task
def fetch_user_data(user_id):
    """
    Task automatically traced.
    HTTP calls within task automatically traced.
    Parent-child relationships maintained.
    """
    response = requests.get(
        f"https://jsonplaceholder.typicode.com/users/{user_id}"
    )
    return response.json()

@app.task
def process_batch(user_ids):
    """Batch processing with automatic tracing"""
    results = []
    for user_id in user_ids:
        # Each sub-task is traced
        result = fetch_user_data.delay(user_id)
        results.append(result.get())
    return results
```

Run Celery workers with instrumentation:

```bash
export OTEL_SERVICE_NAME="celery-worker"

# Worker automatically instrumented
opentelemetry-instrument celery -A tasks worker --loglevel=info
```

## Docker Integration

Use in Docker containers by modifying the entrypoint.

```dockerfile
FROM python:3.11-slim

WORKDIR /app

# Install application dependencies
COPY requirements.txt .
RUN pip install -r requirements.txt

# Install OpenTelemetry instrumentation
RUN pip install opentelemetry-distro opentelemetry-exporter-otlp
RUN opentelemetry-bootstrap -a install

# Copy application code
COPY . .

# Environment variables for instrumentation
ENV OTEL_SERVICE_NAME="dockerized-app"
ENV OTEL_EXPORTER_OTLP_ENDPOINT="http://otel-collector:4317"
ENV OTEL_TRACES_EXPORTER="otlp"

# Use opentelemetry-instrument as entrypoint
ENTRYPOINT ["opentelemetry-instrument"]
CMD ["python", "app.py"]
```

## Kubernetes Deployment

Deploy instrumented applications in Kubernetes using environment variables.

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: instrumented-app
spec:
  replicas: 3
  selector:
    matchLabels:
      app: instrumented-app
  template:
    metadata:
      labels:
        app: instrumented-app
    spec:
      containers:
      - name: app
        image: your-app:latest
        env:
        # OpenTelemetry configuration
        - name: OTEL_SERVICE_NAME
          value: "k8s-app"
        - name: OTEL_EXPORTER_OTLP_ENDPOINT
          value: "http://otel-collector.observability:4317"
        - name: OTEL_RESOURCE_ATTRIBUTES
          value: "deployment.environment=production,k8s.namespace=$(NAMESPACE)"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace

        # Use instrumented entrypoint
        command: ["opentelemetry-instrument"]
        args: ["python", "app.py"]
```

## Instrumentation Flow

Understanding how zero-code instrumentation works helps with troubleshooting:

```mermaid
graph TD
    A[Run: opentelemetry-instrument python app.py] --> B[Bootstrap Phase]
    B --> C[Detect Installed Libraries]
    C --> D{Library Instrumented?}

    D -->|Yes| E[Load Instrumentor]
    D -->|No| F[Skip Library]

    E --> G[Patch Library Functions]
    G --> H[Inject Tracing Code]

    F --> I[Continue Bootstrap]
    H --> I

    I --> J{All Libraries Processed?}
    J -->|No| C
    J -->|Yes| K[Configure Exporters]

    K --> L[Read Environment Variables]
    L --> M[Initialize OTLP Exporter]
    M --> N[Set Trace Provider]
    N --> O[Start Application]

    O --> P[Application Runs Normally]
    P --> Q[Traces Export Automatically]
```

## Performance Considerations

Auto-instrumentation adds minimal overhead, but monitor in production:

```bash
# Use sampling to reduce overhead
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.1"  # Sample 10% of traces

# Adjust batch export settings
export OTEL_BSP_SCHEDULE_DELAY="5000"  # Export every 5 seconds
export OTEL_BSP_MAX_QUEUE_SIZE="2048"  # Queue size
export OTEL_BSP_MAX_EXPORT_BATCH_SIZE="512"  # Batch size

opentelemetry-instrument python app.py
```

## Common Issues and Solutions

**Issue**: Traces not appearing in backend.

```bash
# Solution: Enable debug logging
export OTEL_LOG_LEVEL="debug"
opentelemetry-instrument python app.py

# Check connectivity
curl http://localhost:4317
```

**Issue**: Missing spans for certain operations.

```bash
# Solution: Verify instrumentor is installed
pip list | grep opentelemetry-instrumentation

# Reinstall missing instrumentors
opentelemetry-bootstrap -a install
```

**Issue**: High memory usage.

```bash
# Solution: Reduce queue sizes and enable sampling
export OTEL_BSP_MAX_QUEUE_SIZE="512"
export OTEL_TRACES_SAMPLER="parentbased_traceidratio"
export OTEL_TRACES_SAMPLER_ARG="0.05"
```

**Issue**: Authentication failures with collector.

```bash
# Solution: Add authentication headers
export OTEL_EXPORTER_OTLP_HEADERS="authorization=Bearer your-token"
```

## Best Practices

**Test in Development First**: Run with instrumentation in development to catch issues before production.

**Use Environment-Specific Config**: Different environments need different sampling rates and endpoints. Use environment variables or config management.

**Monitor Overhead**: Track CPU and memory usage after enabling instrumentation. Adjust sampling if needed.

**Version Lock Dependencies**: Pin OpenTelemetry package versions to avoid unexpected behavior from updates.

```bash
# Pin versions in requirements.txt
opentelemetry-distro==0.42b0
opentelemetry-exporter-otlp==1.21.0
```

**Document Configuration**: Keep a README with required environment variables and their purposes.

**Start with Traces Only**: Enable tracing first, then add metrics and logs once you're comfortable.

```bash
# Traces only
export OTEL_TRACES_EXPORTER="otlp"
export OTEL_METRICS_EXPORTER="none"
export OTEL_LOGS_EXPORTER="none"
```

## Migration to Manual Instrumentation

When you need more control, gradually migrate to manual instrumentation:

1. Start with zero-code instrumentation
2. Add custom spans for business logic
3. Gradually replace auto-instrumentation with manual code
4. Remove `opentelemetry-instrument` wrapper when fully manual

This allows incremental adoption without disrupting operations.

## Conclusion

The `opentelemetry-instrument` CLI is the fastest path to observability for Python applications. With zero code changes, you get comprehensive tracing of HTTP requests, database queries, external calls, and async operations. Use environment variables to configure exporters, sampling, and resource attributes. This approach is perfect for getting started quickly, adding observability to legacy applications, or running in environments where code changes are difficult.
