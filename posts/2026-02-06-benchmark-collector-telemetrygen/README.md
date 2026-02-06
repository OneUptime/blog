# How to Benchmark the Collector with telemetrygen

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Benchmarking, Performance Testing, telemetrygen, Load Testing

Description: Master telemetrygen to benchmark OpenTelemetry Collector performance, identify bottlenecks, and validate configurations under realistic load conditions.

Benchmarking the OpenTelemetry Collector before production deployment is essential for validating performance characteristics, identifying bottlenecks, and ensuring your configuration can handle expected load. The telemetrygen tool, part of the OpenTelemetry Collector Contrib repository, provides a powerful way to generate synthetic telemetry data for testing purposes.

## What is telemetrygen?

telemetrygen is a command-line tool that generates synthetic traces, metrics, and logs at configurable rates. It supports both OTLP/gRPC and OTLP/HTTP protocols, making it ideal for load testing OpenTelemetry Collector deployments.

Key capabilities:

- Generate traces, metrics, or logs independently
- Configure generation rate and duration
- Control data characteristics (span count, attributes, etc.)
- Support for authentication and TLS
- Parallel workers for high-volume generation

## Installing telemetrygen

Install telemetrygen using Go:

```bash
# Requires Go 1.20 or later
go install github.com/open-telemetry/opentelemetry-collector-contrib/cmd/telemetrygen@latest

# Verify installation
telemetrygen --help

# Check version
telemetrygen --version
```

Alternatively, build from source for the latest features:

```bash
# Clone the repository
git clone https://github.com/open-telemetry/opentelemetry-collector-contrib.git
cd opentelemetry-collector-contrib/cmd/telemetrygen

# Build the binary
go build -o telemetrygen .

# Move to PATH
sudo mv telemetrygen /usr/local/bin/
```

## Setting Up a Test Environment

Before benchmarking, set up a collector instance with monitoring enabled. Here's a complete test configuration:

```yaml
# benchmark-config.yaml - Collector configuration for benchmarking
receivers:
  otlp:
    protocols:
      grpc:
        # Listen on all interfaces for telemetrygen traffic
        endpoint: 0.0.0.0:4317
        # Increase max receive size for high-volume tests
        max_recv_msg_size_mib: 32
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Memory limiter prevents OOM during stress tests
  memory_limiter:
    check_interval: 1s
    limit_mib: 2048
    spike_limit_mib: 512

  # Batch processor to simulate production behavior
  batch:
    timeout: 1s
    send_batch_size: 1024
    send_batch_max_size: 2048

  # Attributes processor for testing processing overhead
  attributes:
    actions:
      - key: test.benchmark
        value: "true"
        action: insert
      - key: test.timestamp
        from_attribute: timestamp
        action: insert

exporters:
  # Logging exporter for debugging (disable for high-volume tests)
  logging:
    verbosity: normal
    sampling_initial: 5
    sampling_thereafter: 200

  # Debug exporter drops data but reports stats
  # Useful for testing without backend bottlenecks
  debug:
    verbosity: basic
    sampling_initial: 10
    sampling_thereafter: 1000

  # OTLP exporter to actual backend (if testing end-to-end)
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true
    # Configure sending queue for realistic buffering
    sending_queue:
      enabled: true
      queue_size: 1000
      num_consumers: 10

service:
  # Enable detailed telemetry for performance monitoring
  telemetry:
    logs:
      level: info
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch, attributes]
      # Use debug exporter for pure collector benchmarking
      exporters: [debug]

    # Enable metrics pipeline to monitor collector performance
    metrics:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [debug]
```

Start the collector with this configuration:

```bash
# Run collector with benchmark configuration
otelcol-contrib --config benchmark-config.yaml

# In a separate terminal, monitor collector metrics
watch -n 1 'curl -s http://localhost:8888/metrics | grep -E "otelcol_(receiver|processor|exporter)"'
```

## Basic Trace Generation

Start with simple trace generation to verify connectivity:

