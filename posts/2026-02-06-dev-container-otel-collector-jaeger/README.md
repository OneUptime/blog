# How to Set Up a Dev Container with Pre-Configured OpenTelemetry Collector and Jaeger for Local Development

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Dev Containers, Jaeger, Docker, Local Development

Description: Set up a VS Code dev container that includes an OpenTelemetry Collector and Jaeger so every developer gets tracing out of the box.

Dev containers give you reproducible development environments that work the same way on every machine. By bundling an OpenTelemetry Collector and Jaeger inside your dev container configuration, every developer on your team gets a working tracing setup without any manual installation. This post shows you how to build that setup from scratch.

## The Dev Container Configuration

Start by creating a `.devcontainer` directory in the root of your project. Inside it, create a `devcontainer.json` file and a `docker-compose.yml` file.

Here is the `devcontainer.json`:

```json
{
  "name": "OTel Dev Environment",
  "dockerComposeFile": "docker-compose.yml",
  "service": "app",
  "workspaceFolder": "/workspace",
  "forwardPorts": [4317, 4318, 16686],
  "postStartCommand": "echo 'Jaeger UI available at http://localhost:16686'",
  "customizations": {
    "vscode": {
      "extensions": [
        "opentelemetry.otel-log-viewer"
      ]
    }
  }
}
```

The `forwardPorts` array exposes the OTLP gRPC port (4317), OTLP HTTP port (4318), and the Jaeger UI port (16686) to your host machine.

## The Docker Compose File

The `docker-compose.yml` file defines three services: your application container, the OpenTelemetry Collector, and Jaeger.

```yaml
version: '3.8'

services:
  app:
    build:
      context: ..
      dockerfile: .devcontainer/Dockerfile
    volumes:
      - ..:/workspace:cached
    environment:
      # Point your app at the collector
      OTEL_EXPORTER_OTLP_ENDPOINT: http://otel-collector:4318
      OTEL_SERVICE_NAME: my-app
      OTEL_TRACES_EXPORTER: otlp
    depends_on:
      - otel-collector
    command: sleep infinity

  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - jaeger

  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686"
    environment:
      COLLECTOR_OTLP_ENABLED: "true"
```

## The Collector Configuration

Create `otel-collector-config.yaml` inside the `.devcontainer` directory:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    # Batch spans before exporting to reduce overhead
    timeout: 1s
    send_batch_size: 256

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
```

This configuration receives OTLP data from your application, batches it, and forwards it to Jaeger. The debug exporter prints a summary to the collector's stdout so you can verify traces are flowing.

## The Application Dockerfile

Create a simple `Dockerfile` in `.devcontainer`:

```dockerfile
FROM mcr.microsoft.com/devcontainers/python:3.12

# Install OpenTelemetry packages for Python
RUN pip install \
    opentelemetry-api \
    opentelemetry-sdk \
    opentelemetry-exporter-otlp \
    opentelemetry-instrumentation-flask \
    opentelemetry-instrumentation-requests

# Install any other dev tools you need
RUN pip install flask requests pytest
```

Adjust this for your language of choice. The key point is that the OpenTelemetry SDK and exporter packages are pre-installed so developers do not need to set them up manually.

## Initializing Tracing in Your Application

With the environment variables already set in `docker-compose.yml`, your application can read them automatically. Here is a Python Flask example:

```python
# app.py
from flask import Flask
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.http.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor
from opentelemetry.sdk.resources import Resource
import os

# Configure the tracer provider with service name from env
resource = Resource.create({
    "service.name": os.environ.get("OTEL_SERVICE_NAME", "unknown")
})
provider = TracerProvider(resource=resource)

# The OTLP exporter reads OTEL_EXPORTER_OTLP_ENDPOINT from the environment
exporter = OTLPSpanExporter()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

app = Flask(__name__)

# Auto-instrument Flask to capture HTTP spans
FlaskInstrumentor().instrument_app(app)

@app.route("/")
def hello():
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("greeting-logic"):
        return "Hello from the dev container!"

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000)
```

## Opening the Dev Container

In VS Code, open the command palette and select "Dev Containers: Reopen in Container." VS Code will build the Docker images, start the services, and connect your editor to the application container. Once it finishes:

1. Open a terminal inside VS Code (it runs inside the container)
2. Run `python app.py`
3. Hit `http://localhost:5000` in your browser
4. Open `http://localhost:16686` to see your traces in Jaeger

Every request you make shows up as a trace in Jaeger with the full span hierarchy.

## Making It Team-Friendly

Commit the entire `.devcontainer` directory to your repository. When a new developer clones the repo and opens it in VS Code, they get prompted to reopen in a dev container. Within a few minutes, they have a fully working development environment with tracing enabled.

Add a note in your project README explaining that traces are available at `http://localhost:16686`. This small addition to your onboarding documentation saves hours of setup time and gives everyone on the team consistent observability from day one.

## Going Further

You can extend this setup by adding Prometheus and Grafana containers for metrics, or by adding a logging pipeline through the collector. The dev container pattern scales well because you define the infrastructure once and every developer inherits it automatically.
