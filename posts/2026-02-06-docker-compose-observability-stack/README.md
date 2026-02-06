# How to Set Up a Complete Docker Compose Observability Stack with Collector, Tempo, Loki, Prometheus, and Grafana

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Docker Compose, Grafana, Observability Stack

Description: Build a complete local observability stack using Docker Compose with OpenTelemetry Collector, Grafana Tempo, Loki, Prometheus, and Grafana dashboards.

Running a full observability stack locally lets you develop and test instrumentation without depending on external services. This post walks through setting up the OpenTelemetry Collector alongside Grafana Tempo for traces, Loki for logs, Prometheus for metrics, and Grafana for visualization, all in a single Docker Compose file.

## Architecture Overview

The data flow works like this: your application sends OTLP data to the Collector. The Collector routes traces to Tempo, logs to Loki, and metrics to Prometheus. Grafana connects to all three backends and provides a unified dashboard.

## The Docker Compose File

```yaml
version: "3.8"

services:
  # OpenTelemetry Collector - central telemetry router
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel-collector
    command: ["--config", "/etc/otelcol/config.yaml"]
    volumes:
      - ./collector-config.yaml:/etc/otelcol/config.yaml
    ports:
      - "4317:4317"   # OTLP gRPC
      - "4318:4318"   # OTLP HTTP
    networks:
      - observability
    depends_on:
      - tempo
      - loki

  # Grafana Tempo - distributed tracing backend
  tempo:
    image: grafana/tempo:latest
    container_name: tempo
    command: ["-config.file=/etc/tempo/config.yaml"]
    volumes:
      - ./tempo-config.yaml:/etc/tempo/config.yaml
      - tempo-data:/var/tempo
    ports:
      - "3200:3200"   # Tempo API
    networks:
      - observability

  # Grafana Loki - log aggregation backend
  loki:
    image: grafana/loki:latest
    container_name: loki
    command: ["-config.file=/etc/loki/config.yaml"]
    volumes:
      - ./loki-config.yaml:/etc/loki/config.yaml
      - loki-data:/loki
    ports:
      - "3100:3100"
    networks:
      - observability

  # Prometheus - metrics storage and query
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
      - prometheus-data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - observability

  # Grafana - visualization and dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
      - GF_AUTH_ANONYMOUS_ENABLED=true
      - GF_AUTH_ANONYMOUS_ORG_ROLE=Admin
    volumes:
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/datasources.yaml
      - grafana-data:/var/lib/grafana
    ports:
      - "3000:3000"
    networks:
      - observability
    depends_on:
      - tempo
      - loki
      - prometheus

volumes:
  tempo-data:
  loki-data:
  prometheus-data:
  grafana-data:

networks:
  observability:
    driver: bridge
```

## Collector Configuration

The Collector receives OTLP data and fans it out to each backend:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  batch:
    timeout: 5s
    send_batch_size: 512
  memory_limiter:
    check_interval: 1s
    limit_mib: 512

exporters:
  # Send traces to Tempo
  otlp/tempo:
    endpoint: tempo:4317
    tls:
      insecure: true

  # Send logs to Loki
  loki:
    endpoint: http://loki:3100/loki/api/v1/push

  # Expose metrics for Prometheus to scrape
  prometheus:
    endpoint: 0.0.0.0:8889
    namespace: otel

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp/tempo]
    logs:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loki]
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [prometheus]
```

## Tempo Configuration

Keep Tempo simple for local development:

```yaml
# tempo-config.yaml
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
    wal:
      path: /var/tempo/wal
```

## Loki Configuration

```yaml
# loki-config.yaml
auth_enabled: false

server:
  http_listen_port: 3100

common:
  path_prefix: /loki
  storage:
    filesystem:
      chunks_directory: /loki/chunks
      rules_directory: /loki/rules
  replication_factor: 1
  ring:
    kvstore:
      store: inmemory

schema_config:
  configs:
    - from: 2020-10-24
      store: tsdb
      object_store: filesystem
      schema: v13
      index:
        prefix: index_
        period: 24h
```

## Prometheus Configuration

Configure Prometheus to scrape the Collector's metrics endpoint:

```yaml
# prometheus.yaml
global:
  scrape_interval: 15s

scrape_configs:
  - job_name: "otel-collector"
    static_configs:
      - targets: ["otel-collector:8889"]
```

## Grafana Data Source Provisioning

Auto-configure Grafana to connect to all three backends:

```yaml
# grafana-datasources.yaml
apiVersion: 1

datasources:
  - name: Prometheus
    type: prometheus
    access: proxy
    url: http://prometheus:9090
    isDefault: true

  - name: Tempo
    type: tempo
    access: proxy
    url: http://tempo:3200

  - name: Loki
    type: loki
    access: proxy
    url: http://loki:3100
```

## Starting the Stack

```bash
docker compose up -d
```

Wait a minute for all services to start, then open Grafana at `http://localhost:3000`. The data sources are already configured. You can explore traces in the Tempo data source, query logs in Loki, and build metric dashboards from Prometheus.

## Testing with Sample Data

Point any OTLP-instrumented application at `localhost:4317` and the data flows through automatically. For a quick test, use `telemetrygen`:

```bash
# Install telemetrygen
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Send test traces
telemetrygen traces --otlp-insecure --traces 10

# Send test metrics
telemetrygen metrics --otlp-insecure --metrics 10
```

## Summary

This Docker Compose stack gives you a complete local observability platform. The Collector handles ingestion and routing, Tempo stores traces, Loki stores logs, Prometheus stores metrics, and Grafana ties them all together. It is ideal for local development, CI testing, and learning how the OpenTelemetry ecosystem fits together.
