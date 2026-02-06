# How to Write Your First OpenTelemetry Declarative Configuration File with Trace, Metric, and Log Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Declarative Configuration, Traces, Metrics, Logs

Description: A step-by-step guide to writing your first OpenTelemetry declarative YAML configuration with trace, metric, and log pipelines.

Getting all three observability signals (traces, metrics, and logs) configured in a single place has historically been a juggling act of environment variables, programmatic SDK initialization code, and collector configs. The OpenTelemetry declarative configuration format changes that by letting you define trace, metric, and log pipelines in one YAML file that the SDK reads at startup.

This post walks you through building that file from scratch.

## The Structure of a Declarative Configuration File

Every OpenTelemetry declarative configuration file has a standard top-level structure:

```yaml
# otel-config.yaml
file_format: "0.3"

# Disabled flag - set to true to disable the SDK entirely
disabled: false

# Resource attributes shared by all signals
resource:
  attributes: {}

# Trace pipeline
tracer_provider: {}

# Metric pipeline
meter_provider: {}

# Log pipeline
logger_provider: {}

# Context propagation
propagator: {}
```

Let us fill in each section with a practical setup that sends all three signals to an OTLP-compatible backend.

## Step 1: Define Your Resource

The resource block defines attributes that get attached to every piece of telemetry your application emits. At minimum, you want `service.name`:

```yaml
resource:
  attributes:
    service.name: "order-service"
    service.version: "1.8.0"
    deployment.environment: "staging"
    service.namespace: "ecommerce"
```

These attributes show up on every trace span, every metric data point, and every log record. They are how you filter and group telemetry in your observability backend.

## Step 2: Configure the Trace Pipeline

The tracer provider section defines how spans are processed and exported. A typical setup uses a batch processor (to avoid sending one span at a time) with an OTLP exporter:

```yaml
tracer_provider:
  processors:
    # Batch processor groups spans before export
    - batch:
        schedule_delay: 5000       # milliseconds between exports
        max_queue_size: 2048       # max spans queued in memory
        max_export_batch_size: 512 # max spans per export call
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"
            timeout: 10000  # export timeout in ms
            compression: "gzip"

  # Sampler controls what percentage of traces are recorded
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.25  # sample 25% of root spans

  # Limits to protect against runaway instrumentation
  limits:
    attribute_count_limit: 128
    attribute_value_length_limit: 4096
    event_count_limit: 128
    link_count_limit: 128
```

The `parent_based` sampler is important. It means that if a parent span was sampled, all child spans will also be sampled, keeping traces complete. Only root spans (the first span in a trace) use the ratio-based decision.

## Step 3: Configure the Metric Pipeline

Metrics use a different model than traces. Instead of processors and exporters, you configure metric readers that periodically collect and export metrics:

```yaml
meter_provider:
  readers:
    # Periodic reader collects metrics at a fixed interval
    - periodic:
        interval: 30000       # collect every 30 seconds
        timeout: 15000        # timeout for each collection
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"
            temporality_preference: "delta"  # or "cumulative"
            default_histogram_aggregation: "explicit_bucket_histogram"

  # Views let you customize how specific instruments are aggregated
  views:
    - selector:
        instrument_name: "http.server.request.duration"
      stream:
        aggregation:
          explicit_bucket_histogram:
            boundaries: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1.0, 2.5, 5.0, 10.0]
```

The `views` section is optional but powerful. It lets you redefine histogram bucket boundaries, drop unwanted attributes, or rename instruments without changing application code.

## Step 4: Configure the Log Pipeline

The logger provider follows the same pattern as the tracer provider, using processors and exporters:

```yaml
logger_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 2048
        max_export_batch_size: 512
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"

  # Limits for log records
  limits:
    attribute_count_limit: 128
    attribute_value_length_limit: 8192  # logs can have longer values
```

## Step 5: Configure Propagation

The propagator section defines which context propagation formats your application uses. W3C Trace Context is the standard:

```yaml
propagator:
  composite: [tracecontext, baggage]
```

If you need to interoperate with services using B3 headers (common in Zipkin-based systems), add `b3multi` to the list.

## The Complete File

Here is everything put together:

```yaml
# otel-config.yaml - Full three-signal configuration
file_format: "0.3"
disabled: false

resource:
  attributes:
    service.name: "order-service"
    service.version: "1.8.0"
    deployment.environment: "staging"
    service.namespace: "ecommerce"

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 2048
        max_export_batch_size: 512
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"
            compression: "gzip"
  sampler:
    parent_based:
      root:
        trace_id_ratio_based:
          ratio: 0.25
  limits:
    attribute_count_limit: 128
    event_count_limit: 128
    link_count_limit: 128

meter_provider:
  readers:
    - periodic:
        interval: 30000
        timeout: 15000
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"
            temporality_preference: "delta"

logger_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 2048
        exporter:
          otlp:
            endpoint: "http://otel-collector:4317"
            protocol: "grpc"

propagator:
  composite: [tracecontext, baggage]
```

## Running Your Application with the Config

Point your SDK to this file with a single environment variable:

```bash
export OTEL_EXPERIMENTAL_CONFIG_FILE="./otel-config.yaml"
java -jar order-service.jar
```

That is all it takes. The SDK parses the YAML at startup and configures all three signal pipelines. No programmatic configuration code, no scattered environment variables.

## Next Steps

Once you have this baseline working, you can iterate. Adjust sampler ratios, add views to customize metric aggregation, tune batch processor settings for throughput versus latency, and add environment variable substitution for values that change between deployments. The declarative format makes all of these changes reviewable in version control.
