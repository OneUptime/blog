# How to Benchmark gRPC vs HTTP/2 Performance for OTLP Export

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTLP, GRPC vs HTTP, Performance Benchmarking

Description: Benchmark OTLP gRPC versus HTTP/2 export performance using the OpenTelemetry Collector internal metrics to pick the right protocol.

The OpenTelemetry Collector supports two OTLP transport protocols: gRPC and HTTP (with protobuf or JSON encoding). gRPC runs over HTTP/2, while OTLP/HTTP implementations may use HTTP/1.1 or HTTP/2, and they have different performance characteristics. gRPC uses protobuf encoding with HTTP/2 multiplexing. OTLP/HTTP uses protobuf (or JSON) over standard HTTP POST requests. This post shows you how to benchmark them using the Collector's own internal telemetry.

## Setting Up the Benchmark

Create two Collector instances, one receiving via gRPC and one via HTTP, both exporting to the same backend:

```yaml
# collector-grpc.yaml

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

exporters:
  otlp:
    endpoint: "backend:4317"
    tls:
      insecure: true

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

service:
  telemetry:
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8888
                without_type_suffix: true
                without_units: true
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

```yaml
# collector-http.yaml
receivers:
  otlp:
    protocols:
      http:
        endpoint: 0.0.0.0:4318

exporters:
  otlp:
    endpoint: "backend:4317"
    tls:
      insecure: true

processors:
  batch:
    timeout: 1s
    send_batch_size: 1024

service:
  telemetry:
    metrics:
      level: detailed
      readers:
        - pull:
            exporter:
              prometheus:
                host: 0.0.0.0
                port: 8889
                without_type_suffix: true
                without_units: true
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlp]
```

## Key Internal Metrics to Compare

The Collector exposes several metrics that are useful for benchmarking. Scrape them with Prometheus:

```yaml
# prometheus.yml
scrape_configs:
  - job_name: "otel-collector-grpc"
    static_configs:
      - targets: ["collector-grpc:8888"]
  - job_name: "otel-collector-http"
    static_configs:
      - targets: ["collector-http:8889"]
```

## The Metrics That Matter

```promql
# 1. Receiver throughput: spans accepted per second
rate(otelcol_receiver_accepted_spans[1m])

# 2. Receiver refusals: spans rejected (backpressure signal)
rate(otelcol_receiver_refused_spans[1m])

# 3. Receiver request latency
histogram_quantile(0.95,
  sum(rate({"rpc.server.call.duration_bucket"}[1m])) by (job, le)
)
histogram_quantile(0.95,
  sum(rate({"http.server.request.duration_bucket"}[1m])) by (job, le)
)

# 4. Exporter queue size (are exports keeping up?)
otelcol_exporter_queue_size

# 5. Average processor batch send size
sum(rate(otelcol_processor_batch_batch_send_size_sum[1m])) by (job)
/
sum(rate(otelcol_processor_batch_batch_send_size_count[1m])) by (job)

# 6. Process memory usage
otelcol_process_memory_rss

# 7. CPU usage
rate(otelcol_process_cpu_seconds[1m])
```

## Load Generator Script

Use a Python script to generate consistent load against both endpoints:

```python
import time
import threading
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import (
    OTLPSpanExporter as GrpcExporter,
)
from opentelemetry.exporter.otlp.proto.http.trace_exporter import (
    OTLPSpanExporter as HttpExporter,
)

def generate_load(exporter, protocol_name, spans_per_second, duration_seconds):
    """Generate a controlled load of spans."""
    provider = TracerProvider()
    provider.add_span_processor(BatchSpanProcessor(exporter))
    tracer = provider.get_tracer(f"benchmark-{protocol_name}")

    start = time.time()
    total_spans = 0
    interval = 1.0 / spans_per_second

    while time.time() - start < duration_seconds:
        with tracer.start_as_current_span(
            "benchmark-operation",
            attributes={
                "benchmark.protocol": protocol_name,
                "benchmark.iteration": total_spans,
                "benchmark.data": "x" * 200,  # Simulated payload
            }
        ):
            total_spans += 1

        # Pace the generation
        time.sleep(interval)

    provider.force_flush()
    provider.shutdown()

    elapsed = time.time() - start
    print(f"{protocol_name}: Generated {total_spans} spans in {elapsed:.1f}s "
          f"({total_spans/elapsed:.0f} spans/s)")

# Run benchmarks
SPANS_PER_SECOND = 1000
DURATION = 60  # seconds

grpc_exporter = GrpcExporter(endpoint="localhost:4317", insecure=True)
http_exporter = HttpExporter(endpoint="http://localhost:4318/v1/traces")

# Run in parallel threads
grpc_thread = threading.Thread(
    target=generate_load,
    args=(grpc_exporter, "grpc", SPANS_PER_SECOND, DURATION),
)
http_thread = threading.Thread(
    target=generate_load,
    args=(http_exporter, "http", SPANS_PER_SECOND, DURATION),
)

grpc_thread.start()
http_thread.start()
grpc_thread.join()
http_thread.join()
```

## Analyzing the Results

After running the benchmark, compare the metrics side by side:

```promql
# Throughput comparison
sum(rate(otelcol_receiver_accepted_spans[1m])) by (job)

# Memory comparison
otelcol_process_memory_rss

# CPU comparison
rate(otelcol_process_cpu_seconds[1m])

# Receiver latency comparison (P95)
histogram_quantile(0.95,
  sum(rate({"rpc.server.call.duration_bucket"}[1m])) by (le, job)
)
histogram_quantile(0.95,
  sum(rate({"http.server.request.duration_bucket"}[1m])) by (le, job)
)

# Dropped spans (data loss comparison)
sum(rate(otelcol_receiver_refused_spans[1m])) by (job)
```

## Typical Results

Based on common benchmark findings:

| Metric | gRPC | HTTP/protobuf | HTTP/JSON |
|---|---|---|---|
| Throughput (spans/s) | Highest | High | Moderate |
| CPU usage | Lower | Moderate | Higher |
| Memory usage | Similar | Similar | Higher |
| P95 latency | Lowest | Low | Moderate |
| Compression support | Native gzip | gzip via header | gzip via header |
| Connection reuse | Multiplexed | Keep-alive | Keep-alive |

gRPC often wins on raw performance because of HTTP/2 multiplexing and efficient protobuf serialization. HTTP/protobuf is often close behind and has the advantage of working through more proxies and load balancers. HTTP/JSON is usually the slowest but easiest to debug.

## Choosing the Right Protocol

Pick gRPC when you have direct connectivity and need maximum throughput. Pick HTTP/protobuf when you need to go through proxies, CDNs, or load balancers that do not support gRPC. Pick HTTP/JSON only for debugging or when your backend does not support protobuf.

The Collector's internal metrics make this comparison easy to do with your actual data and infrastructure rather than relying on synthetic benchmarks.
