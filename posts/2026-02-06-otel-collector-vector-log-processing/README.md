# How to Configure OpenTelemetry Collector with Vector as a Log Processing and Transformation Layer

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Vector, Log Processing, Data Transformation

Description: Step-by-step guide to integrating the OpenTelemetry Collector with Vector for advanced log processing and transformation pipelines.

Vector by Datadog is a high-performance observability data pipeline written in Rust. While the OpenTelemetry Collector handles telemetry collection and routing well, Vector excels at log transformation, parsing, and enrichment. Combining both tools gives you the best of both worlds: standard OTLP ingestion on the front end and powerful log processing in the middle.

## When to Add Vector

You should consider adding Vector when you need to:

- Parse unstructured logs into structured fields using VRL (Vector Remark Language)
- Apply complex filtering logic that goes beyond what the Collector's filter processor supports
- Deduplicate log events based on content
- Route logs to multiple destinations with different transformation rules per destination

## Architecture

The pipeline looks like this:

```
Apps -> OTel Collector (OTLP receiver) -> Vector (processing) -> Backend
```

The Collector receives OTLP data from your applications and forwards logs to Vector over HTTP. Vector applies transformations and sends the processed logs to your storage backend.

## Collector Configuration

Configure the Collector to forward logs to Vector using the OTLP HTTP exporter:

```yaml
# otel-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

exporters:
  # Send logs to Vector
  otlphttp/vector:
    endpoint: http://vector:4319
    tls:
      insecure: true

  # Send traces and metrics directly to your backend
  otlphttp/backend:
    endpoint: https://backend.example.com:4318

processors:
  batch:
    send_batch_size: 2048
    timeout: 1s

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/vector]
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/backend]
    metrics:
      receivers: [otlp]
      processors: [batch]
      exporters: [otlphttp/backend]
```

## Vector Configuration

Now configure Vector to receive OTLP logs, process them, and forward to your backend:

```toml
# vector.toml

# Receive OTLP logs from the Collector
[sources.otel_logs]
type = "opentelemetry"
address = "0.0.0.0:4319"
# Only accept logs, not traces or metrics
grpc.enable = false
http.enable = true

# Parse JSON log bodies
[transforms.parse_json]
type = "remap"
inputs = ["otel_logs"]
source = '''
# Try to parse the log body as JSON
parsed, err = parse_json(.body)
if err == null {
  .body = parsed
  # Extract common fields to top-level attributes
  if exists(.body.level) {
    .attributes.severity = .body.level
  }
  if exists(.body.request_id) {
    .attributes.request_id = .body.request_id
  }
  if exists(.body.user_id) {
    .attributes.user_id = .body.user_id
  }
}
'''

# Filter out health check noise
[transforms.filter_noise]
type = "filter"
inputs = ["parse_json"]
condition = '''
!includes(["GET /healthz", "GET /readyz", "GET /livez"],
  string(.attributes.http_target) ?? "")
'''

# Enrich with environment metadata
[transforms.enrich]
type = "remap"
inputs = ["filter_noise"]
source = '''
.attributes.pipeline_version = "1.2.0"
.attributes.processed_by = "vector"
# Redact sensitive fields
if exists(.body.password) {
  .body.password = "REDACTED"
}
if exists(.body.token) {
  .body.token = "REDACTED"
}
'''

# Send processed logs to the backend
[sinks.backend]
type = "http"
inputs = ["enrich"]
uri = "https://backend.example.com/v1/logs"
encoding.codec = "json"
batch.max_bytes = 10485760
batch.timeout_secs = 2
```

## VRL Transformation Examples

VRL is where Vector really shines. Here are some practical transformations:

```coffeescript
# Parse a Nginx access log line
parsed = parse_regex!(.body,
  r'^(?P<ip>\S+) - (?P<user>\S+) \[(?P<ts>[^\]]+)\] "(?P<method>\S+) (?P<path>\S+) (?P<proto>[^"]+)" (?P<status>\d+) (?P<bytes>\d+)')
.attributes.client_ip = parsed.ip
.attributes.http_method = parsed.method
.attributes.http_path = parsed.path
.attributes.http_status = to_int!(parsed.status)
.attributes.response_bytes = to_int!(parsed.bytes)

# Classify log severity based on content
if contains(string!(.body), "ERROR") || contains(string!(.body), "FATAL") {
  .severity_number = 17
} else if contains(string!(.body), "WARN") {
  .severity_number = 13
} else {
  .severity_number = 9
}

# Sample verbose debug logs at 10%
if .severity_number <= 5 {
  rate = get_env_var("DEBUG_SAMPLE_RATE") ?? "0.1"
  if !sample(to_float!(rate)) {
    abort
  }
}
```

## Docker Compose Setup

Here is a minimal Docker Compose file to run both components together:

```yaml
# docker-compose.yaml
version: "3.8"
services:
  otel-collector:
    image: otel/opentelemetry-collector-contrib:latest
    volumes:
      - ./otel-collector.yaml:/etc/otelcol-contrib/config.yaml
    ports:
      - "4317:4317"
      - "4318:4318"
    depends_on:
      - vector

  vector:
    image: timberio/vector:latest-alpine
    volumes:
      - ./vector.toml:/etc/vector/vector.toml
    ports:
      - "4319:4319"
```

## Performance Tuning

Vector is extremely efficient, but you should still tune it for your workload:

- Set `batch.max_bytes` in sinks to control memory usage.
- Use Vector's built-in `internal_metrics` source to monitor throughput and error rates.
- If you are processing more than 100k events per second, consider running Vector with multiple threads by setting `VECTOR_THREADS` environment variable.

## Wrapping Up

The combination of OpenTelemetry Collector and Vector gives you standardized telemetry ingestion with powerful log processing capabilities. The Collector handles the OTLP protocol and basic routing, while Vector handles the heavy lifting of parsing, transforming, and enriching log data. This separation of concerns makes each component easier to manage and scale independently.
