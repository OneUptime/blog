# How to Use Rotel for 3.7M Spans/Sec Throughput in High-Volume Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Rotel, Rust, High Throughput

Description: Deploy Rotel, a Rust-based OpenTelemetry Collector, to achieve 3.7 million spans per second throughput in high-volume pipelines.

The standard OpenTelemetry Collector written in Go is excellent for most use cases. But when you are pushing millions of spans per second through a single instance, runtime overhead and allocation behavior can become bottlenecks. Rotel is a Rust-based alternative that has reached 3.7 million spans per second on a single gateway node in a Kafka-to-ClickHouse benchmark.

## What is Rotel

Rotel is an OpenTelemetry-compatible collector implemented in Rust. It supports the OTLP protocol for receiving and exporting telemetry data, and it is designed specifically for high-throughput scenarios where the standard Go-based collector hits its limits. Because Rust has no garbage collector, Rotel provides consistent, low-latency processing even under extreme load.

## When to Use Rotel

You should consider Rotel when:

- A single Collector instance needs to handle more than 500K spans/sec
- You need predictable latency without garbage collection pauses
- You are running gateway Collectors that aggregate traffic from hundreds of agent Collectors
- Memory predictability is critical (no GC-driven memory spikes)

For lower throughput use cases, the standard Collector works perfectly fine.

## Installation

Build Rotel from source or use the pre-built Docker image:

```bash
# Using Docker

docker pull streamfold/rotel:latest

# Or build from source
git clone https://github.com/rotel-dev/rotel.git
cd rotel
cargo build --release
# Binary is at target/release/rotel
```

## Configuration

Rotel is configured with command-line flags or `ROTEL_` environment variables. The default OTLP receiver listens on `localhost:4317` for gRPC and `localhost:4318` for HTTP, so bind those endpoints to `0.0.0.0` in containers:

```bash
export ROTEL_OTLP_GRPC_ENDPOINT=0.0.0.0:4317
export ROTEL_OTLP_HTTP_ENDPOINT=0.0.0.0:4318

# Increase the OTLP/gRPC receiver max message size for large batches.
export ROTEL_OTLP_GRPC_MAX_RECV_MSG_SIZE_MIB=64

# Larger batches for higher throughput.
export ROTEL_BATCH_MAX_SIZE=16384
export ROTEL_BATCH_TIMEOUT=1s

# Export traces to an OTLP backend.
export ROTEL_EXPORTER=otlp
export ROTEL_OTLP_EXPORTER_ENDPOINT=default-backend:4317
export ROTEL_OTLP_EXPORTER_PROTOCOL=grpc
export ROTEL_OTLP_EXPORTER_COMPRESSION=gzip
```

## Running Rotel

```bash
# Run with command-line flags
rotel start \
  --otlp-grpc-endpoint 0.0.0.0:4317 \
  --otlp-http-endpoint 0.0.0.0:4318 \
  --otlp-grpc-max-recv-msg-size-mib 64 \
  --batch-max-size 16384 \
  --batch-timeout 1s \
  --exporter otlp \
  --otlp-exporter-endpoint default-backend:4317

# Or with Docker
docker run -d \
  --name rotel \
  -p 4317:4317 \
  -p 4318:4318 \
  streamfold/rotel:latest \
  start \
  --otlp-grpc-endpoint 0.0.0.0:4317 \
  --otlp-http-endpoint 0.0.0.0:4318 \
  --otlp-grpc-max-recv-msg-size-mib 64 \
  --batch-max-size 16384 \
  --batch-timeout 1s \
  --exporter otlp \
  --otlp-exporter-endpoint default-backend:4317
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
          image: streamfold/rotel:latest
          args: ["start"]
          env:
            - name: ROTEL_OTLP_GRPC_ENDPOINT
              value: "0.0.0.0:4317"
            - name: ROTEL_OTLP_HTTP_ENDPOINT
              value: "0.0.0.0:4318"
            - name: ROTEL_OTLP_GRPC_MAX_RECV_MSG_SIZE_MIB
              value: "64"
            - name: ROTEL_BATCH_MAX_SIZE
              value: "16384"
            - name: ROTEL_BATCH_TIMEOUT
              value: "1s"
            - name: ROTEL_EXPORTER
              value: "otlp"
            - name: ROTEL_OTLP_EXPORTER_ENDPOINT
              value: "default-backend:4317"
          ports:
            - containerPort: 4317
              name: otlp-grpc
            - containerPort: 4318
              name: otlp-http
          resources:
            requests:
              cpu: "4"
              memory: "4Gi"
            limits:
              cpu: "8"
              memory: "8Gi"
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
# Use telemetrygen for a functional load check.
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

telemetrygen traces \
  --otlp-insecure \
  --otlp-endpoint localhost:4317 \
  --rate 100000 \
  --duration 60s \
  --workers 32
```

The published 3.7M spans/sec result used Rotel in a Kafka-to-ClickHouse benchmark with a custom load generator, not `telemetrygen`, which the Rotel authors reported could not generate enough traffic for that benchmark.

## Performance Tuning Tips

- **CPU pinning**: Use `taskset` or Kubernetes CPU manager to pin Rotel to specific cores and avoid NUMA effects.
- **Network tuning**: Increase `net.core.rmem_max` and `net.core.wmem_max` for the gRPC receiver.
- **Batch size**: Larger batches amortize per-span overhead. Start with `--batch-max-size 16384` and tune from there.
- **Exporter protocol**: Match the exporter protocol, compression, retry, and timeout settings to the destination backend.
- **Memory**: Rotel's memory usage is predictable. Monitor RSS, not heap, since there is no GC overhead.

## Wrapping Up

Rotel fills a specific niche in the OpenTelemetry ecosystem: the ultra-high-throughput gateway. For most teams, the standard Go-based Collector is the right choice. But if you are operating at the scale where GC pauses and per-span CPU overhead matter, Rotel's Rust implementation gives you the raw performance to handle millions of spans per second on commodity hardware.
