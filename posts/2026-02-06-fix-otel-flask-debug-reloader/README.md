# How to Fix OpenTelemetry Auto-Instrumentation Breaking Flask Apps When Debug Mode Enables the Reloader

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Flask, Python, Debug Mode

Description: Fix the issue where Flask debug mode reloader causes OpenTelemetry to initialize twice and produce duplicate or missing spans.

Flask's debug mode uses a reloader that spawns a child process to watch for file changes. When OpenTelemetry is initialized in the main process, the child process (which actually serves requests) may not have OpenTelemetry initialized, or it may initialize it twice, leading to duplicate spans or no spans at all.

## The Problem

```python
# app.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor, ConsoleSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor

# Initialize OpenTelemetry
provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(ConsoleSpanExporter()))
trace.set_tracer_provider(provider)
FlaskInstrumentor().instrument()

from flask import Flask
app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello'

if __name__ == '__main__':
    app.run(debug=True)  # This causes the reloader issue
```

When you run this with `debug=True`:
1. Flask starts the main process (OpenTelemetry initializes)
2. Flask's reloader forks a child process (OpenTelemetry may or may not initialize)
3. The child process serves requests
4. On file change, the child process is killed and a new one is spawned

## What Goes Wrong

- The main process initializes OpenTelemetry, but it does not serve requests
- The child process may inherit the provider or may need its own initialization
- If using `opentelemetry-instrument` CLI, it wraps the main process, but the reloader child may not pick up the instrumentation
- Dual initialization can cause duplicate span processors, leading to every span being exported twice

## Fix 1: Guard Initialization with WERKZEUG_RUN_MAIN

Flask's reloader sets the `WERKZEUG_RUN_MAIN` environment variable in the child process. Use this to initialize OpenTelemetry only in the child:

```python
import os
from flask import Flask

app = Flask(__name__)

@app.route('/')
def hello():
    return 'Hello'

def init_telemetry():
    from opentelemetry import trace
    from opentelemetry.sdk.trace import TracerProvider
    from opentelemetry.sdk.trace.export import BatchSpanProcessor
    from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
    from opentelemetry.sdk.resources import Resource, SERVICE_NAME
    from opentelemetry.instrumentation.flask import FlaskInstrumentor

    resource = Resource.create({SERVICE_NAME: "flask-app"})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    FlaskInstrumentor().instrument_app(app)

if __name__ == '__main__':
    if os.environ.get('WERKZEUG_RUN_MAIN') == 'true':
        # We are in the reloader child process - initialize here
        init_telemetry()
    elif not app.debug:
        # Not in debug mode - initialize normally
        init_telemetry()

    app.run(debug=True)
```

## Fix 2: Disable the Reloader

For local development with tracing, disable the reloader:

```python
if __name__ == '__main__':
    init_telemetry()
    app.run(debug=True, use_reloader=False)
```

You lose auto-reload on file changes, but tracing works correctly. You can use an external file watcher (like `watchdog`) to restart the process instead.

## Fix 3: Use the Application Factory Pattern

Flask's application factory pattern works better with OpenTelemetry:

```python
# app/__init__.py
from flask import Flask
from opentelemetry.instrumentation.flask import FlaskInstrumentor

def create_app():
    app = Flask(__name__)

    # Import and register blueprints
    from app.routes import main_bp
    app.register_blueprint(main_bp)

    return app
```

```python
# tracing.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.flask import FlaskInstrumentor

def setup_tracing(app):
    resource = Resource.create({SERVICE_NAME: "flask-app"})
    provider = TracerProvider(resource=resource)
    provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
    trace.set_tracer_provider(provider)
    FlaskInstrumentor().instrument_app(app)
```

```python
# wsgi.py
from app import create_app
from tracing import setup_tracing

app = create_app()
setup_tracing(app)
```

Run in development:

```bash
flask --app wsgi:app run --debug --no-reload
```

## Fix 4: Use opentelemetry-instrument with Flask CLI

The `opentelemetry-instrument` CLI handles initialization:

```bash
opentelemetry-instrument --service_name flask-app flask run --no-reload
```

If you must use the reloader:

```bash
# This may produce duplicate initialization warnings
opentelemetry-instrument flask run --debug
```

## Production Setup (No Reloader)

In production, the reloader is never used. The issue only affects development:

```bash
# Production with gunicorn - no reloader issues
opentelemetry-instrument gunicorn wsgi:app -w 4 -b 0.0.0.0:8000
```

```bash
# Production with direct Python
OTEL_SERVICE_NAME=flask-app \
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 \
opentelemetry-instrument python wsgi.py
```

## Detecting Duplicate Initialization

If you suspect OpenTelemetry is initializing twice, add a check:

```python
import os

_otel_initialized = False

def init_telemetry():
    global _otel_initialized
    if _otel_initialized:
        print("WARNING: OpenTelemetry already initialized, skipping")
        return
    _otel_initialized = True

    # ... initialization code
```

Or check if a TracerProvider is already set:

```python
from opentelemetry import trace

def init_telemetry():
    current_provider = trace.get_tracer_provider()
    if not isinstance(current_provider, trace.ProxyTracerProvider):
        # A real provider is already set - skip initialization
        return

    # ... initialization code
```

The Flask reloader is a development convenience that conflicts with OpenTelemetry's initialization model. The simplest fix is to disable the reloader when tracing. In production, where you use gunicorn or uwsgi, the reloader is not a factor.
