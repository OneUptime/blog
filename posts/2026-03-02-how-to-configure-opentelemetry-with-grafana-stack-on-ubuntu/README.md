# How to Configure OpenTelemetry with Grafana Stack on Ubuntu

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Ubuntu, OpenTelemetry, Grafana, Observability, Monitoring

Description: Step-by-step guide to configuring the OpenTelemetry Collector with the Grafana observability stack (Tempo, Loki, Mimir) on Ubuntu for traces, logs, and metrics.

---

The Grafana observability stack has become the go-to open-source alternative to commercial APM tools. When combined with OpenTelemetry, you get a vendor-neutral telemetry pipeline that feeds traces into Tempo, logs into Loki, and metrics into Mimir - all visualized through a single Grafana dashboard.

This guide sets up the full stack on Ubuntu using Docker Compose.

## Architecture Overview

```
Your Applications
      |
      v
OpenTelemetry Collector  <-- receives OTLP traces, metrics, logs
      |
  +---+---+
  |   |   |
  v   v   v
Tempo Loki Mimir
       \   /
        Grafana  <-- unified visualization
```

## Prerequisites

- Ubuntu 20.04 or 22.04
- Docker Engine and Docker Compose v2
- 8 GB RAM minimum
- Ports 3000, 4317, 4318 available

## Installing Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
newgrp docker
```

## Creating the Docker Compose Stack

Create a working directory:

```bash
mkdir -p ~/grafana-otel-stack && cd ~/grafana-otel-stack
```

Create `docker-compose.yaml`:

```yaml
version: '3.8'

services:
  # OpenTelemetry Collector - entry point for all telemetry
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    volumes:
      - ./otel-collector-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC receiver
      - "4318:4318"   # OTLP HTTP receiver
      - "8888:8888"   # Collector metrics
    depends_on:
      - tempo
      - loki
      - mimir

  # Tempo - distributed tracing backend
  tempo:
    image: grafana/tempo:2.4.0
    command: ["-config.file=/etc/tempo.yaml"]
    volumes:
      - ./tempo-config.yaml:/etc/tempo.yaml
      - tempo-data:/var/tempo
    ports:
      - "3200:3200"

  # Loki - log aggregation backend
  loki:
    image: grafana/loki:2.9.5
    command: ["-config.file=/etc/loki/local-config.yaml"]
    volumes:
      - loki-data:/loki
    ports:
      - "3100:3100"

  # Mimir - long-term metrics storage
  mimir:
    image: grafana/mimir:2.11.0
    command: ["--config.file=/etc/mimir.yaml"]
    volumes:
      - ./mimir-config.yaml:/etc/mimir.yaml
      - mimir-data:/data
    ports:
      - "9009:9009"

  # Grafana - visualization
  grafana:
    image: grafana/grafana:10.3.3
    environment:
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    depends_on:
      - tempo
      - loki
      - mimir

volumes:
  tempo-data:
  loki-data:
  mimir-data:
  grafana-data:
```

## Configuring the OpenTelemetry Collector

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
    # Batch telemetry for efficiency
    timeout: 5s
    send_batch_size: 512

  # Add resource attributes to all telemetry
  resource:
    attributes:
      - key: environment
        value: production
        action: upsert

exporters:
  # Send traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

  # Send logs to Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push
    default_labels_enabled:
      exporter: false
      job: true

  # Send metrics to Mimir via Prometheus remote write
  prometheusremotewrite:
    endpoint: http://mimir:9009/api/v1/push

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [otlp/tempo]

    logs:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [loki]

    metrics:
      receivers: [otlp]
      processors: [batch, resource]
      exporters: [prometheusremotewrite]
```

## Configuring Tempo

Create `tempo-config.yaml`:

```yaml
server:
  http_listen_port: 3200

distributor:
  receivers:
    otlp:
      protocols:
        grpc:
          endpoint: 0.0.0.0:4317

storage:
  trace:
    backend: local
    local:
      path: /var/tempo/blocks

# Enable trace search
search_enabled: true

# Link traces to logs via trace ID
overrides:
  defaults:
    metrics_generator:
      processors: [service-graphs, span-metrics]
```

