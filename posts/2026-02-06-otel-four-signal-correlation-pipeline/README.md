# How to Build a Four-Signal Correlation Pipeline (Traces + Metrics + Logs + Profiles) in a Single Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Four Signals, Correlation, Collector, Profiling

Description: Build a single OpenTelemetry Collector pipeline that receives, correlates, and exports traces, metrics, logs, and profiles together.

The OpenTelemetry Collector has evolved from handling just traces to supporting all four observability signals: traces, metrics, logs, and profiles. Running a single collector that receives all four signals means you can correlate them in the pipeline itself, using connectors to derive metrics from traces, enrich logs with trace context, and link profiles to spans. This post shows how to build that four-signal pipeline.

## Architecture Overview

The collector sits at the center, receiving all four signals from your applications and routing them to the appropriate backends:

```
Applications
  |
  |-- traces -----> [OTLP Receiver] --+
  |-- metrics ----> [OTLP Receiver] --+--> [Processors] --> [Exporters]
  |-- logs -------> [OTLP Receiver] --+
  |-- profiles ---> [OTLP Receiver] --+
                                       |
                    [Connectors] ------+
                    (span -> metrics)
                    (service graph)
```

## The Complete Collector Configuration

Here is the full configuration for a four-signal collector with correlation:

```yaml
# collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"
        max_recv_msg_size_mib: 16
      http:
        endpoint: "0.0.0.0:4318"

connectors:
  # Generate RED metrics from trace spans
  spanmetrics:
    histogram:
      explicit:
        buckets: [2ms, 5ms, 10ms, 25ms, 50ms, 100ms, 250ms, 500ms, 1s, 2.5s, 5s, 10s]
    dimensions:
      - name: http.request.method
      - name: http.response.status_code
      - name: http.route
      - name: rpc.method
    namespace: "traces.spanmetrics"
    metrics_flush_interval: 15s

  # Build service dependency graph from traces
  servicegraph:
    latency_histogram_buckets: [5ms, 10ms, 50ms, 100ms, 500ms, 1s, 5s]
    dimensions:
      - http.request.method
    store:
      ttl: 15s
      max_items: 200000
    virtual_node_peer_attributes:
      - db.name
      - peer.service
      - messaging.system

processors:
  # Batch processing for all signals
  batch/traces:
    send_batch_size: 1024
    timeout: 5s

  batch/metrics:
    send_batch_size: 2048
    timeout: 10s

  batch/logs:
    send_batch_size: 1024
    timeout: 5s

  batch/profiles:
    send_batch_size: 256
    timeout: 10s

  # Ensure consistent resource attributes across all signals
  resource/normalize:
    attributes:
      - key: deployment.environment
        from_attribute: env
        action: upsert
      - key: env
        action: delete

  # Memory limiter to prevent OOM
  memory_limiter:
    check_interval: 5s
    limit_mib: 4096
    spike_limit_mib: 1024

  # Transform logs to extract trace context
  transform/logs:
    log_statements:
      - context: log
        statements:
          - set(trace_id.string, attributes["trace_id"])
            where attributes["trace_id"] != nil and trace_id.string == ""
          - set(span_id.string, attributes["span_id"])
            where attributes["span_id"] != nil and span_id.string == ""

  # Filter out health check spans
  filter/health:
    error_mode: ignore
    traces:
      span:
        - 'attributes["http.route"] == "/health"'
        - 'attributes["http.route"] == "/healthz"'
        - 'attributes["http.route"] == "/ready"'

exporters:
  # Traces to Tempo
  otlp/traces:
    endpoint: "http://tempo:4317"
    tls:
      insecure: true
    sending_queue:
      enabled: true
      num_consumers: 10
      queue_size: 5000
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

  # Metrics to Mimir (Prometheus-compatible)
  prometheusremotewrite:
    endpoint: "http://mimir:9009/api/v1/push"
    resource_to_telemetry_conversion:
      enabled: true
    tls:
      insecure: true

  # Logs to Loki
  otlp/logs:
    endpoint: "http://loki:3100/otlp"
    tls:
      insecure: true
    sending_queue:
      enabled: true
      queue_size: 5000

  # Profiles to Pyroscope
  otlp/profiles:
    endpoint: "http://pyroscope:4040"
    tls:
      insecure: true

  # Debug exporter for development
  debug:
    verbosity: basic
    sampling_initial: 5
    sampling_thereafter: 200

service:
  telemetry:
    logs:
      level: info
    metrics:
      address: "0.0.0.0:8888"

  pipelines:
    # Trace pipeline
    traces:
      receivers: [otlp]
      processors: [memory_limiter, filter/health, resource/normalize, batch/traces]
      exporters: [otlp/traces, spanmetrics, servicegraph]

    # Metric pipeline (receives both app metrics AND connector-generated metrics)
    metrics:
      receivers: [otlp, spanmetrics, servicegraph]
      processors: [memory_limiter, resource/normalize, batch/metrics]
      exporters: [prometheusremotewrite]

    # Log pipeline
    logs:
      receivers: [otlp]
      processors: [memory_limiter, transform/logs, resource/normalize, batch/logs]
      exporters: [otlp/logs]

    # Profile pipeline
    profiles:
      receivers: [otlp]
      processors: [memory_limiter, batch/profiles]
      exporters: [otlp/profiles]
```

