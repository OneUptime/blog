# How to Deploy OpenTelemetry Collector via Portainer - A Practical Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Portainer, Docker, OpenTelemetry, Observability, Trace, Metric, Log

Description: Deploy the OpenTelemetry Collector as a centralized telemetry pipeline via Portainer to collect, process, and export traces, metrics, and logs from containerized applications.

## Introduction

The OpenTelemetry Collector is a vendor-neutral telemetry pipeline that receives data in multiple formats (OTLP, Jaeger, Zipkin, Prometheus) and exports to multiple backends (Jaeger, Zipkin, Prometheus, Loki, Tempo, DataDog, NewRelic). Deploying it as a central collector separates telemetry concerns from application code and allows you to change backends without modifying applications. This guide covers deploying the Collector via Portainer with a complete observability pipeline.

## Step 1: Deploy OpenTelemetry Collector

```yaml
# docker-compose.yml - OpenTelemetry Collector with full observability stack

version: "3.8"

services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    container_name: otel_collector
    restart: unless-stopped
    command: ["--config=/etc/otelcol-contrib/config.yaml"]
    volumes:
      - ./otel-config.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      # OTLP gRPC receiver (applications send here)
      - "4317:4317"
      # OTLP HTTP receiver
      - "4318:4318"
      # Jaeger compatible receiver
      - "14268:14268"
      # Zipkin receiver
      - "9411:9411"
      # Prometheus metrics exporter (for Prometheus to scrape)
      - "8889:8889"
      # Collector health check
      - "13133:13133"
    networks:
      - telemetry_net
    healthcheck:
      test:
        ["CMD", "wget", "-q", "-O-", "http://localhost:13133/"]
      interval: 30s
      timeout: 5s
      retries: 3

  # Jaeger - Trace visualization
  jaeger:
    image: jaegertracing/all-in-one:latest
    container_name: jaeger
    restart: unless-stopped
    environment:
      - COLLECTOR_OTLP_ENABLED=true
    ports:
      - "16686:16686"   # Jaeger UI
      - "14250:14250"   # Jaeger gRPC
    networks:
      - telemetry_net

  # Prometheus - Metrics storage
  prometheus:
    image: prom/prometheus:latest
    container_name: prometheus
    restart: unless-stopped
    volumes:
      - ./prometheus.yaml:/etc/prometheus/prometheus.yml
      - prometheus_data:/prometheus
    ports:
      - "9090:9090"
    networks:
      - telemetry_net

  # Grafana - Unified dashboards
  grafana:
    image: grafana/grafana:latest
    container_name: grafana
    restart: unless-stopped
    environment:
      - GF_SECURITY_ADMIN_PASSWORD=admin
    volumes:
      - grafana_data:/var/lib/grafana
      - ./grafana-datasources.yaml:/etc/grafana/provisioning/datasources/all.yaml
    ports:
      - "3000:3000"
    networks:
      - telemetry_net

volumes:
  prometheus_data:
  grafana_data:

networks:
  telemetry_net:
    driver: bridge
    name: telemetry_net
```

## Step 2: Configure the OpenTelemetry Collector Pipeline

