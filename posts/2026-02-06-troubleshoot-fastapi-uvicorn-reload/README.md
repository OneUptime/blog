# How to Troubleshoot FastAPI Instrumentation Failing with uvicorn --reload and --workers Flags

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, FastAPI, Python, Uvicorn

Description: Resolve OpenTelemetry instrumentation issues caused by uvicorn's reload mode and multi-worker process forking in FastAPI apps.

FastAPI applications typically run under uvicorn, which has two modes that break OpenTelemetry: `--reload` (for development) and `--workers N` (for production). Both modes create child processes, and OpenTelemetry initialization in the parent process does not carry over correctly to the children.

## The Problem with --reload

```bash
# This often breaks OpenTelemetry
uvicorn main:app --reload
```

The `--reload` flag starts a file watcher in the main process and runs your application in a subprocess. When files change, the subprocess is killed and restarted. If OpenTelemetry is initialized at module level, it runs in both the main and subprocess, potentially causing conflicts.

## The Problem with --workers

```bash
# Multi-worker mode uses fork()
uvicorn main:app --workers 4
```

With multiple workers, uvicorn forks the main process. The fork copies the parent's memory, including any initialized OpenTelemetry SDK state. This causes problems because:
- All workers share the same exporter connection (which cannot be shared across processes)
- The BatchSpanProcessor background thread is not forked correctly
- Export operations from one worker can interfere with another

## Fix 1: Use Lifespan Events for Initialization

FastAPI supports lifespan events that run in each worker process:

```python
# main.py
from contextlib import asynccontextmanager
from fastapi import FastAPI

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: initialize OpenTelemetry in each worker
    setup_tracing()
    yield
    # Shutdown: flush telemetry
    from opentelemetry import trace
    provider = trace.get_tracer_provider()
    if hasattr(provider, 'shutdown'):
        provider.shutdown()

app = FastAPI(lifespan=lifespan)

def setup_tracing():
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME
    from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

    resource = Resource.create({SERVICE_NAME: "fastapi-app"})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    FastAPIInstrumentor.instrument_app(app)

@app.get("/")
async def root():
    return {"message": "Hello"}
```

## Fix 2: Use post_fork Hook with Gunicorn

For production, use gunicorn with uvicorn workers. Gunicorn has a `post_fork` hook that runs in each worker after forking:

```python
# gunicorn.conf.py
import os

bind = "0.0.0.0:8000"
workers = 4
worker_class = "uvicorn.workers.UvicornWorker"

def post_fork(server, worker):
    """Initialize OpenTelemetry in each worker process."""
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME

    resource = Resource.create({
        SERVICE_NAME: "fastapi-app",
        "worker.id": worker.pid,
    })
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
```

```bash
gunicorn main:app -c gunicorn.conf.py
```

## Fix 3: Use opentelemetry-instrument with uvicorn

The `opentelemetry-instrument` CLI handles single-worker mode well:

```bash
# Single worker - works correctly
opentelemetry-instrument \
  --service_name fastapi-app \
  uvicorn main:app --host 0.0.0.0 --port 8000
```

For multiple workers, it is trickier:

```bash
# Multi-worker - may not work correctly
opentelemetry-instrument \
  uvicorn main:app --workers 4  # Workers don't inherit instrumentation
```

## Fix 4: Disable Reload, Use External Watcher

For development, disable uvicorn's reload and use an external file watcher:

```bash
# Use watchfiles or similar
pip install watchfiles

# Run with external watcher
watchfiles "opentelemetry-instrument uvicorn main:app" .
```

## Programmatic Uvicorn Configuration

If you start uvicorn programmatically, initialize OpenTelemetry before the server starts:

```python
# run.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.fastapi import FastAPIInstrumentor

# Initialize before importing the app
resource = Resource.create({SERVICE_NAME: "fastapi-app"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Now import and instrument
from main import app
FastAPIInstrumentor.instrument_app(app)

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000, reload=False)
```

## Production Docker Setup

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

# Use gunicorn with uvicorn workers for production
CMD ["gunicorn", "main:app", \
     "-c", "gunicorn.conf.py"]
```

The pattern for FastAPI with OpenTelemetry is: initialize in each worker process (not the parent), use lifespan events or gunicorn's post_fork hook, and avoid uvicorn's `--reload` flag when tracing matters. For production, always use gunicorn with uvicorn workers for proper process management.
