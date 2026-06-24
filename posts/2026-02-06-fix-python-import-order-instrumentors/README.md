# How to Fix the Import Order Problem Where Python Instrumentors Must Be Applied

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Import Order, Instrumentation

Description: Fix the Python import order issue where OpenTelemetry instrumentors must be applied before the instrumented libraries are imported.

Just like in Node.js, Python OpenTelemetry instrumentation can depend on when instrumentation is applied. Some instrumentors work by monkey-patching library modules, classes, or factory functions. If application objects are created before the instrumentor runs, the patching may be incomplete or ineffective. This post covers the safe patterns for Python.

## The Problem

```python
# app.py - fragile global setup

from flask import Flask  # Flask is imported first
from opentelemetry.instrumentation.flask import FlaskInstrumentor

FlaskInstrumentor().instrument()  # Prefer to run global instrumentation before app setup

app = Flask(__name__)
```

While Flask instrumentation is somewhat forgiving, other instrumentors are stricter about when application objects are created. Database and ORM instrumentation often needs to run before engines, connections, or clients are initialized, unless the instrumentor provides an API for instrumenting an existing object.

## The Timing Case: SQLAlchemy Engine

```python
# BROKEN - engine already created before global instrumentation
from sqlalchemy import create_engine
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

engine = create_engine("sqlite:///:memory:")
SQLAlchemyInstrumentor().instrument()

# Use SQLAlchemyInstrumentor().instrument(engine=engine) for an existing engine,
# or apply global instrumentation before engines are created.
```

## The Correct Pattern

Instrument before importing:

```python
# tracing.py - runs first
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME

# Setup provider
resource = Resource.create({SERVICE_NAME: "my-service"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Instrument BEFORE importing the libraries
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.flask import FlaskInstrumentor

RequestsInstrumentor().instrument()
FlaskInstrumentor().instrument()
```

```python
# app.py - imports happen after instrumentation
import tracing  # This runs the instrumentation setup

from flask import Flask  # Now Flask is imported after instrumentation
import requests

app = Flask(__name__)

@app.route("/")
def index():
    response = requests.get("https://api.example.com/data")
    return response.json()
```

## Using opentelemetry-instrument CLI

The `opentelemetry-instrument` command handles this automatically:

```bash
opentelemetry-instrument python app.py
```

The CLI:
1. Sets up the TracerProvider
2. Runs all discovered instrumentors
3. THEN loads your application

This guarantees the correct order. Your application code does not need any instrumentation setup:

```python
# app.py - no OpenTelemetry imports needed
from flask import Flask
import requests

app = Flask(__name__)

@app.route("/")
def index():
    return requests.get("https://api.example.com/data").json()
```

## The instrument_app() Alternative

For Flask and similar frameworks, you can instrument a specific app instance after creation:

```python
from flask import Flask
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)  # Instruments this specific app instance
```

This works regardless of import order because it patches the specific app object, not the Flask module.

## Using a Setup Module

Structure your project to ensure correct import order:

```text
myproject/
  __init__.py
  telemetry.py    # Import this first
  app.py          # Your application
  views.py
  models.py
```

```python
# telemetry.py
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# All instrumentors applied here
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.instrumentation.sqlalchemy import SQLAlchemyInstrumentor

FlaskInstrumentor().instrument()
RequestsInstrumentor().instrument()
SQLAlchemyInstrumentor().instrument()
```

```python
# wsgi.py - entry point
import myproject.telemetry  # Must be first import
from myproject.app import create_app

app = create_app()
```

## WSGI/ASGI Server Integration

For production servers, ensure tracing loads first:

```python
# wsgi.py
import myproject.telemetry  # Initialize tracing first

from myproject.app import create_app
application = create_app()
```

```bash
gunicorn wsgi:application
```

## Django Specifics

Django has its own app loading mechanism. Use `AppConfig.ready()` or the WSGI file:

```python
# myapp/apps.py
from django.apps import AppConfig

class MyAppConfig(AppConfig):
    name = 'myapp'

    def ready(self):
        # This runs after Django's app registry is populated
        from opentelemetry.instrumentation.django import DjangoInstrumentor
        DjangoInstrumentor().instrument()
```

The safe timing rule in Python is similar to Node.js: set up instrumentation before your application imports and initializes the libraries you want to trace. The `opentelemetry-instrument` CLI is the easiest way to guarantee this order. For manual setup, use a dedicated tracing module that is imported before anything else.
