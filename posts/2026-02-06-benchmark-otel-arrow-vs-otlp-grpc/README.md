# How to Benchmark OTel Arrow vs Standard OTLP/gRPC to Measure Bandwidth Savings in Your Environment

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTel Arrow, Benchmarking, Performance

Description: Benchmark OTel Arrow against standard OTLP/gRPC to measure actual bandwidth savings in your specific environment.

Marketing claims of "30-70% bandwidth reduction" are useful as a starting point, but every environment is different. The actual savings you get from OTel Arrow depend on your telemetry data characteristics: how many attributes per span, how repetitive those attributes are, and how large your batches are. This post shows you how to run a controlled benchmark in your own environment and measure the real savings.

## Setting Up the Benchmark Environment

You need two Collector pipelines running side by side: one using standard OTLP and one using OTel Arrow. Both receive the same telemetry data.

```yaml
# benchmark-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  batch:
    timeout: 5s
    send_batch_size: 1000

exporters:
  # Standard OTLP exporter (baseline)
  otlp/standard:
    endpoint: receiver-standard:4317
    tls:
      insecure: true
    compression: gzip

  # OTel Arrow exporter (comparison)
  otelarrow/arrow:
    endpoint: receiver-arrow:4317
    tls:
      insecure: true
    compression: zstd
    arrow:
      num_streams: 4
      max_stream_lifetime: 10m

service:
  pipelines:
    traces/standard:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp/standard]
    traces/arrow:
      receivers: [otlp]
      processors: [batch]
      exporters: [otelarrow/arrow]
```

This configuration sends the same data to both exporters, ensuring an apples-to-apples comparison.

## Generating Realistic Test Data

Use the `telemetrygen` tool to generate test data that resembles your production telemetry:

```bash
# Install telemetrygen
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Generate traces with realistic attributes
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 10000 \
  --child-spans 5 \
  --rate 500 \
  --duration 60s \
  --otlp-attributes 'service.name="checkout-service"' \
  --otlp-attributes 'deployment.environment="production"' \
  --otlp-attributes 'cloud.region="us-east-1"' \
  --otlp-attributes 'k8s.namespace.name="default"' \
  --otlp-attributes 'k8s.pod.name="checkout-7d8f9b6c4d-x2k9m"'
```

For a more realistic benchmark, capture real production data and replay it:

```bash
# Record production telemetry to a file
# Use the file exporter to capture OTLP data
exporters:
  file:
    path: /tmp/captured-traces.json

# Replay the captured data for benchmarking
# (Use a custom replayer or the file receiver)
```

## Measuring Network Bytes

The most direct measurement is network bytes transferred. Use iptables counters or the Collector's internal metrics:

```bash
# Method 1: iptables byte counters
# Reset counters
iptables -Z OUTPUT

# Add rules to track bytes to each receiver
iptables -A OUTPUT -p tcp --dport 4317 -d receiver-standard -j ACCEPT
iptables -A OUTPUT -p tcp --dport 4317 -d receiver-arrow -j ACCEPT

# Run the benchmark for a fixed duration
sleep 300

# Read the counters
iptables -L OUTPUT -v -n | grep "receiver-standard"
iptables -L OUTPUT -v -n | grep "receiver-arrow"
```

```bash
# Method 2: Collector internal metrics
# Query the Collector's Prometheus metrics endpoint

# Bytes sent via standard OTLP
curl -s http://collector:8888/metrics | grep 'otelcol_exporter_sent_bytes'
```

## Automated Benchmark Script

Here is a script that runs the complete benchmark:

```bash
#!/bin/bash
# benchmark-otel-arrow.sh

DURATION=300  # 5 minutes
RATE=500      # spans per second
TOTAL_SPANS=$((RATE * DURATION))

echo "Starting benchmark: ${TOTAL_SPANS} spans over ${DURATION}s"

# Start the collector with both pipelines
docker compose up -d collector receiver-standard receiver-arrow

# Wait for startup
sleep 10

# Record initial byte counts from collector metrics
INITIAL_STANDARD=$(curl -s http://localhost:8888/metrics | \
  grep 'otelcol_exporter_sent_bytes_total{exporter="otlp/standard"}' | \
  awk '{print $2}')
INITIAL_ARROW=$(curl -s http://localhost:8888/metrics | \
  grep 'otelcol_exporter_sent_bytes_total{exporter="otelarrow/arrow"}' | \
  awk '{print $2}')

# Generate test data
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces $((TOTAL_SPANS / 5)) \
  --child-spans 5 \
  --rate ${RATE} \
  --duration ${DURATION}s

# Wait for export queues to drain
sleep 30

# Record final byte counts
FINAL_STANDARD=$(curl -s http://localhost:8888/metrics | \
  grep 'otelcol_exporter_sent_bytes_total{exporter="otlp/standard"}' | \
  awk '{print $2}')
FINAL_ARROW=$(curl -s http://localhost:8888/metrics | \
  grep 'otelcol_exporter_sent_bytes_total{exporter="otelarrow/arrow"}' | \
  awk '{print $2}')

# Calculate results
BYTES_STANDARD=$((FINAL_STANDARD - INITIAL_STANDARD))
BYTES_ARROW=$((FINAL_ARROW - INITIAL_ARROW))
SAVINGS=$(echo "scale=1; (1 - $BYTES_ARROW / $BYTES_STANDARD) * 100" | bc)

echo "Results:"
echo "  Standard OTLP/gRPC + gzip: ${BYTES_STANDARD} bytes"
echo "  OTel Arrow + zstd:         ${BYTES_ARROW} bytes"
echo "  Bandwidth savings:         ${SAVINGS}%"
```

## Interpreting Results

Typical results vary by data characteristics:

| Scenario | Standard OTLP + gzip | OTel Arrow + zstd | Savings |
|----------|---------------------|-------------------|---------|
| High attribute repetition | 100 MB | 25 MB | 75% |
| Moderate repetition | 100 MB | 40 MB | 60% |
| Low repetition (high cardinality) | 100 MB | 65 MB | 35% |
| Small batches (< 100 per batch) | 100 MB | 70 MB | 30% |

High attribute repetition means most spans share the same resource attributes and many have similar span attributes. This is common in microservices where every span from a service has the same `service.name`, `deployment.environment`, `cloud.region`, etc.

Low repetition means high-cardinality attributes dominate, like unique request IDs, user IDs, or timestamps in attributes. Arrow's dictionary encoding provides less benefit here because each value is unique.

## Benchmarking CPU Overhead

Bandwidth savings come with a CPU cost for Arrow encoding. Measure the CPU impact as well:

```promql
# CPU usage of the standard exporter
rate(process_cpu_seconds_total{job="collector-standard"}[5m])

# CPU usage of the Arrow exporter
rate(process_cpu_seconds_total{job="collector-arrow"}[5m])
```

Expect OTel Arrow to use 5-15% more CPU than standard OTLP due to the Arrow encoding step. Whether this trade-off is worthwhile depends on whether your bottleneck is network bandwidth or CPU.

Run this benchmark with your actual telemetry data and your actual batch sizes. The results you get will be specific to your environment, and that is the number you should use when deciding whether to adopt OTel Arrow.