```yaml
# otel-config.yaml - Complete collector configuration
receivers:
  # OTLP: receive from apps using OpenTelemetry SDK
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

  # Jaeger: receive from legacy Jaeger clients
  jaeger:
    protocols:
      grpc:
        endpoint: 0.0.0.0:14250
      thrift_http:
        endpoint: 0.0.0.0:14268

  # Zipkin: receive from Zipkin clients
  zipkin:
    endpoint: 0.0.0.0:9411

  # Prometheus: scrape metrics from containers
  prometheus:
    config:
      scrape_configs:
        - job_name: "app-services"
          docker_sd_configs:
            - host: "unix:///var/run/docker.sock"
          relabel_configs:
            - source_labels:
                [__meta_docker_container_label_prometheus_scrape]
              regex: "true"
              action: keep

processors:
  # Batch traces and metrics for efficiency
  batch:
    timeout: 1s
    send_batch_size: 1024

  # Add metadata to all telemetry
  resource:
    attributes:
      - key: deployment.environment
        value: "production"
        action: upsert
      - key: host.name
        from_attribute: host.name
        action: insert

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 5s
    limit_mib: 512
    spike_limit_mib: 128

  # Sampling: only keep 10% of traces (for high-volume environments)
  probabilistic_sampler:
    sampling_percentage: 10

exporters:
  # Export traces to Jaeger (OTLP gRPC port; requires COLLECTOR_OTLP_ENABLED=true on Jaeger)
  otlp/jaeger:
    endpoint: jaeger:4317
    tls:
      insecure: true

  # Export metrics to Prometheus
  prometheus:
    endpoint: "0.0.0.0:8889"
    namespace: app
    const_labels:
      environment: production

  # Export traces to Zipkin (optional)
  zipkin:
    endpoint: "http://zipkin:9411/api/v2/spans"

  # Debug output to collector logs (disable in production)
  # debug:
  #   verbosity: detailed

service:
  pipelines:
    traces:
      receivers: [otlp, jaeger, zipkin]
      processors: [memory_limiter, batch, resource]
      exporters: [otlp/jaeger]

    metrics:
      receivers: [otlp, prometheus]
      processors: [memory_limiter, batch, resource]
      exporters: [prometheus]

  extensions: [health_check, pprof, zpages]

extensions:
  health_check:
    endpoint: 0.0.0.0:13133
  pprof:
    endpoint: 0.0.0.0:1888
  zpages:
    endpoint: 0.0.0.0:55679
```

## Step 3: Instrument Applications to Send to Collector

```python
# Python: Send traces via OTLP to the collector
from opentelemetry import trace
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor

# Configure OTLP exporter (points to the collector)
exporter = OTLPSpanExporter(
    endpoint="http://otel-collector:4317",
    insecure=True
)

provider = TracerProvider()
provider.add_span_processor(BatchSpanProcessor(exporter))
trace.set_tracer_provider(provider)

tracer = trace.get_tracer(__name__)

@app.route("/api/users/<id>")
def get_user(id):
    with tracer.start_as_current_span("get_user") as span:
        span.set_attribute("user.id", id)
        user = db.get_user(id)
        return jsonify(user)
```

```javascript
// Node.js: Send traces via OTLP
const { NodeSDK } = require("@opentelemetry/sdk-node");
const {
  OTLPTraceExporter,
} = require("@opentelemetry/exporter-trace-otlp-grpc");

const sdk = new NodeSDK({
  traceExporter: new OTLPTraceExporter({
    url: "http://otel-collector:4317",
  }),
  instrumentations: [
    // Auto-instrumentation for HTTP, Express, etc.
    require("@opentelemetry/auto-instrumentations-node").getNodeAutoInstrumentations(),
  ],
});

sdk.start();
```

## Step 4: Configure Grafana Datasources

```yaml
# grafana-datasources.yaml - Connect Grafana to all backends
apiVersion: 1

datasources:
  - name: Jaeger
    type: jaeger
    url: http://jaeger:16686
    access: proxy
    uid: jaeger

  - name: Prometheus
    type: prometheus
    url: http://prometheus:9090
    access: proxy
    uid: prometheus
    isDefault: true

  - name: Tempo
    type: tempo
    url: http://tempo:3200
    access: proxy
    uid: tempo
    jsonData:
      tracesToLogs:
        datasourceUid: loki  # Link traces to logs
```

## Conclusion

The OpenTelemetry Collector is the telemetry backbone of a modern observability stack. Its pipeline model - receivers to ingest, processors to transform, exporters to deliver - makes it trivial to change backends without touching application code. Deploying through Portainer gives you the full collector lifecycle management (deploy, update, restart) alongside the applications it monitors. The `otel-collector-contrib` image includes dozens of receivers and exporters, supporting virtually any telemetry source or destination in your infrastructure. Start with just traces (OTLP to Jaeger) and add metrics and log pipelines incrementally.