## How the Signals Correlate

This configuration creates several correlation paths:

**Traces to Metrics (via spanmetrics connector):**
Every span generates a counter and histogram metric. You can go from a metric spike to the spans that caused it.

**Traces to Service Graph (via servicegraph connector):**
Client-server span pairs generate edge metrics. The service graph shows you dependencies and their health.

**Logs to Traces (via transform processor):**
Log records with trace_id attributes get their OTLP trace context fields populated. Your log backend can link directly to traces.

**Profiles to Traces (via shared resource attributes):**
Profiles carry the same `service.name` and can be filtered by trace ID if your profiling agent supports it.

## SDK Configuration for Four Signals

Your application SDK needs to send all four signals to the collector:

```yaml
# otel-config.yaml (application side)
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    deployment.environment: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1

meter_provider:
  exemplar_filter: "trace_based"
  readers:
    - periodic:
        interval: 30000
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"

logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]
```

## Kubernetes Deployment

Deploy the collector as a DaemonSet or Deployment depending on your scale:

```yaml
# k8s-collector.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3
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
          image: otel/opentelemetry-collector-contrib:latest
          args: ["--config=/etc/otel/collector-config.yaml"]
          ports:
            - containerPort: 4317  # gRPC
            - containerPort: 4318  # HTTP
            - containerPort: 8888  # metrics
          resources:
            requests:
              cpu: "500m"
              memory: "2Gi"
            limits:
              cpu: "2"
              memory: "4Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/otel
      volumes:
        - name: config
          configMap:
            name: otel-collector-config
```

## Monitoring the Collector Itself

The collector exposes its own metrics on port 8888. Monitor these to ensure your four-signal pipeline is healthy:

```promql
# Accepted spans per second
rate(otelcol_receiver_accepted_spans[5m])

# Dropped spans (indicates backpressure)
rate(otelcol_receiver_refused_spans[5m])

# Export failures
rate(otelcol_exporter_send_failed_spans[5m])
rate(otelcol_exporter_send_failed_metric_points[5m])
rate(otelcol_exporter_send_failed_log_records[5m])

# Queue utilization
otelcol_exporter_queue_size / otelcol_exporter_queue_capacity
```

## Wrapping Up

A four-signal collector pipeline is the backbone of a fully correlated observability stack. All signals flow through a single point where they can be enriched, normalized, and cross-referenced. The spanmetrics connector derives RED metrics from traces. The servicegraph connector builds dependency maps. The transform processor enriches logs with trace context. And consistent resource attributes tie everything together. Deploy this collector, point your applications at it, and you have a complete correlation pipeline for all four observability signals.
