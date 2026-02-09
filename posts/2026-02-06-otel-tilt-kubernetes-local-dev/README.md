# How to Use OpenTelemetry with Tilt for Kubernetes Local Development with Live Trace Feedback

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tilt, Kubernetes, Local Development, Microservices

Description: Integrate OpenTelemetry with Tilt to get live trace feedback as you develop Kubernetes microservices on your local machine.

Tilt is a tool for Kubernetes local development that watches your source code, rebuilds containers, and updates your cluster automatically. When you combine it with OpenTelemetry, every code change triggers a rebuild, and you can immediately see the updated traces in Jaeger. This gives you a fast feedback loop for both application logic and instrumentation.

## Prerequisites

You need:
- A local Kubernetes cluster (kind, minikube, or Docker Desktop Kubernetes)
- Tilt installed (`brew install tilt` on macOS)
- kubectl configured to talk to your cluster

## Project Layout

Here is a typical setup for a two-service application:

```
project/
  Tiltfile
  k8s/
    otel-collector.yaml
    jaeger.yaml
    service-a.yaml
    service-b.yaml
  service-a/
    Dockerfile
    app.py
  service-b/
    Dockerfile
    app.js
```

## Deploying the Observability Stack

Create `k8s/jaeger.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: jaeger
spec:
  replicas: 1
  selector:
    matchLabels:
      app: jaeger
  template:
    metadata:
      labels:
        app: jaeger
    spec:
      containers:
        - name: jaeger
          image: jaegertracing/all-in-one:1.54
          env:
            - name: COLLECTOR_OTLP_ENABLED
              value: "true"
          ports:
            - containerPort: 16686
            - containerPort: 4317
---
apiVersion: v1
kind: Service
metadata:
  name: jaeger
spec:
  selector:
    app: jaeger
  ports:
    - name: ui
      port: 16686
    - name: otlp-grpc
      port: 4317
```

Create `k8s/otel-collector.yaml`:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: otel-collector-config
data:
  config.yaml: |
    receivers:
      otlp:
        protocols:
          grpc:
            endpoint: 0.0.0.0:4317
          http:
            endpoint: 0.0.0.0:4318
    processors:
      batch:
        timeout: 1s
    exporters:
      otlp/jaeger:
        endpoint: jaeger:4317
        tls:
          insecure: true
      debug:
        verbosity: basic
    service:
      pipelines:
        traces:
          receivers: [otlp]
          processors: [batch]
          exporters: [otlp/jaeger, debug]
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 1
  selector:
    matchLabels:
      app: otel-collector
  template:
    metadata:
      labels:
        app: otel-collector
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          args: ["--config", "/etc/otel/config.yaml"]
          volumeMounts:
            - name: config
              mountPath: /etc/otel
          ports:
            - containerPort: 4317
            - containerPort: 4318
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
---
apiVersion: v1
kind: Service
metadata:
  name: otel-collector
spec:
  selector:
    app: otel-collector
  ports:
    - name: otlp-grpc
      port: 4317
    - name: otlp-http
      port: 4318
```

## The Tiltfile

The Tiltfile is where Tilt learns how to build and deploy your services. Create a `Tiltfile` in the project root:

```python
# Tiltfile

# Deploy observability infrastructure first
k8s_yaml('k8s/jaeger.yaml')
k8s_yaml('k8s/otel-collector.yaml')

# Forward the Jaeger UI to localhost
k8s_resource('jaeger', port_forwards=['16686:16686'])

# Service A - Python
docker_build('service-a', './service-a')
k8s_yaml('k8s/service-a.yaml')
k8s_resource('service-a',
  port_forwards=['8001:8000'],
  resource_deps=['otel-collector']
)

# Service B - Node.js
docker_build('service-b', './service-b')
k8s_yaml('k8s/service-b.yaml')
k8s_resource('service-b',
  port_forwards=['8002:8000'],
  resource_deps=['otel-collector']
)
```

The `resource_deps` ensures your application services start after the collector is ready. Port forwards make everything accessible from your browser.

## An Instrumented Service

Here is `service-a/app.py` as an example:

```python
# service-a/app.py
from flask import Flask
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.instrumentation.requests import RequestsInstrumentor
from opentelemetry.sdk.resources import Resource
import requests
import os

# Set up tracing - the collector is reachable at otel-collector:4317
# inside the Kubernetes cluster
resource = Resource.create({"service.name": "service-a"})
provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter(
    endpoint=os.environ.get("OTEL_EXPORTER_OTLP_ENDPOINT", "otel-collector:4317"),
    insecure=True
)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
RequestsInstrumentor().instrument()

tracer = trace.get_tracer(__name__)

@app.route("/")
def index():
    with tracer.start_as_current_span("call-service-b"):
        # Call service B, which is also in the cluster
        response = requests.get("http://service-b:8000/data")
        return {"from_a": "hello", "from_b": response.json()}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8000)
```

## The Development Loop

Start Tilt:

```bash
tilt up
```

Tilt opens a dashboard in your browser showing the status of all resources. It builds your container images, deploys them to Kubernetes, and starts watching for changes.

Now edit `service-a/app.py`. Add a new attribute to the span:

```python
with tracer.start_as_current_span("call-service-b") as span:
    span.setAttribute("target.service", "service-b")
    response = requests.get("http://service-b:8000/data")
```

Save the file. Tilt detects the change, rebuilds the container, and redeploys it. Within seconds, the new version is running. Hit the endpoint and check Jaeger. Your new attribute appears on the span.

This is the live feedback loop: edit code, save, see the updated traces. No manual rebuild or redeploy steps.

## Tips for a Smooth Workflow

Use `live_update` in your Tiltfile to skip full rebuilds when possible. For interpreted languages like Python and Node.js, Tilt can sync files directly into the running container:

```python
docker_build('service-a', './service-a',
  live_update=[
    sync('./service-a', '/app'),
    run('pip install -r requirements.txt', trigger='requirements.txt'),
  ]
)
```

This makes updates nearly instant because Tilt copies the changed files instead of rebuilding the entire Docker image.

The combination of Tilt and OpenTelemetry gives you visibility into your distributed system while maintaining the fast iteration speed that local development demands.
