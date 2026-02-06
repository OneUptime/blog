# How to Use Skaffold with OpenTelemetry for Continuous Development with Automatic Trace Collection

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Skaffold, Kubernetes, Continuous Development, Google Cloud

Description: Configure Skaffold to automatically build, deploy, and instrument your Kubernetes services with OpenTelemetry trace collection.

Skaffold is a command-line tool from Google that handles the workflow for building, pushing, and deploying Kubernetes applications during development. It watches your source code, rebuilds containers when files change, and redeploys them. When paired with OpenTelemetry, every code change results in fresh traces that you can inspect immediately. This post shows how to set up the integration.

## Skaffold Basics

Skaffold uses a `skaffold.yaml` file to define what to build and how to deploy. It supports multiple build strategies (Docker, Buildpacks, Jib) and deployment methods (kubectl, Helm, kustomize).

Install Skaffold:

```bash
# macOS
brew install skaffold

# Linux
curl -Lo skaffold https://storage.googleapis.com/skaffold/releases/latest/skaffold-linux-amd64
chmod +x skaffold
sudo mv skaffold /usr/local/bin
```

## Project Structure

```
project/
  skaffold.yaml
  k8s/
    collector.yaml
    jaeger.yaml
    app.yaml
  src/
    app.py
    tracing.py
    Dockerfile
```

## The Skaffold Configuration

Create `skaffold.yaml`:

```yaml
apiVersion: skaffold/v4beta8
kind: Config
metadata:
  name: otel-app

build:
  artifacts:
    - image: my-app
      context: src
      docker:
        dockerfile: Dockerfile
      sync:
        # Sync Python files directly instead of rebuilding the image
        manual:
          - src: '**/*.py'
            dest: /app

deploy:
  kubectl:
    manifests:
      - k8s/jaeger.yaml
      - k8s/collector.yaml
      - k8s/app.yaml

portForward:
  - resourceType: service
    resourceName: jaeger
    port: 16686
    localPort: 16686
  - resourceType: service
    resourceName: my-app
    port: 8000
    localPort: 8000
```

The `sync` section is important. Instead of rebuilding the Docker image on every file change, Skaffold copies the changed Python files directly into the running container. This makes updates nearly instant.

The `portForward` section automatically forwards Jaeger and your application ports to localhost.

## Kubernetes Manifests

`k8s/collector.yaml`:

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
    - name: grpc
      port: 4317
    - name: http
      port: 4318
```

`k8s/app.yaml`:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: my-app
spec:
  replicas: 1
  selector:
    matchLabels:
      app: my-app
  template:
    metadata:
      labels:
        app: my-app
    spec:
      containers:
        - name: app
          image: my-app
          ports:
            - containerPort: 8000
          env:
            - name: OTEL_SERVICE_NAME
              value: my-app
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector:4318"
---
apiVersion: v1
kind: Service
metadata:
  name: my-app
spec:
  selector:
    app: my-app
  ports:
    - port: 8000
```

## The Application

`src/Dockerfile`:

```dockerfile
FROM python:3.12-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
# Use watchdog for file-sync triggered reloads
CMD ["python", "-m", "flask", "run", "--host=0.0.0.0", "--port=8000", "--reload"]
```

`src/app.py`:

```python
from flask import Flask
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.sdk.resources import Resource
import os

# Initialize tracing
resource = Resource.create({"service.name": os.environ.get("OTEL_SERVICE_NAME", "my-app")})
provider = TracerProvider(resource=resource)
exporter = OTLPSpanExporter()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

app = Flask(__name__)
FlaskInstrumentor().instrument_app(app)
tracer = trace.get_tracer(__name__)

@app.route("/")
def index():
    with tracer.start_as_current_span("index-handler"):
        return {"message": "Hello from Skaffold!"}

@app.route("/compute")
def compute():
    with tracer.start_as_current_span("compute-handler") as span:
        result = sum(range(10000))
        span.set_attribute("compute.result", result)
        return {"result": result}
```

## Running the Development Loop

Start Skaffold in dev mode:

```bash
skaffold dev
```

Skaffold builds the Docker image, deploys everything to your local cluster, and starts watching for file changes. You see the logs from all containers in your terminal.

Open http://localhost:8000 to hit your app. Open http://localhost:16686 to see the traces in Jaeger.

Now edit `src/app.py`. Add a new endpoint or change an attribute. Save the file. Skaffold detects the change, syncs the file into the running container, and Flask reloads. Within seconds, you can hit the updated endpoint and see the new traces.

## Profiles for Different Environments

Skaffold supports profiles for different configurations:

```yaml
profiles:
  - name: no-tracing
    patches:
      - op: remove
        path: /deploy/kubectl/manifests/1  # Remove collector
      - op: remove
        path: /deploy/kubectl/manifests/0  # Remove Jaeger
```

Use it when you want a lighter setup:

```bash
skaffold dev --profile no-tracing
```

This flexibility lets you choose between full observability and fast startup depending on what you are working on.

Skaffold with OpenTelemetry creates a tight development loop: write code, save, see traces. The file sync feature keeps the iteration time under a few seconds, making it practical to instrument as you go rather than treating tracing as a separate task.
