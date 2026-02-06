# How to Fix Django Instrumentation Producing No Traces Because DJANGO_SETTINGS_MODULE Is Not Set

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Django, Python, Configuration

Description: Resolve the silent failure where Django OpenTelemetry instrumentation produces no traces due to a missing DJANGO_SETTINGS_MODULE.

The OpenTelemetry Django instrumentation requires `DJANGO_SETTINGS_MODULE` to be set as an environment variable before the instrumentation is applied. Without it, Django's internals are not properly initialized, and the instrumentation silently fails to produce spans. There is no error message pointing to this specific issue.

## The Problem

```bash
# This produces no traces
opentelemetry-instrument python manage.py runserver
```

Or in your code:

```python
from opentelemetry.instrumentation.django import DjangoInstrumentor
DjangoInstrumentor().instrument()
# No error, but no spans either
```

## Why It Happens

Django's URL routing, middleware, and request handling are all configured via the settings module. The Django instrumentation wraps Django's request handling pipeline. If `DJANGO_SETTINGS_MODULE` is not set, Django cannot resolve its configuration, and the instrumentation's attempt to patch the request pipeline fails silently.

## The Fix

Set `DJANGO_SETTINGS_MODULE` before running your application:

```bash
# Set the environment variable
export DJANGO_SETTINGS_MODULE=myproject.settings

# Then run with instrumentation
opentelemetry-instrument python manage.py runserver
```

Or in a single command:

```bash
DJANGO_SETTINGS_MODULE=myproject.settings \
OTEL_SERVICE_NAME=django-app \
OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318 \
opentelemetry-instrument python manage.py runserver
```

## Setting It in manage.py

Django's `manage.py` usually sets this variable. Make sure it is not overridden:

```python
#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys

def main():
    os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')
    # ... rest of manage.py
```

The `os.environ.setdefault` call sets the variable only if it is not already set. If you are running with `opentelemetry-instrument`, the variable must be set before the instrumentation kicks in, which happens before `manage.py` runs.

## Manual Instrumentation Setup

If you prefer manual setup over `opentelemetry-instrument`:

```python
# myproject/tracing.py
import os

# MUST be set before Django instrumentation
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.resources import Resource, SERVICE_NAME
from opentelemetry.instrumentation.django import DjangoInstrumentor

resource = Resource.create({SERVICE_NAME: "django-app"})
provider = TracerProvider(resource=resource)
provider.add_span_processor(BatchSpanProcessor(OTLPSpanExporter()))
trace.set_tracer_provider(provider)

# Instrument Django
DjangoInstrumentor().instrument()
```

Then in your `wsgi.py`:

```python
# myproject/wsgi.py
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# Import tracing setup BEFORE getting the application
import myproject.tracing  # noqa: F401

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
```

## ASGI Setup (Django Channels)

For Django with ASGI:

```python
# myproject/asgi.py
import os
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'myproject.settings')

# Import tracing before getting the ASGI application
import myproject.tracing  # noqa: F401

from django.core.asgi import get_asgi_application
application = get_asgi_application()
```

## Gunicorn Production Setup

```bash
# gunicorn with WSGI
DJANGO_SETTINGS_MODULE=myproject.settings \
OTEL_SERVICE_NAME=django-app \
OTEL_EXPORTER_OTLP_ENDPOINT=http://collector:4318 \
opentelemetry-instrument gunicorn myproject.wsgi:application -w 4
```

Or in a gunicorn config file:

```python
# gunicorn.conf.py
import os
os.environ['DJANGO_SETTINGS_MODULE'] = 'myproject.settings'

bind = "0.0.0.0:8000"
workers = 4

def post_fork(server, worker):
    from opentelemetry.instrumentation.django import DjangoInstrumentor
    DjangoInstrumentor().instrument()
```

## Docker Setup

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt
COPY . .

ENV DJANGO_SETTINGS_MODULE=myproject.settings
ENV OTEL_SERVICE_NAME=django-app

CMD ["opentelemetry-instrument", "gunicorn", "myproject.wsgi:application", "-w", "4", "-b", "0.0.0.0:8000"]
```

## Verifying Traces

After fixing the settings module issue, verify that Django spans appear:

```bash
DJANGO_SETTINGS_MODULE=myproject.settings \
OTEL_TRACES_EXPORTER=console \
opentelemetry-instrument python manage.py runserver
```

Make a request and check stdout for spans like:

```
GET /api/users  [================] 45ms
  django.middleware  [==]  5ms
  django.view  [============]  35ms
```

## Common Related Issues

- If you use `django-environ` or `python-decouple`, make sure the settings module is available before those libraries try to read configuration
- For testing, set `DJANGO_SETTINGS_MODULE` in your test configuration (pytest.ini, setup.cfg) as well
- Split settings (base.py, production.py, development.py) work fine as long as the environment variable points to the correct one

The `DJANGO_SETTINGS_MODULE` requirement is a Django-specific quirk that catches many developers off guard. Set it as an environment variable before anything Django-related runs, and the instrumentation will work correctly.
