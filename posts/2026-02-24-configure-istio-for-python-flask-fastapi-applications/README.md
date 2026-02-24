# How to Configure Istio for Python Flask/FastAPI Applications

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Istio, Python, Flask, FastAPI, Kubernetes, Service Mesh

Description: How to properly configure Istio for Python web applications built with Flask or FastAPI, covering health checks, WSGI/ASGI servers, and tracing.

---

Python web applications running Flask or FastAPI are everywhere in Kubernetes clusters. Whether it is a REST API, a machine learning model serving endpoint, or an internal tool, getting these apps integrated properly with Istio requires some specific configuration. The tricky parts are usually around the WSGI/ASGI server setup, worker processes, and making sure Gunicorn or Uvicorn plays nicely with the sidecar proxy.

## Deployment Setup for Flask with Gunicorn

Flask apps in production should run behind Gunicorn. Here is a deployment that works well with Istio:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ml-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: ml-api
      version: v1
  template:
    metadata:
      labels:
        app: ml-api
        version: v1
    spec:
      containers:
      - name: ml-api
        image: myregistry/ml-api:1.0.0
        ports:
        - name: http-web
          containerPort: 8000
        command: ["gunicorn"]
        args:
        - "--bind=0.0.0.0:8000"
        - "--workers=4"
        - "--timeout=120"
        - "--graceful-timeout=30"
        - "--keep-alive=5"
        - "app:create_app()"
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 2Gi
```

The `--keep-alive=5` setting is important. It tells Gunicorn to keep connections alive for 5 seconds, which aligns well with Envoy's default idle timeout. Without keep-alive, Gunicorn closes connections immediately after each request, which defeats Envoy's connection pooling.

## Deployment Setup for FastAPI with Uvicorn

FastAPI runs on ASGI servers like Uvicorn:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: data-api
  namespace: production
spec:
  replicas: 3
  selector:
    matchLabels:
      app: data-api
      version: v1
  template:
    metadata:
      labels:
        app: data-api
        version: v1
    spec:
      containers:
      - name: data-api
        image: myregistry/data-api:1.0.0
        ports:
        - name: http-web
          containerPort: 8000
        command: ["uvicorn"]
        args:
        - "app.main:app"
        - "--host=0.0.0.0"
        - "--port=8000"
        - "--workers=4"
        - "--timeout-keep-alive=5"
        resources:
          requests:
            cpu: 500m
            memory: 512Mi
          limits:
            cpu: 2000m
            memory: 1Gi
```

## Service Configuration

```yaml
apiVersion: v1
kind: Service
metadata:
  name: ml-api
  namespace: production
spec:
  selector:
    app: ml-api
  ports:
  - name: http-web
    port: 8000
    targetPort: http-web
```

## Health Checks for Flask

Add health check endpoints to your Flask app:

```python
from flask import Flask, jsonify

app = Flask(__name__)

# Track readiness state
_ready = False

def create_app():
    global _ready

    # Initialize database connections, load models, etc.
    init_database()
    load_ml_model()
    _ready = True

    return app

@app.route('/healthz')
def liveness():
    return jsonify({'status': 'alive'}), 200

@app.route('/ready')
def readiness():
    if _ready:
        return jsonify({'status': 'ready'}), 200
    return jsonify({'status': 'not ready'}), 503
```

## Health Checks for FastAPI

FastAPI makes this even cleaner:

```python
from fastapi import FastAPI
from contextlib import asynccontextmanager

ready = False

@asynccontextmanager
async def lifespan(app: FastAPI):
    global ready
    # Startup
    await connect_to_database()
    await load_model()
    ready = True
    yield
    # Shutdown
    await disconnect_from_database()

app = FastAPI(lifespan=lifespan)

@app.get('/healthz')
async def liveness():
    return {'status': 'alive'}

@app.get('/ready')
async def readiness():
    if ready:
        return {'status': 'ready'}
    return JSONResponse(
        status_code=503,
        content={'status': 'not ready'}
    )
```

Configure the probes in your deployment:

```yaml
containers:
- name: data-api
  livenessProbe:
    httpGet:
      path: /healthz
      port: 8000
    initialDelaySeconds: 10
    periodSeconds: 10
    failureThreshold: 3
  readinessProbe:
    httpGet:
      path: /ready
      port: 8000
    initialDelaySeconds: 5
    periodSeconds: 5
    failureThreshold: 3
  startupProbe:
    httpGet:
      path: /healthz
      port: 8000
    periodSeconds: 5
    failureThreshold: 30
```

The startup probe gives the app up to 150 seconds to start, which is plenty for Python apps that might need to load large ML models.

## Trace Header Propagation in Flask

