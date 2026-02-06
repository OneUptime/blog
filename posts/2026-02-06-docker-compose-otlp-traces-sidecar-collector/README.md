# How to Configure Docker Compose Services to Export OTLP Traces to a Sidecar Collector Container

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Compose, Tracing, OTLP

Description: Set up Docker Compose services to export OpenTelemetry traces via OTLP to a sidecar Collector container running alongside your application.

Running the OpenTelemetry Collector as a sidecar in Docker Compose is one of the cleanest ways to collect traces from your application containers. Each service sends its traces to the Collector over the Docker network, and the Collector handles batching, processing, and exporting to your backend. This pattern keeps instrumentation concerns separate from your application code.

## The Sidecar Pattern in Docker Compose

In this setup, the Collector runs as its own service in the same Docker Compose file. Application containers send OTLP data to it using the service name as the hostname. Here is the full `docker-compose.yaml`:

```yaml
version: "3.8"

services:
  # The OpenTelemetry Collector sidecar
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      # OTLP gRPC receiver
      - "4317:4317"
      # OTLP HTTP receiver
      - "4318:4318"
      # Health check extension
      - "13133:13133"
    networks:
      - app-network
    restart: unless-stopped

  # Example Python web application
  web-api:
    build: ./web-api
    container_name: web-api
    environment:
      # Point the OTLP exporter at the collector service name
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=web-api
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=staging
    depends_on:
      - otel-collector
    ports:
      - "8080:8080"
    networks:
      - app-network

  # Example Node.js worker service
  worker:
    build: ./worker
    container_name: worker
    environment:
      - OTEL_EXPORTER_OTLP_ENDPOINT=http://otel-collector:4317
      - OTEL_SERVICE_NAME=worker
      - OTEL_RESOURCE_ATTRIBUTES=deployment.environment=staging
    depends_on:
      - otel-collector
    networks:
      - app-network

networks:
  app-network:
    driver: bridge
```

The critical piece is the `OTEL_EXPORTER_OTLP_ENDPOINT` environment variable. It uses the Collector's service name (`otel-collector`) as the hostname. Docker Compose DNS resolution handles the rest.

## Collector Configuration

Create the `otel-collector-config.yaml` file:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        # Listen on all interfaces inside the container
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    # Wait up to 5 seconds before sending a batch
    timeout: 5s
    send_batch_size: 512
    send_batch_max_size: 1024

  # Add memory limiting to prevent OOM in constrained Docker environments
  memory_limiter:
    check_interval: 1s
    limit_mib: 256
    spike_limit_mib: 64

exporters:
  otlp:
    endpoint: "your-tracing-backend:4317"
    tls:
      insecure: false

  # Also log to stdout for debugging during development
  logging:
    loglevel: info

extensions:
  health_check:
    endpoint: 0.0.0.0:13133

service:
  extensions: [health_check]
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp, logging]
```

Notice the `memory_limiter` processor. In Docker environments with memory constraints, this prevents the Collector from consuming too much memory and getting killed by the OOM killer.

## Instrumenting a Python Service

Here is a minimal Python Flask application with OpenTelemetry auto-instrumentation:

```python
# web-api/app.py
from flask import Flask
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.instrumentation.flask import FlaskInstrumentor

app = Flask(__name__)

# Set up the tracer provider with OTLP export
# The endpoint comes from OTEL_EXPORTER_OTLP_ENDPOINT env var
provider = TracerProvider()
exporter = OTLPSpanExporter()  # reads from env var automatically
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

# Auto-instrument Flask
FlaskInstrumentor().instrument_app(app)

@app.route("/api/users")
def get_users():
    tracer = trace.get_tracer(__name__)
    with tracer.start_as_current_span("fetch-users-from-db"):
        # Your database logic here
        return {"users": ["alice", "bob"]}

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8080)
```

## Instrumenting a Node.js Service

For the worker service in Node.js:

```javascript
// worker/tracing.js
const { NodeSDK } = require('@opentelemetry/sdk-node');
const { OTLPTraceExporter } = require('@opentelemetry/exporter-trace-otlp-grpc');
const { getNodeAutoInstrumentations } = require('@opentelemetry/auto-instrumentations-node');

// The SDK reads OTEL_EXPORTER_OTLP_ENDPOINT from the environment
const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter(),
  instrumentations: [getNodeAutoInstrumentations()],
});

sdk.start();

// Graceful shutdown when the container stops
process.on('SIGTERM', () => {
  sdk.shutdown().then(() => process.exit(0));
});
```

Load this file before your application code using the `--require` flag:

```dockerfile
# worker/Dockerfile
FROM node:20-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
CMD ["node", "--require", "./tracing.js", "index.js"]
```

## Health Checks and Dependency Ordering

Add a health check to the Collector so dependent services wait for it:

```yaml
otel-collector:
  image: otel/opentelemetry-collector-contrib:latest
  healthcheck:
    test: ["CMD", "wget", "--spider", "-q", "http://localhost:13133/"]
    interval: 10s
    timeout: 5s
    retries: 3

web-api:
  depends_on:
    otel-collector:
      condition: service_healthy
```

This prevents your application from starting before the Collector is ready to accept traces.

## Testing the Setup

Bring everything up and send a test request:

```bash
docker compose up -d
curl http://localhost:8080/api/users
```

Check the Collector logs to confirm traces are flowing:

```bash
docker compose logs otel-collector
```

You should see log output indicating that spans were received and exported.

## Summary

The sidecar pattern in Docker Compose gives you a clean separation between application instrumentation and telemetry collection. Services point their OTLP exporters at the Collector service name, Docker handles DNS resolution, and the Collector takes care of batching and forwarding. Adding memory limits and health checks makes the setup production-ready.