```bash
# Generate 100 traces at 10 traces per second
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --traces 100 \
  --rate 10

# Output shows generation progress:
# 2025-02-06T10:00:00.000Z info traces@v0.93.0/traces.go:73 generation complete {"traces": 100}
```

Parameters explained:

- `--otlp-endpoint`: Collector gRPC endpoint
- `--otlp-insecure`: Disable TLS (for local testing)
- `--traces`: Total number of traces to generate
- `--rate`: Traces per second

## High-Volume Load Testing

Test collector performance under sustained high load:

```bash
# Generate 1 million traces at 10,000 per second
# Uses 20 parallel workers for throughput
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 10000 \
  --duration 100s \
  --workers 20 \
  --spans 5

# Monitor collector CPU and memory during test
# In separate terminal:
docker stats otel-collector
```

Key parameters for high-volume testing:

- `--duration`: Run for specified time instead of fixed count
- `--workers`: Parallel goroutines for generation
- `--spans`: Spans per trace (simulates realistic trace structure)

## Customizing Generated Data

Control the characteristics of generated telemetry to match your production workload:

```bash
# Generate complex traces with custom attributes
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 1000 \
  --duration 5m \
  --workers 10 \
  --spans 8 \
  --span-kind server \
  --service-name benchmark-service \
  --trace-attributes "environment=test,region=us-east-1,version=1.2.3" \
  --span-attributes "http.method=GET,http.status_code=200"
```

Advanced customization options:

- `--span-kind`: Set span kind (server, client, internal, producer, consumer)
- `--service-name`: Service name in resource attributes
- `--trace-attributes`: Key-value pairs for trace-level attributes
- `--span-attributes`: Key-value pairs for span attributes
- `--status-code`: Set span status (Unset, Ok, Error)

## Testing Different Protocols

telemetrygen supports both gRPC and HTTP protocols:

```bash
# Test OTLP/gRPC (default)
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 5000 \
  --duration 60s

# Test OTLP/HTTP
telemetrygen traces \
  --otlp-http \
  --otlp-endpoint http://localhost:4318 \
  --rate 5000 \
  --duration 60s

# Compare throughput and latency between protocols
```

## Benchmarking Metrics Generation

Generate synthetic metrics to test metrics pipelines:

```bash
# Generate counter metrics
telemetrygen metrics \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 1000 \
  --duration 5m \
  --workers 5 \
  --metrics 10 \
  --metric-type Counter

# Generate gauge metrics
telemetrygen metrics \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 1000 \
  --duration 5m \
  --metric-type Gauge

# Generate histogram metrics
telemetrygen metrics \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 1000 \
  --duration 5m \
  --metric-type Histogram
```

## Benchmarking Logs Generation

Test log processing pipelines:

```bash
# Generate log records
telemetrygen logs \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --rate 5000 \
  --duration 5m \
  --workers 10 \
  --body "Test log message with severity" \
  --severity-text "INFO"

# Generate logs with different severities
for severity in DEBUG INFO WARN ERROR FATAL; do
  telemetrygen logs \
    --otlp-endpoint localhost:4317 \
    --otlp-insecure \
    --rate 1000 \
    --duration 60s \
    --severity-text "$severity" &
done
wait
```

## Comprehensive Benchmark Script

Create a reusable benchmark script for consistent testing:

