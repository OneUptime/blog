# How to Implement Conditional Routing with OTTL Statements to Send Error Traces to a Dedicated Backend

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Routing, Error Traces, Collector

Description: Configure OTTL-based conditional routing in the OpenTelemetry Collector to send error traces to a dedicated backend for faster debugging.

Not all traces are created equal. When a span has a status of ERROR, you probably want it in a fast, low-latency backend where your on-call engineer can query it immediately. Meanwhile, the bulk of successful traces can go to cheaper, higher-latency storage. The OpenTelemetry Collector's routing connector combined with OTTL (OpenTelemetry Transformation Language) makes this possible without touching your application code.

## What Is OTTL?

OTTL is a domain-specific language built into the OpenTelemetry Collector. It lets you write expressions that match against telemetry attributes, resource fields, and span properties. Think of it like SQL WHERE clauses but for telemetry data. The routing connector evaluates these expressions and sends matching data to the appropriate pipeline.

## The Routing Architecture

```
                                 +--> [error pipeline] --> [Fast Backend]
[OTLP Receiver] --> [Routing] --|
                                 +--> [default pipeline] --> [Standard Backend]
```

The routing connector sits between pipelines. It reads each trace, evaluates the OTTL condition, and forwards the trace to the matching downstream pipeline.

## Full Configuration

```yaml
# otel-collector-config.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  # The routing connector evaluates OTTL and directs data
  routing:
    table:
      # Match spans where status code is ERROR
      - statement: route() where attributes["otel.status_code"] == "ERROR"
        pipelines: [traces/errors]
      # Match spans that have exception events
      - statement: route() where attributes["exception.type"] != nil
        pipelines: [traces/errors]
    # Everything that doesn't match goes to the default
    default_pipelines: [traces/default]

processors:
  batch/fast:
    send_batch_size: 64
    timeout: 1s

  batch/standard:
    send_batch_size: 512
    timeout: 10s

exporters:
  # Fast backend for errors - small batch, quick flush
  otlp/errors:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
      x-priority: "high"

  # Standard backend for normal traces
  otlp/standard:
    endpoint: "https://otlp.oneuptime.com:4317"
    headers:
      x-oneuptime-token: "${ONEUPTIME_TOKEN}"
      x-priority: "normal"

service:
  pipelines:
    # Ingestion pipeline feeds the routing connector
    traces:
      receivers: [otlp]
      processors: []
      exporters: [routing]

    # Error traces get batched quickly and sent fast
    traces/errors:
      receivers: [routing]
      processors: [batch/fast]
      exporters: [otlp/errors]

    # Normal traces use larger batches for efficiency
    traces/default:
      receivers: [routing]
      processors: [batch/standard]
      exporters: [otlp/standard]
```

## Understanding the OTTL Statements

Let's break down the OTTL expressions used above:

```yaml
# This matches any span where the status code attribute equals "ERROR"
- statement: route() where attributes["otel.status_code"] == "ERROR"

# This matches spans that recorded an exception (have exception.type set)
- statement: route() where attributes["exception.type"] != nil
```

You can combine conditions with `and` and `or`:

```yaml
# Route error traces from critical services only
- statement: >
    route() where attributes["otel.status_code"] == "ERROR"
    and resource.attributes["service.name"] == "payment-service"
  pipelines: [traces/critical_errors]
```

## Adding Enrichment to Error Traces

A nice pattern is to add extra attributes to error traces before sending them, so your team can find them faster:

```yaml
processors:
  transform/error_enrich:
    trace_statements:
      - context: span
        statements:
          # Tag error traces for easy filtering in the UI
          - set(attributes["alert.priority"], "high")
          - set(attributes["routing.destination"], "error-pipeline")

service:
  pipelines:
    traces/errors:
      receivers: [routing]
      processors: [transform/error_enrich, batch/fast]
      exporters: [otlp/errors]
```

## Testing the Configuration

Before deploying to production, validate your config and test with a sample trace:

```bash
# Validate the collector config
otelcol-contrib validate --config=otel-collector-config.yaml

# Send a test trace with an error status using curl
curl -X POST http://localhost:4318/v1/traces \
  -H "Content-Type: application/json" \
  -d '{
    "resourceSpans": [{
      "resource": {
        "attributes": [{"key": "service.name", "value": {"stringValue": "test-svc"}}]
      },
      "scopeSpans": [{
        "spans": [{
          "traceId": "5b8efff798038103d269b633813fc60c",
          "spanId": "eee19b7ec3c1b174",
          "name": "failing-operation",
          "kind": 1,
          "startTimeUnixNano": "1544712660000000000",
          "endTimeUnixNano": "1544712661000000000",
          "status": {"code": 2, "message": "internal error"}
        }]
      }]
    }]
  }'
```

## Performance Considerations

The routing connector adds minimal overhead because OTTL expressions are compiled at startup. The evaluation is a simple attribute lookup, not a regex scan. In benchmarks, routing adds less than 1 microsecond per span.

However, keep in mind that you now have two downstream pipelines, each with their own batch processor and exporter queue. Size your memory limiter accordingly.

## When to Use This Pattern

This pattern shines when you want to treat error telemetry differently from normal telemetry. Common use cases include sending errors to a faster query engine, applying different retention policies, or triggering alerts directly from the error pipeline. The key benefit is that all of this happens at the collector level, so your applications remain completely unaware of the routing logic.
