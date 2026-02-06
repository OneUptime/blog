# How to Use Rotel (Rust-Based OTel Collector) for 3.7M Spans/Sec Throughput in High-Volume Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rotel, Rust, High Throughput

Description: Deploy Rotel, a Rust-based OpenTelemetry Collector, to achieve 3.7 million spans per second throughput in high-volume pipelines.

The standard OpenTelemetry Collector written in Go is excellent for most use cases. But when you are pushing millions of spans per second through a single instance, the Go garbage collector starts to become a bottleneck. Rotel is a Rust-based alternative that achieves 3.7 million spans per second on a single node by eliminating garbage collection pauses entirely.

## What is Rotel

Rotel is an OpenTelemetry-compatible collector implemented in Rust. It supports the OTLP protocol for receiving and exporting telemetry data, and it is designed specifically for high-throughput scenarios where the standard Go-based collector hits its limits. Because Rust has no garbage collector, Rotel provides consistent, low-latency processing even under extreme load.

## When to Use Rotel

You should consider Rotel when:

- A single Collector instance needs to handle more than 500K spans/sec
- You need sub-millisecond p99 processing latency (no GC pauses)
- You are running gateway Collectors that aggregate traffic from hundreds of agent Collectors
- Memory predictability is critical (no GC-driven memory spikes)

For lower throughput use cases, the standard Collector works perfectly fine.

## Installation

Build Rotel from source or use the pre-built Docker image:

```bash
# Using Docker
docker pull rotel/rotel:latest

# Or build from source
git clone https://github.com/rotel-io/rotel.git
cd rotel
cargo build --release
# Binary is at target/release/rotel
```

## Configuration

Rotel uses a YAML configuration format similar to the standard Collector:

```yaml
# rotel-config.yaml
receivers:
  otlp:
    grpc:
      endpoint: 0.0.0.0:4317
      # Increase max message size for large batches
      max_recv_msg_size_bytes: 67108864
    http:
      endpoint: 0.0.0.0:4318

processors:
  batch:
    # Larger batches for higher throughput
    max_batch_size: 16384
    timeout_ms: 1000
    # Number of worker threads for processing
    num_workers: 8

  # Resource-based routing
  routing:
    attribute: "service.name"
    routes:
      - match: "payment-*"
        exporters: [otlp_critical]
      - match: "*"
        exporters: [otlp_default]

exporters:
  otlp_critical:
    endpoint: critical-backend:4317
    compression: zstd
    # Connection pooling for high throughput
    num_connections: 16
    queue:
      max_size: 100000
      num_consumers: 8

  otlp_default:
    endpoint: default-backend:4317
    compression: zstd
    num_connections: 8
    queue:
      max_size: 50000
      num_consumers: 4

# Telemetry about Rotel itself
telemetry:
  metrics:
    endpoint: 0.0.0.0:9090
    export_interval_ms: 10000
  logging:
    level: info

pipelines:
  traces:
    receivers: [otlp]
    processors: [batch, routing]
    exporters: [otlp_critical, otlp_default]
```

## Running Rotel

```bash
# Run with configuration file
rotel --config rotel-config.yaml

# Or with Docker
docker run -d \
  --name rotel \
  -p 4317:4317 \
  -p 4318:4318 \
  -p 9090:9090 \
  -v $(pwd)/rotel-config.yaml:/etc/rotel/config.yaml \
  rotel/rotel:latest \
  --config /etc/rotel/config.yaml
```

## Kubernetes Deployment

Deploy Rotel as a gateway in Kubernetes:

```yaml
# rotel-deployment.yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: rotel-gateway
  namespace: observability
spec:
  replicas: 3
  selector:
    matchLabels:
      app: rotel-gateway
  template:
    metadata:
      labels:
        app: rotel-gateway
    spec:
      containers:
        - name: rotel
          image: rotel/rotel:latest
          args: ["--config", "/etc/rotel/config.yaml"]
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
            - containerPort: 9090
              name: metrics
          resources:
            requests:
              cpu: "4"
              memory: "4Gi"
            limits:
              cpu: "8"
              memory: "8Gi"
          volumeMounts:
            - name: config
              mountPath: /etc/rotel
      volumes:
        - name: config
          configMap:
            name: rotel-config
---
apiVersion: v1
kind: Service
metadata:
  name: rotel-gateway
  namespace: observability
spec:
  selector:
    app: rotel-gateway
  ports:
    - name: otlp-grpc
      port: 4317
      targetPort: 4317
    - name: otlp-http
      port: 4318
      targetPort: 4318
```

## Performance Benchmarking

Run a benchmark to verify throughput on your hardware:

```bash
# Use the otel-load-generator to push spans
docker run --rm \
  -e OTEL_EXPORTER_OTLP_ENDPOINT=http://rotel:4317 \
  otel/opentelemetry-collector-contrib:latest \
  telemetrygen traces \
  --otlp-insecure \
  --rate 1000000 \
  --duration 60s \
  --workers 32 \
  --otlp-endpoint rotel:4317

# Monitor Rotel's metrics
curl http://rotel:9090/metrics | grep rotel_spans_received_total
```

## Performance Tuning Tips

- **CPU pinning**: Use `taskset` or Kubernetes CPU manager to pin Rotel to specific cores and avoid NUMA effects.
- **Network tuning**: Increase `net.core.rmem_max` and `net.core.wmem_max` for the gRPC receiver.
- **Batch size**: Larger batches amortize per-span overhead. Start with 16384 and increase from there.
- **Connection pooling**: Use `num_connections` in the exporter to parallelize outbound requests.
- **Memory**: Rotel's memory usage is predictable. Monitor RSS, not heap, since there is no GC overhead.

## Wrapping Up

Rotel fills a specific niche in the OpenTelemetry ecosystem: the ultra-high-throughput gateway. For most teams, the standard Go-based Collector is the right choice. But if you are operating at the scale where GC pauses and per-span CPU overhead matter, Rotel's Rust implementation gives you the raw performance to handle millions of spans per second on commodity hardware.