```bash
#!/bin/bash
# benchmark-collector.sh - Comprehensive collector benchmark

set -e

COLLECTOR_ENDPOINT="localhost:4317"
METRICS_ENDPOINT="localhost:8888"
DURATION="300s"  # 5 minutes per test

echo "Starting OpenTelemetry Collector Benchmark"
echo "=========================================="

# Function to capture metrics before and after
capture_metrics() {
    local test_name=$1
    curl -s http://${METRICS_ENDPOINT}/metrics > "metrics_${test_name}_$(date +%s).txt"
}

# Function to run benchmark and collect stats
run_benchmark() {
    local test_name=$1
    local rate=$2
    local workers=$3

    echo ""
    echo "Running: $test_name"
    echo "Rate: $rate traces/sec, Workers: $workers"

    # Capture baseline metrics
    capture_metrics "${test_name}_before"

    # Run telemetrygen
    telemetrygen traces \
        --otlp-endpoint ${COLLECTOR_ENDPOINT} \
        --otlp-insecure \
        --rate ${rate} \
        --duration ${DURATION} \
        --workers ${workers} \
        --spans 5 \
        --service-name benchmark-service \
        --trace-attributes "test=${test_name},rate=${rate}"

    # Wait for pipeline to flush
    sleep 10

    # Capture post-test metrics
    capture_metrics "${test_name}_after"

    echo "Completed: $test_name"
}

# Test 1: Low load baseline
run_benchmark "low_load" 1000 2

# Test 2: Medium load
run_benchmark "medium_load" 5000 5

# Test 3: High load
run_benchmark "high_load" 10000 10

# Test 4: Very high load (stress test)
run_benchmark "stress_test" 20000 20

# Test 5: Burst test (short high-rate burst)
echo ""
echo "Running: burst_test"
telemetrygen traces \
    --otlp-endpoint ${COLLECTOR_ENDPOINT} \
    --otlp-insecure \
    --rate 50000 \
    --duration 30s \
    --workers 30 \
    --spans 3

echo ""
echo "Benchmark Complete!"
echo "Analyze metrics files: metrics_*.txt"
```

Make the script executable and run it:

```bash
chmod +x benchmark-collector.sh
./benchmark-collector.sh
```

## Analyzing Benchmark Results

After running benchmarks, analyze collector metrics to identify bottlenecks:

```bash
# Extract key performance metrics
grep "otelcol_receiver_accepted_spans" metrics_*.txt
grep "otelcol_receiver_refused_spans" metrics_*.txt
grep "otelcol_processor_batch_batch_send_size" metrics_*.txt
grep "otelcol_exporter_sent_spans" metrics_*.txt
grep "otelcol_exporter_send_failed_spans" metrics_*.txt

# Check for data loss
# If refused or failed spans > 0, collector is overloaded
```

Key metrics to analyze:

```promql
# Throughput: spans successfully processed
rate(otelcol_receiver_accepted_spans[1m])

# Data loss: spans refused due to memory limits
rate(otelcol_receiver_refused_spans[1m])

# Export failures: spans that failed to export
rate(otelcol_exporter_send_failed_spans[1m])

# Queue utilization: how full are export queues
otelcol_exporter_queue_size / otelcol_exporter_queue_capacity

# Processing latency: time in batch processor
otelcol_processor_batch_batch_send_size_bucket
```

## Stress Testing with Multiple Signal Types

Test mixed workloads that combine traces, metrics, and logs:

```bash
# Create a multi-signal stress test
#!/bin/bash
# multi-signal-test.sh

ENDPOINT="localhost:4317"
DURATION="300s"

# Generate traces in background
telemetrygen traces \
    --otlp-endpoint ${ENDPOINT} \
    --otlp-insecure \
    --rate 5000 \
    --duration ${DURATION} \
    --workers 10 \
    --spans 5 &

# Generate metrics in background
telemetrygen metrics \
    --otlp-endpoint ${ENDPOINT} \
    --otlp-insecure \
    --rate 2000 \
    --duration ${DURATION} \
    --workers 5 \
    --metrics 20 &

# Generate logs in background
telemetrygen logs \
    --otlp-endpoint ${ENDPOINT} \
    --otlp-insecure \
    --rate 10000 \
    --duration ${DURATION} \
    --workers 10 &

# Wait for all generators to complete
wait

echo "Multi-signal stress test complete"
```

## Benchmarking with Authentication

Test collector configurations that require authentication:

