# How to Set Up a Local OpenTelemetry Playground with Docker Compose (Collector, Jaeger, and Grafana)

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Compose, Jaeger, Grafana, Local Development

Description: Build a complete local observability playground with Docker Compose including an OpenTelemetry Collector, Jaeger, and Grafana.

Having a local observability stack lets you test instrumentation changes quickly without deploying to a remote environment. This post walks through setting up a Docker Compose configuration that gives you an OpenTelemetry Collector, Jaeger for traces, Prometheus for metrics, and Grafana for dashboards. The whole stack starts with a single command.

## Project Structure

Create a directory for your playground:

```
otel-playground/
  docker-compose.yml
  otel-collector-config.yaml
  prometheus.yml
  grafana/
    provisioning/
      datasources/
        datasources.yaml
```

## The Docker Compose File

This is the heart of the setup. It defines all the services and how they connect:

```yaml
version: '3.8'

services:
  # OpenTelemetry Collector - receives, processes, and exports telemetry
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    command: ["--config", "/etc/otel-collector-config.yaml"]
    volumes:
      - ./otel-collector-config.yaml:/etc/otel-collector-config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
      - "8889:8889"   # Prometheus metrics endpoint
    depends_on:
      - jaeger

  # Jaeger - trace storage and visualization
  jaeger:
    image: jaegertracing/all-in-one:1.54
    ports:
      - "16686:16686" # Jaeger UI
      - "14268:14268" # Accept spans directly (optional)
    environment:
      COLLECTOR_OTLP_ENABLED: "true"

  # Prometheus - scrapes metrics from the collector
  prometheus:
    image: prom/prometheus:v2.50.0
    volumes:
      - ./prometheus.yml:/etc/prometheus/prometheus.yml
    ports:
      - "9090:9090"
    depends_on:
      - otel-collector

  # Grafana - dashboards for metrics and traces
  grafana:
    image: grafana/grafana:10.3.1
    ports:
      - "3000:3000"
    environment:
      GF_SECURITY_ADMIN_PASSWORD: admin
      GF_SECURITY_ADMIN_USER: admin
    volumes:
      - ./grafana/provisioning:/etc/grafana/provisioning
    depends_on:
      - prometheus
      - jaeger
```

## Collector Configuration

Create `otel-collector-config.yaml`:

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
    timeout: 2s
    send_batch_size: 512

  # Add resource attributes to all telemetry
  resource:
    attributes:
      - key: environment
        value: local-playground
        action: upsert

exporters:
  # Send traces to Jaeger
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  # Expose metrics for Prometheus to scrape
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: otel

  # Print to stdout for debugging
  debug:
    verbosity: basic

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp/jaeger, debug]
    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheus, debug]
```

## Prometheus Configuration

Create `prometheus.yml`:

```yaml
global:
  scrape_interval: 15s
  evaluation_interval: 15s

scrape_configs:
  # Scrape metrics from the OpenTelemetry Collector
  - job_name: 'otel-collector'
    static_configs:
      - targets: ['otel-collector:8889']
```

## Grafana Data Source Provisioning

Create `grafana/provisioning/datasources/datasources.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Jaeger
    type: jaeger
    access: proxy
    url: http://jaeger:16686
```

This auto-configures Grafana with both data sources so you do not have to add them manually through the UI.

## Starting the Playground

Bring everything up:

```bash
docker compose up -d
```

Verify all services are healthy:

```bash
docker compose ps
```

You should see all four services running. Access the UIs:

- **Jaeger**: http://localhost:16686
- **Grafana**: http://localhost:3000 (login: admin/admin)
- **Prometheus**: http://localhost:9090

## Sending Test Data

Send a test trace using `curl` to verify the pipeline works:

```bash
# Send a trace span via OTLP HTTP
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{
          "key": "service.name",
          "value": {"stringValue": "test-service"}
        }]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "5B8EFFF798038103D269B633813FC60C",
          "spanId": "EEE19B7EC3C1B174",
          "name": "test-span",
          "kind": 1,
          "startTimeUnixNano": "1704067200000000000",
          "endTimeUnixNano": "1704067201000000000",
          "attributes": [{
            "key": "http.method",
            "value": {"stringValue": "GET"}
          }]
        }]
      }]
    }]
  }'
```

Check Jaeger for the trace. Select "test-service" from the Service dropdown and click Find Traces.

## Connecting Your Application

Point any OpenTelemetry-instrumented application at the collector. The environment variables are straightforward:

```bash
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318
export OTEL_SERVICE_NAME=my-app
export OTEL_TRACES_EXPORTER=otlp
export OTEL_METRICS_EXPORTER=otlp
```

Then start your application as usual. Traces flow to Jaeger, metrics flow to Prometheus, and Grafana shows them all in one place.

## Cleanup

When you are done experimenting:

```bash
# Stop and remove all containers
docker compose down

# Also remove volumes if you want a clean slate
docker compose down -v
```

This playground gives you a complete observability stack that mirrors what you would have in production, scaled down to run on a single machine. It is ideal for testing new instrumentation, experimenting with collector processors, or learning how the different components of the OpenTelemetry ecosystem fit together.
