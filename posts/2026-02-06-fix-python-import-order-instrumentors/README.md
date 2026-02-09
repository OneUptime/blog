# How to Fix the Import Order Problem Where Python Instrumentors Must Be Applied Before Library Imports

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Python, Import Order, Instrumentation

Description: Fix the Python import order issue where OpenTelemetry instrumentors must be applied before the instrumented libraries are imported.

Just like in Node.js, Python OpenTelemetry instrumentation depends on import order. Some instrumentors work by monkey-patching library modules. If the library is imported before the instrumentor runs, the patching may be incomplete or ineffective. This post covers the correct patterns for Python.

## The Problem

```python
# app.py - BROKEN ORDER
from flask import Flask  # Flask is imported first
from opentelemetry.instrumentation.flask import FlaskInstrumentor

FlaskInstrumentor().instrument()  # Too late for some patches

app = Flask(__name__)
```

While Flask instrumentation is somewhat forgiving (it patches at the class level), other instrumentors are stricter. Libraries like `requests`, `urllib3`, and database drivers need to be instrumented before they are imported.

## The Strict Case: requests Library

```python
# BROKEN - requests already imported
import requests
from opentelemetry.instrumentation.requests import RequestsInstrumentor
RequestsInstrumentor().instrument()

# The Session class is already imported and cached
response = requests.get("https://api.example.com")  # May not generate a span
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

```
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

The import order rule in Python is the same as in Node.js: set up instrumentation before importing the libraries you want to trace. The `opentelemetry-instrument` CLI is the easiest way to guarantee this order. For manual setup, use a dedicated tracing module that is imported before anything else.
