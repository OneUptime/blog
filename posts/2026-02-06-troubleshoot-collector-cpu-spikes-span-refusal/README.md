# How to Troubleshoot Collector CPU Spikes That Cause 100% Utilization and Span Refusal Under Load

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, CPU, Performance

Description: Diagnose and fix OpenTelemetry Collector CPU spikes that cause 100 percent utilization and span refusal under load.

Your OpenTelemetry Collector is running fine at baseline, but during traffic spikes it pegs at 100% CPU and starts refusing spans. Your applications get export errors, and traces are lost. This post covers how to identify the bottleneck and fix it.

## Identifying the CPU Bottleneck

First, check which component is consuming the most CPU. The Collector exposes profiling endpoints when configured:

```yaml
# collector-config.yaml
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
    # Enable pprof for CPU profiling
    logs:
      level: info
```

You can also enable the `zpages` extension for real-time debugging:

```yaml
extensions:
  zpages:
    endpoint: 0.0.0.0:55679

service:
  extensions: [zpages]
```

Access `http://collector:55679/debug/tracez` to see active spans and pipeline stats.

## Common CPU Bottlenecks

### 1. Batch Processor Configured Too Aggressively

A batch processor with a very large `send_batch_size` can spike CPU when it serializes large batches:

```yaml
# PROBLEMATIC: very large batches cause CPU spikes
processors:
  batch:
    send_batch_size: 10000
    timeout: 30s
```

Fix: reduce batch size and timeout:

```yaml
# BETTER: smaller, more frequent batches
processors:
  batch:
    send_batch_size: 1024
    send_batch_max_size: 2048
    timeout: 5s
```

### 2. Attribute Processor Doing Expensive Regex Operations

If you use the `attributes` processor with regex patterns, complex patterns on high-volume data can burn CPU:

```yaml
# SLOW: complex regex on every span
processors:
  attributes:
    actions:
    - key: http.url
      pattern: "^https?://[^/]+(/[^?]+).*$"
      action: extract
```

Fix: simplify the regex or move the transformation to the application side.

### 3. Too Many Processors in the Pipeline

Each processor adds overhead. If you chain many processors, the cumulative cost can be significant:

```yaml
# HEAVY: too many processors
service:
  pipelines:
    traces:
      processors: [memory_limiter, attributes, resource, filter, transform, batch]
```

Audit each processor and remove any that are not essential.

## Scaling the Collector

### Vertical Scaling: Add More CPU

```yaml
resources:
  requests:
    cpu: 500m
    memory: 512Mi
  limits:
    cpu: 2       # increase from 1 to 2 cores
    memory: 1Gi
```

### Horizontal Scaling: Multiple Replicas

Deploy multiple Collector replicas behind a load balancer:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3  # scale horizontally
  template:
    spec:
      containers:
      - name: collector
        image: otel/opentelemetry-collector-contrib:0.121.0
        resources:
          requests:
            cpu: 500m
          limits:
            cpu: 1
```

Create a Service for load balancing:

```yaml
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
    targetPort: 4317
  - name: otlp-http
    port: 4318
    targetPort: 4318
```

### Gateway Pattern

Use a lightweight gateway Collector that only forwards data, and a backend Collector that does heavy processing:

```yaml
# Gateway collector - minimal processing
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loadbalancing]

# Load balancing exporter distributes to backend collectors
exporters:
  loadbalancing:
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      dns:
        hostname: otel-collector-backend
        port: 4317
```

```yaml
# Backend collector - heavy processing
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, attributes, filter, batch]
      exporters: [otlp]
```

## Tuning the OTLP Receiver

The OTLP receiver can be tuned to handle more concurrent connections:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
        max_recv_msg_size_mib: 4
        max_concurrent_streams: 100
        read_buffer_size: 524288
      http:
        endpoint: 0.0.0.0:4318
```

## Monitoring CPU Usage

Set up alerts on Collector CPU metrics:

```yaml
# Prometheus alerting rule
groups:
- name: otel-collector
  rules:
  - alert: CollectorHighCPU
    expr: rate(process_cpu_seconds_total{job="otel-collector"}[5m]) > 0.9
    for: 5m
    labels:
      severity: warning
    annotations:
      summary: "OpenTelemetry Collector CPU above 90%"
```

Also monitor the refused spans metric:

```yaml
  - alert: CollectorRefusingSpans
    expr: rate(otelcol_processor_refused_spans[5m]) > 0
    for: 2m
    labels:
      severity: critical
    annotations:
      summary: "Collector is refusing spans"
```

## Summary

CPU spikes in the Collector are usually caused by large batch sizes, expensive processor operations, or insufficient resources for the data volume. The fix involves tuning batch sizes, simplifying processor chains, and scaling horizontally. Always monitor CPU and refused-spans metrics to catch problems before they cause data loss.