## Configuring Mimir

Create `mimir-config.yaml`:

```yaml
multitenancy_enabled: false

blocks_storage:
  backend: filesystem
  filesystem:
    dir: /data/blocks

compactor:
  data_dir: /data/compactor

distributor:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: memberlist

ingester:
  ring:
    instance_addr: 127.0.0.1
    kvstore:
      store: memberlist
    replication_factor: 1

ruler_storage:
  backend: filesystem
  filesystem:
    dir: /data/rules

server:
  http_listen_port: 9009

store_gateway:
  sharding_ring:
    replication_factor: 1
```

## Configuring Grafana Datasources

Create `grafana-datasources.yaml`:

```yaml
apiVersion: 1

datasources:
  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200
    jsonData:
      # Enable trace to logs correlation
      tracesToLogsV2:
        datasourceUid: loki
        spanStartTimeShift: '-1h'
        spanEndTimeShift: '1h'
        tags: [{key: 'service.name', value: 'service'}]
      serviceMap:
        datasourceUid: mimir

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100

  - name: Mimir
    type: prometheus
    access: proxy
    url: http://mimir:9009/prometheus
```

## Starting the Stack

```bash
docker compose up -d

# Watch startup progress
docker compose logs -f --tail 20
```

Grafana will be available at `http://your-server-ip:3000`.

## Instrumenting Applications

### Python with FastAPI

```bash
pip install opentelemetry-distro opentelemetry-exporter-otlp-proto-grpc
opentelemetry-bootstrap -a install
```

```python
# Add to your app startup
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Configure the tracer
provider = TracerProvider()
exporter = OTLPSpanExporter(endpoint="http://your-server:4317", insecure=True)
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)
```

### Go Application

```go
// main.go - initialize OpenTelemetry before starting your server
import (
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/sdk/trace"
)

func initTracer() func() {
    exporter, _ := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("your-server:4317"),
        otlptracegrpc.WithInsecure(),
    )
    tp := trace.NewTracerProvider(
        trace.WithBatcher(exporter),
    )
    otel.SetTracerProvider(tp)
    return func() { tp.Shutdown(ctx) }
}
```

## Correlating Traces and Logs

The most powerful feature of this stack is trace-to-log correlation. When you instrument logs with the trace ID, clicking a trace in Tempo takes you directly to the relevant log lines in Loki.

In Python, add the trace ID to your log context:

```python
import logging
from opentelemetry import trace

class TraceIDFilter(logging.Filter):
    def filter(self, record):
        span = trace.get_current_span()
        ctx = span.get_span_context()
        # Attach trace and span IDs to every log record
        record.trace_id = format(ctx.trace_id, '032x')
        record.span_id = format(ctx.span_id, '016x')
        return True
```

## Exploring Data in Grafana

After sending some telemetry, explore each datasource:

1. **Tempo** - Go to Explore, select Tempo, and run a TraceQL query: `{ .service.name = "my-service" && duration > 200ms }`
2. **Loki** - In Explore, select Loki: `{service="my-service"} |= "error"`
3. **Mimir** - Use PromQL: `rate(http_server_requests_total[5m])`

## Configuring Alerting

Add Grafana alert rules using the unified alerting system. Create a rule in Grafana UI under Alerting > Alert Rules, or provision them via YAML:

```yaml
# alerts.yaml - place in grafana provisioning directory
apiVersion: 1
groups:
  - name: app-alerts
    folder: MyApp
    rules:
      - title: High Error Rate
        condition: C
        data:
          - refId: A
            datasourceUid: mimir
            model:
              expr: 'rate(http_errors_total[5m]) > 0.05'
```

This stack gives you production-grade observability while keeping full control of your data. All backends can be scaled independently as your telemetry volume grows.