```bash
# Generate traces with API key header
telemetrygen traces \
  --otlp-endpoint localhost:4317 \
  --otlp-insecure \
  --otlp-headers "x-api-key=your-api-key-here" \
  --rate 1000 \
  --duration 60s

# Test with TLS enabled
telemetrygen traces \
  --otlp-endpoint collector.example.com:4317 \
  --otlp-certificate /path/to/ca-cert.pem \
  --rate 1000 \
  --duration 60s

# Test with client certificates
telemetrygen traces \
  --otlp-endpoint collector.example.com:4317 \
  --otlp-certificate /path/to/ca-cert.pem \
  --otlp-client-certificate /path/to/client-cert.pem \
  --otlp-client-key /path/to/client-key.pem \
  --rate 1000 \
  --duration 60s
```

## Kubernetes Load Testing

Deploy telemetrygen as a Kubernetes Job for distributed load testing:

```yaml
# telemetrygen-job.yaml - Kubernetes load test job
apiVersion: batch/v1
kind: Job
metadata:
  name: otel-load-test
  namespace: observability
spec:
  # Run multiple pods for distributed load generation
  parallelism: 5
  completions: 5
  template:
    spec:
      restartPolicy: Never
      containers:
      - name: telemetrygen
        image: ghcr.io/open-telemetry/opentelemetry-collector-contrib/telemetrygen:latest
        args:
        - traces
        - --otlp-endpoint=otel-collector:4317
        - --otlp-insecure
        - --rate=5000
        - --duration=300s
        - --workers=10
        - --spans=5
        resources:
          requests:
            cpu: 500m
            memory: 256Mi
          limits:
            cpu: 1000m
            memory: 512Mi
```

Deploy and monitor the load test:

```bash
# Apply the job
kubectl apply -f telemetrygen-job.yaml

# Monitor job progress
kubectl get jobs -n observability -w

# Check pod logs
kubectl logs -n observability -l job-name=otel-load-test --tail=50

# Monitor collector during test
kubectl top pod -n observability -l app=otel-collector

# View collector logs for errors
kubectl logs -n observability -l app=otel-collector --tail=100
```

## Interpreting Results and Tuning

Use benchmark results to tune your collector configuration:

### If you see refused spans:

```yaml
# Increase memory limit
processors:
  memory_limiter:
    limit_mib: 4096  # Increase from 2048
    spike_limit_mib: 1024
```

### If you see export queue saturation:

```yaml
# Increase queue size and consumers
exporters:
  otlp:
    sending_queue:
      queue_size: 2000  # Increase from 1000
      num_consumers: 20  # Increase from 10
```

### If CPU is maxed out:

- Reduce processing complexity
- Remove unnecessary processors
- Scale horizontally with more collector instances

### If memory grows unbounded:

- Reduce batch sizes
- Decrease queue sizes
- Enable persistent queue with limits

## Best Practices for Benchmarking

Follow these practices for accurate benchmarks:

1. **Start with baseline**: Test with minimal pipeline first
2. **Isolate components**: Test one change at a time
3. **Run sustained tests**: 5-10 minutes minimum to see steady state
4. **Monitor resources**: CPU, memory, network, disk I/O
5. **Test failure scenarios**: Simulate backend unavailability
6. **Use realistic data**: Match production trace complexity
7. **Document results**: Keep records for comparison
8. **Test horizontally**: Validate scaling characteristics

## Conclusion

telemetrygen is an essential tool for validating OpenTelemetry Collector performance before production deployment. By systematically benchmarking with realistic loads and analyzing the results, you can right-size resources, tune configurations, and ensure reliable telemetry pipelines. Always benchmark with workloads that match your production characteristics, and monitor collector metrics throughout testing to identify bottlenecks early.

For more information on collector performance tuning, see related posts:
- https://oneuptime.com/blog/post/right-size-cpu-memory-opentelemetry-collector/view
- https://oneuptime.com/blog/post/persistent-queue-storage-collector-reliability/view
- https://oneuptime.com/blog/post/troubleshoot-collector-not-exporting-data/view
