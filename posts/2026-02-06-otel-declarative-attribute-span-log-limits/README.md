# How to Use Declarative Configuration to Define Attribute Limits, Span Limits, and Log Record Limits in a Single File

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Limits, Span Limits, Attribute Limits, Configuration

Description: Configure attribute limits, span limits, and log record limits in a single OpenTelemetry declarative YAML file to protect your pipeline.

Without limits, a single misbehaving service can overwhelm your observability pipeline. A span with 10,000 attributes, a log record with a 5MB body, or a trace with unbounded events can consume your collector's memory, blow up your storage costs, and slow down your queries. OpenTelemetry's declarative configuration lets you define all of these safety limits in one place.

## Why Limits Matter

Here is a real scenario: a developer adds a loop that attaches an attribute for every item in a shopping cart. In production, a power user with 2,000 items in their cart creates spans with 2,000 attributes each. Each span is now 50x larger than normal. Your collector starts OOM-killing, your exporter backs up, and suddenly you lose telemetry for all services, not just the one with the bug.

Limits prevent this by capping the size of telemetry data at the SDK level before it ever leaves the application.

## Attribute Limits

Attribute limits control how many attributes can be attached to any telemetry item (span, metric data point, or log record) and how long each attribute value can be:

```yaml
# otel-config.yaml
file_format: "0.3"

# General attribute limits (apply to all signals)
attribute_limits:
  attribute_count_limit: 128         # max attributes per item
  attribute_value_length_limit: 4096 # max string length per attribute value
```

When the limit is reached, additional attributes are silently dropped. The SDK does not error or crash. It just stops adding attributes beyond the limit.

## Span Limits

Span limits control the maximum size of individual spans. These are separate from attribute limits because spans have additional sub-structures (events, links) that need their own caps:

```yaml
tracer_provider:
  limits:
    # Attribute limits specific to spans
    attribute_count_limit: 128
    attribute_value_length_limit: 4096

    # Event limits - events are timestamped annotations on a span
    event_count_limit: 128
    event_attribute_count_limit: 16

    # Link limits - links connect spans across traces
    link_count_limit: 32
    link_attribute_count_limit: 16
```

Here is what each limit controls:

- **attribute_count_limit**: Maximum number of attributes on a span. Set this to prevent runaway attribute additions.
- **attribute_value_length_limit**: Maximum character length for string attribute values. Prevents someone from shoving an entire HTTP response body into an attribute.
- **event_count_limit**: Maximum number of events (annotations) per span. Libraries that add an event for every retry or every cache lookup can generate hundreds of events.
- **event_attribute_count_limit**: Maximum attributes per event. Each event can have its own attributes, and these need limits too.
- **link_count_limit**: Maximum span links. Links connect related spans across traces. Batch processing systems sometimes link to every input span, which needs a cap.
- **link_attribute_count_limit**: Maximum attributes per link.

## Log Record Limits

Log records have their own set of limits:

```yaml
logger_provider:
  limits:
    attribute_count_limit: 128
    attribute_value_length_limit: 8192  # logs often need longer values than spans
```

Log records tend to have longer attribute values than spans because they sometimes include stack traces, SQL queries, or structured error messages. Setting a higher `attribute_value_length_limit` for logs than spans is reasonable.

## A Complete Configuration with All Limits

Here is a production-ready configuration that sets limits across all three signals:

```yaml
# otel-config.yaml - Production limits configuration
file_format: "0.3"

resource:
  attributes:
    service.name: "${SERVICE_NAME}"
    service.version: "${SERVICE_VERSION}"
    deployment.environment: "${DEPLOY_ENV}"

# General attribute limits (baseline for all signals)
attribute_limits:
  attribute_count_limit: 128
  attribute_value_length_limit: 4096

tracer_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 2048         # limits memory used by pending spans
        max_export_batch_size: 512
        export_timeout: 30000
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

  # Span-specific limits
  limits:
    attribute_count_limit: 128
    attribute_value_length_limit: 4096
    event_count_limit: 128
    event_attribute_count_limit: 16
    link_count_limit: 32
    link_attribute_count_limit: 16

meter_provider:
  readers:
    - periodic:
        interval: 60000
        timeout: 30000
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"

  # Metric views can also act as limits by controlling cardinality
  views:
    # Limit which attributes are kept on high-cardinality metrics
    - selector:
        instrument_name: "http.server.request.duration"
      stream:
        attribute_keys:
          - "http.request.method"
          - "http.response.status_code"
          - "http.route"
          # url.full is deliberately excluded to limit cardinality

logger_provider:
  processors:
    - batch:
        schedule_delay: 5000
        max_queue_size: 2048
        max_export_batch_size: 512
        exporter:
          otlp:
            endpoint: "${COLLECTOR_ENDPOINT}"
            protocol: "grpc"
            compression: "gzip"

  # Log-specific limits
  limits:
    attribute_count_limit: 128
    attribute_value_length_limit: 8192

propagator:
  composite: [tracecontext, baggage]
```

## Batch Processor Limits as Memory Protection

The batch processor settings also function as memory limits. Pay attention to these:

```yaml
tracer_provider:
  processors:
    - batch:
        # Max spans waiting to be exported
        # If this fills up, new spans are dropped
        max_queue_size: 2048

        # Max spans sent in one batch
        max_export_batch_size: 512

        # How long to wait before sending a partial batch
        schedule_delay: 5000

        # How long to wait for an export to complete
        export_timeout: 30000
```

The math is straightforward: `max_queue_size * average_span_size` gives you the worst-case memory usage for the span buffer. With 2048 queued spans at roughly 2KB each, that is about 4MB. Reasonable for most applications.

## Choosing the Right Limits

Here are practical guidelines based on running OpenTelemetry in production:

```yaml
# Conservative limits (good starting point)
# Suitable for most web services
limits:
  attribute_count_limit: 64
  attribute_value_length_limit: 2048
  event_count_limit: 64
  link_count_limit: 16

# Moderate limits (typical production)
# For services with moderate instrumentation complexity
limits:
  attribute_count_limit: 128
  attribute_value_length_limit: 4096
  event_count_limit: 128
  link_count_limit: 32

# Generous limits (data-intensive services)
# For batch processing, ETL pipelines, etc.
limits:
  attribute_count_limit: 256
  attribute_value_length_limit: 8192
  event_count_limit: 256
  link_count_limit: 128
```

## Monitoring Your Limits

You want to know when limits are being hit. The OpenTelemetry SDK exposes internal metrics that tell you about dropped attributes and events:

```bash
# Look for these metrics in your monitoring:
# otel.sdk.span.attributes_dropped - number of dropped attributes
# otel.sdk.span.events_dropped - number of dropped events
# otel.sdk.span.links_dropped - number of dropped links
```

Set up alerts on these metrics. If attributes are being dropped consistently, it might mean your limits are too tight, or it might mean there is a bug adding too many attributes. Either way, you want to know.

## Wrapping Up

Limits are not optional in production. They are the difference between a misbehaving service degrading its own telemetry and that same service taking down your entire observability pipeline. Define attribute limits, span limits, and log record limits in your declarative configuration file, monitor for dropped data, and adjust based on what you see. It takes five minutes to configure and prevents the kind of outage that ruins your weekend.
