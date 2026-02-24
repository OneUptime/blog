# How to Propagate Trace Headers in Python Applications with Istio

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Python, Distributed Tracing, Flask, FastAPI, Observability

Description: How to implement Istio trace header propagation in Python applications using Flask, FastAPI, Django, and popular HTTP libraries like requests and httpx.

---

Python services running in an Istio mesh need to propagate trace headers for distributed tracing to work correctly. The Istio sidecar creates trace spans at the proxy level, but connecting those spans into a full end-to-end trace requires your application code to forward specific HTTP headers from incoming requests to all outgoing HTTP calls.

This guide covers multiple approaches for different Python frameworks and HTTP clients.

## Headers to Propagate

```python
TRACE_HEADERS = [
    'x-request-id',
    'x-b3-traceid',
    'x-b3-spanid',
    'x-b3-parentspanid',
    'x-b3-sampled',
    'x-b3-flags',
    'b3',
    'traceparent',
    'tracestate',
]
```

## Method 1: Flask with Thread-Local Storage

Flask uses threads by default (with Gunicorn's sync workers), so thread-local storage works well:

```python
from flask import Flask, request, g
import requests as http_requests

app = Flask(__name__)

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'b3', 'traceparent', 'tracestate',
]

@app.before_request
def capture_trace_headers():
    """Capture trace headers from the incoming request."""
    g.trace_headers = {}
    for header in TRACE_HEADERS:
        value = request.headers.get(header)
        if value:
            g.trace_headers[header] = value


def traced_get(url, **kwargs):
    """Make a GET request with trace headers included."""
    headers = kwargs.pop('headers', {})
    headers.update(getattr(g, 'trace_headers', {}))
    return http_requests.get(url, headers=headers, **kwargs)


def traced_post(url, **kwargs):
    """Make a POST request with trace headers included."""
    headers = kwargs.pop('headers', {})
    headers.update(getattr(g, 'trace_headers', {}))
    return http_requests.post(url, headers=headers, **kwargs)


@app.route('/api/orders')
def get_orders():
    # Trace headers are automatically included
    products = traced_get('http://product-service:8000/api/products')
    inventory = traced_get('http://inventory-service:8000/api/stock')

    return {
        'orders': [],
        'products': products.json(),
        'inventory': inventory.json()
    }
```

## Method 2: Flask with a Custom Session

For a more reusable approach, create a traced requests Session:

```python
import requests as http_requests
from flask import g

class TracedSession(http_requests.Session):
    """A requests Session that automatically includes trace headers."""

    def request(self, method, url, **kwargs):
        headers = kwargs.pop('headers', {}) or {}
        trace_headers = getattr(g, 'trace_headers', {})
        headers.update(trace_headers)
        kwargs['headers'] = headers
        return super().request(method, url, **kwargs)


# Create a module-level session
traced_session = TracedSession()

# Usage in routes
@app.route('/api/orders')
def get_orders():
    products = traced_session.get('http://product-service:8000/api/products')
    return {'products': products.json()}
```

## Method 3: FastAPI with contextvars

FastAPI is async, so you need `contextvars` instead of thread-local storage:

```python
from fastapi import FastAPI, Request
from contextvars import ContextVar
import httpx

app = FastAPI()

trace_headers_ctx: ContextVar[dict] = ContextVar('trace_headers', default={})

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'b3', 'traceparent', 'tracestate',
]

@app.middleware('http')
async def capture_trace_headers(request: Request, call_next):
    headers = {}
    for header in TRACE_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value

    trace_headers_ctx.set(headers)
    response = await call_next(request)
    return response


async def traced_get(url: str, **kwargs):
    """Make a traced async GET request."""
    headers = kwargs.pop('headers', {}) or {}
    headers.update(trace_headers_ctx.get())
    async with httpx.AsyncClient() as client:
        return await client.get(url, headers=headers, **kwargs)


async def traced_post(url: str, **kwargs):
    """Make a traced async POST request."""
    headers = kwargs.pop('headers', {}) or {}
    headers.update(trace_headers_ctx.get())
    async with httpx.AsyncClient() as client:
        return await client.post(url, headers=headers, **kwargs)


@app.get('/api/orders')
async def get_orders():
    products = await traced_get('http://product-service:8000/api/products')
    inventory = await traced_get('http://inventory-service:8000/api/stock')

    return {
        'orders': [],
        'products': products.json(),
        'inventory': inventory.json()
    }
```

## Method 4: FastAPI with a Reusable httpx Client

For better connection pooling, use a persistent httpx client with an event hook:

```python
from fastapi import FastAPI, Request
from contextvars import ContextVar
import httpx

app = FastAPI()
trace_headers_ctx: ContextVar[dict] = ContextVar('trace_headers', default={})

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'b3', 'traceparent', 'tracestate',
]


async def inject_trace_headers(request: httpx.Request):
    """httpx event hook to inject trace headers."""
    trace_headers = trace_headers_ctx.get()
    for key, value in trace_headers.items():
        request.headers[key] = value


# Create a client with the event hook
traced_client = httpx.AsyncClient(
    event_hooks={'request': [inject_trace_headers]},
    timeout=30.0,
)


@app.middleware('http')
async def capture_trace_headers(request: Request, call_next):
    headers = {}
    for header in TRACE_HEADERS:
        value = request.headers.get(header)
        if value:
            headers[header] = value
    trace_headers_ctx.set(headers)
    response = await call_next(request)
    return response


@app.get('/api/orders')
async def get_orders():
    # Trace headers are automatically injected
    products = await traced_client.get('http://product-service:8000/api/products')
    inventory = await traced_client.get('http://inventory-service:8000/api/stock')

    return {
        'orders': [],
        'products': products.json(),
        'inventory': inventory.json()
    }


@app.on_event('shutdown')
async def shutdown():
    await traced_client.aclose()
```

## Method 5: Django Middleware

For Django applications:

```python
# middleware/trace_headers.py
import threading

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'b3', 'traceparent', 'tracestate',
]

_thread_local = threading.local()


def get_trace_headers():
    """Get trace headers for the current request."""
    return getattr(_thread_local, 'trace_headers', {})


class TraceHeaderMiddleware:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        headers = {}
        for header in TRACE_HEADERS:
            # Django converts headers to META format
            meta_key = f'HTTP_{header.upper().replace("-", "_")}'
            value = request.META.get(meta_key)
            if value:
                headers[header] = value

        _thread_local.trace_headers = headers
        try:
            response = self.get_response(request)
        finally:
            _thread_local.trace_headers = {}

        return response
```

Add it to Django settings:

```python
# settings.py
MIDDLEWARE = [
    'middleware.trace_headers.TraceHeaderMiddleware',
    # ... other middleware
]
```

Use the helper in views:

```python
# views.py
import requests
from middleware.trace_headers import get_trace_headers
from django.http import JsonResponse

def order_list(request):
    trace_headers = get_trace_headers()
    products = requests.get(
        'http://product-service:8000/api/products',
        headers=trace_headers,
        timeout=10
    )
    return JsonResponse({'products': products.json()})
```

## Method 6: Using a Decorator Pattern

A clean approach that works with any framework:

```python
from functools import wraps
from contextvars import ContextVar

trace_ctx: ContextVar[dict] = ContextVar('trace_ctx', default={})

TRACE_HEADERS = [
    'x-request-id', 'x-b3-traceid', 'x-b3-spanid',
    'x-b3-parentspanid', 'x-b3-sampled', 'x-b3-flags',
    'b3', 'traceparent', 'tracestate',
]


def with_tracing(header_source):
    """Decorator that captures trace headers from the request."""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            headers = {}
            for h in TRACE_HEADERS:
                val = header_source(*args, **kwargs).get(h)
                if val:
                    headers[h] = val
            trace_ctx.set(headers)
            return await func(*args, **kwargs)

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            headers = {}
            for h in TRACE_HEADERS:
                val = header_source(*args, **kwargs).get(h)
                if val:
                    headers[h] = val
            trace_ctx.set(headers)
            return func(*args, **kwargs)

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        return sync_wrapper
    return decorator
```

## Method 7: OpenTelemetry Auto-Instrumentation

The least-code approach is using OpenTelemetry's Python instrumentation:

```bash
pip install opentelemetry-distro opentelemetry-instrumentation
opentelemetry-bootstrap -a install
```

Run your application with auto-instrumentation:

```bash
opentelemetry-instrument \
  --traces_exporter none \
  --propagators tracecontext,b3multi \
  python app.py
```

Or in your Dockerfile:

```dockerfile
RUN pip install opentelemetry-distro opentelemetry-instrumentation
RUN opentelemetry-bootstrap -a install

CMD ["opentelemetry-instrument", "--traces_exporter", "none", "--propagators", "tracecontext,b3multi", "gunicorn", "-b", "0.0.0.0:8000", "app:create_app()"]
```

Setting `--traces_exporter none` is important because Istio handles trace export through the sidecar. You only need the instrumentation library for header propagation.

This automatically instruments:
- Flask
- FastAPI
- Django
- requests
- httpx
- aiohttp
- urllib3
- grpcio

## Testing Trace Propagation

```python
import pytest
from unittest.mock import patch, MagicMock

def test_trace_header_propagation(client):
    """Test that trace headers are forwarded to downstream services."""
    trace_headers = {
        'x-b3-traceid': '463ac35c9f6413ad48485a3953bb6124',
        'x-b3-spanid': '0020000000000001',
        'x-b3-sampled': '1',
    }

    with patch('requests.get') as mock_get:
        mock_get.return_value = MagicMock(
            json=lambda: {'products': []},
            status_code=200
        )

        response = client.get('/api/orders', headers=trace_headers)
        assert response.status_code == 200

        # Verify downstream call included trace headers
        call_kwargs = mock_get.call_args
        sent_headers = call_kwargs.kwargs.get('headers', {})
        assert sent_headers['x-b3-traceid'] == '463ac35c9f6413ad48485a3953bb6124'
        assert sent_headers['x-b3-spanid'] == '0020000000000001'
```

## Common Python Pitfalls

**Gevent and greenlets**: If you use Gevent workers in Gunicorn, `threading.local()` works per greenlet, not per thread. This is actually what you want, but be aware of it.

**Asyncio and thread mixing**: If your FastAPI app calls synchronous code that runs in a thread pool (via `run_in_executor`), the `ContextVar` values are copied to the thread automatically in Python 3.7+.

**Connection pooling with requests**: The `requests` library uses connection pooling by default via urllib3. This is fine with Istio because connections go through the sidecar. But make sure you are not caching a Session with stale trace headers.

**Forgetting about background tasks**: If your request handler spawns a background task (like with FastAPI's `BackgroundTasks`), the `ContextVar` context is preserved. But if you use Celery or a separate queue, you need to embed trace IDs in the task payload.

Trace header propagation in Python is straightforward with the middleware pattern. Pick the approach that matches your framework (Flask's `g` object, FastAPI's `ContextVar`, or Django's middleware), and make sure every outgoing HTTP call includes the captured headers.
