# How to Define Custom Exporters, Processors, and Samplers in OpenTelemetry Declarative Configuration YAML

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Custom Exporters, Processors, Samplers, YAML

Description: Define custom exporters, processors, and samplers in your OpenTelemetry declarative YAML configuration for advanced use cases.

The built-in OTLP exporter, batch processor, and ratio-based sampler cover most use cases. But production systems often need more. Maybe you need to export traces to multiple backends simultaneously, filter out noisy spans before they leave your application, or implement a custom sampling strategy based on business logic. The declarative configuration format supports all of this.

## Custom Exporters

### Multiple Exporters

You can define multiple processors in your trace pipeline, each with its own exporter. This lets you send data to multiple backends:

```yaml
# otel-config.yaml
file_format: "0.3"

tracer_provider:
  processors:
    # Primary: send to your main observability backend
    - batch:
        schedule_delay: 5000
        max_export_batch_size: 512
        exporter:
          otlp:
            endpoint: "http://primary-collector:4317"
            protocol: "grpc"
            compression: "gzip"

    # Secondary: send a copy to a data lake for long-term storage
    - batch:
        schedule_delay: 10000
        max_export_batch_size: 1024
        exporter:
          otlp:
            endpoint: "http://data-lake-collector:4317"
            protocol: "grpc"

    # Debug: print to console (useful in staging)
    - simple:
        exporter:
          console: {}
```

Each processor runs independently. If one exporter is slow or fails, it does not block the others.

### Zipkin Exporter

If you need to send traces in Zipkin format (for example, to a legacy system), configure the Zipkin exporter:

```yaml
tracer_provider:
  processors:
    - batch:
        exporter:
          zipkin:
            endpoint: "http://zipkin-server:9411/api/v2/spans"
            timeout: 10000
```

### Console Exporter with Formatting

The console exporter is invaluable during development:

```yaml
tracer_provider:
  processors:
    - simple:
        exporter:
          console: {}

meter_provider:
  readers:
    - periodic:
        interval: 5000
        exporter:
          console: {}

logger_provider:
  processors:
    - simple:
        exporter:
          console: {}
```

## Custom Processors

### Span Processor Chain

Processors execute in the order they are defined. This lets you build a processing chain:

```yaml
tracer_provider:
  processors:
    # Step 1: Filter out unwanted spans
    - filter:
        spans:
          exclude:
            match_type: "regexp"
            span_names:
              - "^health.*"
              - "^readiness.*"
              - "^GET /favicon.ico$"

    # Step 2: Add custom attributes
    - attributes:
        actions:
          - key: "team.name"
            value: "platform"
            action: "insert"
          - key: "cost.center"
            value: "engineering"
            action: "insert"

    # Step 3: Batch and export
    - batch:
        schedule_delay: 5000
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"
```

### Attribute Processor

The attribute processor lets you manipulate span attributes before export. This is useful for redacting sensitive data:

```yaml
tracer_provider:
  processors:
    - attributes:
        actions:
          # Redact credit card numbers from db.statement
          - key: "db.statement"
            action: "update"
            pattern: "\\b\\d{4}[- ]?\\d{4}[- ]?\\d{4}[- ]?\\d{4}\\b"
            replacement: "[REDACTED]"

          # Add a static attribute
          - key: "otel.library.source"
            value: "declarative-config"
            action: "insert"

          # Remove an attribute entirely
          - key: "http.request.header.cookie"
            action: "delete"

    - batch:
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"
```

## Custom Samplers

### Parent-Based with Custom Root Sampler

The parent-based sampler is the standard choice. It respects the sampling decision of the parent span and only applies the root sampler to traces that originate in your service:

```yaml
tracer_provider:
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.1  # 10% of new traces
      remote_parent_sampled:
        always_on: {}
      remote_parent_not_sampled:
        always_off: {}
      local_parent_sampled:
        always_on: {}
      local_parent_not_sampled:
        always_off: {}
```

### Always On / Always Off

For development or specific services that must capture everything:

```yaml
# Capture all traces
tracer_provider:
  sampler:
    always_on: {}
```

```yaml
# Disable tracing entirely
tracer_provider:
  sampler:
    always_off: {}
```

### Rule-Based Sampling

For more complex scenarios, you can configure rule-based sampling that applies different rates to different operations:

```yaml
tracer_provider:
  sampler:
    jaeger_remote:
      endpoint: "http://sampling-service:5778/sampling"
      polling_interval: 60000  # refresh rules every 60s
      initial_sampler:
        parent_based:
          root:
            trace_id_ratio_based:
              ratio: 0.01  # fallback: 1% until rules load
```

## Metric Views as Custom Processing

For metrics, "views" serve as the equivalent of processors, letting you customize how instruments are aggregated:

```yaml
meter_provider:
  readers:
    - periodic:
        interval: 30000
        exporter:
          otlp:
            endpoint: "http://collector:4317"
            protocol: "grpc"

  views:
    # Custom histogram buckets for request duration
    - selector:
        instrument_name: "http.server.request.duration"
        instrument_type: "histogram"
      stream:
        aggregation:
          explicit_bucket_histogram:
            boundaries: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1.0, 5.0]

    # Drop a noisy metric entirely
    - selector:
        instrument_name: "jvm.gc.pause"
      stream:
        aggregation:
          drop: {}

    # Rename a metric
    - selector:
        instrument_name: "process.runtime.jvm.memory.usage"
      stream:
        name: "jvm.memory.used"
        description: "JVM memory usage in bytes"

    # Remove high-cardinality attributes from a metric
    - selector:
        instrument_name: "http.server.request.duration"
      stream:
        attribute_keys:
          - "http.request.method"
          - "http.response.status_code"
          - "http.route"
          # deliberately omitting url.full to reduce cardinality
```

## Putting It All Together

Here is a production-grade config that combines custom processors, exporters, and samplers:

```yaml
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    deployment.environment: "${DEPLOY_ENV}"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 4096
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: ${SAMPLE_RATIO:-0.1}

meter_provider:
  readers:
    - periodic:
        interval: 60000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
  views:
    - selector:
        instrument_name: "http.server.request.duration"
      stream:
        aggregation:
          explicit_bucket_histogram:
            boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0]

logger_provider:
  processors:
    - batch:
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]
```

## Wrapping Up

Declarative configuration gives you the flexibility to define custom exporters, processors, and samplers without writing any code. Multiple exporters let you fan out to different backends. Processor chains let you filter, enrich, and redact telemetry. Custom samplers let you balance data volume against observability coverage. Define it all in YAML, validate it against the schema, and deploy it with confidence.
