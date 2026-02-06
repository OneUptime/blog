# How to Avoid the Anti-Pattern of Running the OpenTelemetry Collector Without Resource Limits in Production

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Production, Resource Limits

Description: Learn why running the OpenTelemetry Collector without CPU and memory limits in production leads to node-level outages.

Running the OpenTelemetry Collector in production without CPU and memory limits is like driving without brakes. It works fine under normal conditions, but when traffic spikes or the backend goes down, the Collector consumes unbounded resources, starving other services on the same host or node.

## What Happens Without Limits

The Collector is a Go application that processes telemetry data. Under normal load, it uses modest resources. But several scenarios cause unbounded resource growth:

1. **Backend outage**: The exporter cannot deliver data. The sending queue fills up. If the queue has no size limit, memory grows without bound.
2. **Traffic spike**: A deployment rolls out with verbose logging or a high sample rate. The Collector receives 10x normal volume.
3. **Pipeline misconfiguration**: A fan-out pipeline duplicates data to multiple exporters, multiplying memory usage.

Without resource limits, the Collector grows until it consumes all available memory on the host, triggering the kernel OOM killer. In Kubernetes, this can affect other pods on the same node.

## Setting Container Resource Limits

### Docker Compose

```yaml
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:0.96.0
    deploy:
      resources:
        limits:
          memory: 2G
          cpus: '2.0'
        reservations:
          memory: 512M
          cpus: '0.5'
    volumes:
      - ./collector-config.yaml:/etc/otelcol-contrib/config.yaml
```

### Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  template:
    spec:
      containers:
        - name: collector
          image: otel/opentelemetry-collector-contrib:0.96.0
          resources:
            requests:
              cpu: 500m
              memory: 512Mi
            limits:
              cpu: "2"
              memory: 2Gi
          args:
            - "--config=/etc/otelcol-contrib/config.yaml"
```

## Matching Internal Limits to Container Limits

Container limits alone are not enough. The Collector needs internal limits that kick in before the container limit is reached. Otherwise, the Collector gets killed by the OOM killer and in-flight data is lost.

```yaml
# Collector config that matches a 2Gi container limit
processors:
  memory_limiter:
    check_interval: 1s
    limit_mib: 1536    # 75% of 2048 MiB
    spike_limit_mib: 384

exporters:
  otlp:
    endpoint: "https://backend:4317"
    sending_queue:
      enabled: true
      queue_size: 5000  # Bounded queue, not unlimited
    retry_on_failure:
      enabled: true
      max_elapsed_time: 300s  # Stop retrying after 5 minutes

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [otlp]
```

The `memory_limiter` is set to 1536 MiB, which is 75% of the 2048 MiB container limit. This leaves headroom for the Go runtime, goroutine stacks, and other overhead.

## Sizing Guidelines

Here is a starting point for different traffic volumes:

| Daily Span Volume | CPU Request | Memory Limit | memory_limiter |
|-------------------|-------------|--------------|----------------|
| Up to 1M spans/day | 250m | 512Mi | 384 MiB |
| 1M to 10M spans/day | 500m | 1Gi | 768 MiB |
| 10M to 100M spans/day | 1 | 2Gi | 1536 MiB |
| 100M+ spans/day | 2+ | 4Gi+ | 3072 MiB |

These are rough estimates. Monitor actual usage and adjust.

## Setting Up Monitoring

The Collector exposes its own metrics. Use them to right-size your resource limits:

```yaml
service:
  telemetry:
    metrics:
      address: ":8888"
```

Key metrics to monitor:

```bash
# Memory usage
process_runtime_total_alloc_bytes

# CPU usage
process_cpu_seconds_total

# Queue depth (are queues backing up?)
otelcol_exporter_queue_size

# Dropped data (is the memory limiter active?)
otelcol_processor_refused_spans_total
```

Create dashboards and alerts based on these metrics:

```yaml
# Alert if Collector memory exceeds 80% of limit
alert: CollectorHighMemory
expr: process_runtime_total_alloc_bytes{job="otel-collector"} > 1.6e9
for: 5m
labels:
  severity: warning
```

## Horizontal Scaling

If a single Collector cannot handle the load even with increased resources, scale horizontally:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: otel-collector
spec:
  replicas: 3  # Multiple Collector instances
  template:
    spec:
      containers:
        - name: collector
          resources:
            limits:
              cpu: "2"
              memory: 2Gi
```

Use a Kubernetes Service to load-balance traffic across Collector instances:

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
    - name: otlp-http
      port: 4318
```

## Summary

Never run the Collector in production without:
1. Container resource limits (CPU and memory)
2. The `memory_limiter` processor set below the container limit
3. Bounded sending queues on exporters
4. Monitoring of the Collector's own resource usage

These safeguards turn an uncontrolled failure (OOM crash, node-level impact) into a controlled degradation (data is temporarily refused, SDKs retry, and data flows again when pressure subsides).