```python
import requests
from flask import Flask, request, g

app = Flask(__name__)

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

@app.before_request
def capture_trace_headers():
    g.trace_headers = {}
    for header in TRACE_HEADERS:
        value = request.headers.get(header)
        if value:
            g.trace_headers[header] = value

def make_downstream_request(url, method='GET', **kwargs):
    """Helper that automatically includes trace headers."""
    headers = kwargs.pop('headers', {})
    headers.update(getattr(g, 'trace_headers', {}))
    return requests.request(method, url, headers=headers, **kwargs)

@app.route('/api/predictions')
def get_predictions():
    # Trace headers are automatically included
    data = make_downstream_request('http://data-service:8000/api/features')
    predictions = run_model(data.json())
    return jsonify({'predictions': predictions})
```

## Trace Header Propagation in FastAPI

```python
from fastapi import FastAPI, Request
from contextvars import ContextVar
import httpx

app = FastAPI()

trace_headers_var: ContextVar[dict] = ContextVar('trace_headers', default={})

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
    trace_headers_var.set(headers)
    response = await call_next(request)
    return response

async def downstream_get(url: str):
    headers = trace_headers_var.get()
    async with httpx.AsyncClient() as client:
        return await client.get(url, headers=headers)

@app.get('/api/predictions')
async def get_predictions():
    response = await downstream_get('http://data-service:8000/api/features')
    predictions = await run_model(response.json())
    return {'predictions': predictions}
```

FastAPI uses `contextvars` instead of Flask's `g` object because it handles async requests.

## Graceful Shutdown

### Gunicorn (Flask)

Gunicorn handles SIGTERM by default with its worker management:

```python
# gunicorn.conf.py
bind = '0.0.0.0:8000'
workers = 4
timeout = 120
graceful_timeout = 30
keepalive = 5

def on_exit(server):
    # Cleanup code
    close_database_connections()
```

### Uvicorn (FastAPI)

FastAPI's lifespan handler takes care of shutdown:

```python
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    await initialize()
    yield
    # Shutdown
    print("Shutting down gracefully")
    await cleanup_connections()
```

Add a preStop hook in the deployment:

```yaml
containers:
- name: data-api
  lifecycle:
    preStop:
      exec:
        command: ["/bin/sh", "-c", "sleep 5"]
spec:
  terminationGracePeriodSeconds: 60
```

## Traffic Management

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ml-api
  namespace: production
spec:
  hosts:
  - ml-api
  http:
  - route:
    - destination:
        host: ml-api
        port:
          number: 8000
    timeout: 120s
    retries:
      attempts: 2
      perTryTimeout: 60s
      retryOn: 5xx,reset,connect-failure
```

Python ML services often need longer timeouts because inference can take time. Set the Istio timeout higher than Gunicorn's worker timeout.

## Circuit Breaking

```yaml
apiVersion: networking.istio.io/v1
kind: DestinationRule
metadata:
  name: ml-api
  namespace: production
spec:
  host: ml-api
  trafficPolicy:
    connectionPool:
      tcp:
        maxConnections: 50
      http:
        http1MaxPendingRequests: 25
        http2MaxRequests: 50
        maxRequestsPerConnection: 5
    outlierDetection:
      consecutive5xxErrors: 3
      interval: 30s
      baseEjectionTime: 60s
      maxEjectionPercent: 30
```

Python apps with multiple Gunicorn workers can handle concurrent requests, but they are still slower than compiled languages. Keep the connection limits conservative.

## Handling Long-Running Requests

Python ML inference endpoints sometimes take 30+ seconds. Make sure the Istio timeout is generous enough and disable retries for these endpoints:

```yaml
apiVersion: networking.istio.io/v1
kind: VirtualService
metadata:
  name: ml-api
spec:
  hosts:
  - ml-api
  http:
  - match:
    - uri:
        prefix: /api/inference
    route:
    - destination:
        host: ml-api
    timeout: 300s
    retries:
      attempts: 0
  - route:
    - destination:
        host: ml-api
    timeout: 30s
```

The `/api/inference` endpoint gets a 5-minute timeout with no retries, while other endpoints use a standard 30-second timeout with retries.

## Common Python + Istio Issues

**Gunicorn worker timeout vs Istio timeout**: If Gunicorn's worker timeout (default 30 seconds) is shorter than a request takes, Gunicorn kills the worker and returns a 502. Istio then sees this as a server error and might retry, creating duplicate requests. Set Gunicorn's timeout higher than your longest expected request.

**GIL and CPU limits**: Python's Global Interpreter Lock means a single worker cannot use more than one CPU core. Use multiple Gunicorn workers (one per CPU core) and set CPU limits accordingly.

**Large request/response bodies**: ML APIs often send large payloads (images, model outputs). Envoy buffers these by default. For very large payloads, you might need to increase Envoy's buffer size or disable buffering.

Getting Flask and FastAPI applications working well in Istio is straightforward once you handle health checks, trace propagation, and timeout coordination. The main Python-specific consideration is worker process management and making sure your WSGI/ASGI server timeouts align with Istio's timeout configuration.
