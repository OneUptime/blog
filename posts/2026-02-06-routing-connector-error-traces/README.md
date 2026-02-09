# How to Use the Routing Connector to Send Error Traces to One Backend and Normal Traces to Another

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Routing Connector, Error Traces, Collector, Observability

Description: Configure the OpenTelemetry Collector routing connector to split error traces from normal traces and send them to different backends.

Not all traces are created equal. Error traces carry critical debugging information and usually need different retention policies, alerting, and storage compared to successful request traces. By routing error traces to a dedicated backend, you can apply longer retention, faster indexing, or simply keep costs down by sending normal traces to cheaper storage.

The OpenTelemetry Collector routing connector makes this split easy.

## How the Routing Connector Evaluates Spans

The routing connector can operate in different contexts. For span-level routing, you use the span context which lets you inspect span attributes, status, and other properties. This is important because error status is a property of individual spans, not the entire resource.

## Basic Error Routing Configuration

Here is the core configuration that splits error traces from normal ones:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: "0.0.0.0:4317"

connectors:
  routing/errors:
    default_pipelines: [traces/normal]
    match_once: true
    table:
      # Route spans with ERROR status to the error backend
      - condition: status.code == STATUS_CODE_ERROR
        pipelines: [traces/errors]

exporters:
  otlp/errors:
    endpoint: "error-traces-backend.internal:4317"
    tls:
      insecure: false
  otlp/normal:
    endpoint: "normal-traces-backend.internal:4317"
    tls:
      insecure: false

service:
  pipelines:
    traces/input:
      receivers: [otlp]
      exporters: [routing/errors]
    traces/errors:
      receivers: [routing/errors]
      exporters: [otlp/errors]
    traces/normal:
      receivers: [routing/errors]
      exporters: [otlp/normal]
```

## Routing Based on HTTP Status Codes

Sometimes you want more granularity than just error/not-error. You might want to route 5xx server errors differently from 4xx client errors:

```yaml
connectors:
  routing/http-status:
    default_pipelines: [traces/normal]
    match_once: false
    table:
      # 5xx server errors go to the critical error pipeline
      - condition: attributes["http.response.status_code"] >= 500
        pipelines: [traces/server-errors]
      # 4xx client errors go to a separate pipeline
      - condition: attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500
        pipelines: [traces/client-errors]
```

Note `match_once: false` here. This lets a single span match multiple conditions if needed. In most cases with mutually exclusive conditions like status code ranges, this does not change behavior, but it is good to be explicit about your intent.

## Sending Errors to Both Backends

A common pattern is to send error traces to both the error-specific backend and the normal backend. This way your normal trace view is complete (includes errors), but you also have a dedicated error store for faster debugging:

```yaml
connectors:
  routing/errors-fanout:
    default_pipelines: [traces/normal]
    match_once: true
    table:
      # Errors go to BOTH the error pipeline and normal pipeline
      - condition: status.code == STATUS_CODE_ERROR
        pipelines: [traces/errors, traces/normal]

service:
  pipelines:
    traces/input:
      receivers: [otlp]
      exporters: [routing/errors-fanout]
    traces/errors:
      receivers: [routing/errors-fanout]
      processors: [batch/errors]
      exporters: [otlp/errors]
    traces/normal:
      receivers: [routing/errors-fanout]
      processors: [batch/normal]
      exporters: [otlp/normal]
```

## Adding Error-Specific Processing

You can enrich error traces with additional context before sending them to the error backend. For example, adding a priority label or extracting exception details:

```yaml
processors:
  attributes/error-enrichment:
    actions:
      - key: error.priority
        value: "high"
        action: upsert
      - key: alert.channel
        value: "pagerduty"
        action: upsert

  # Keep all error traces, no sampling
  batch/errors:
    timeout: 1s
    send_batch_size: 256

  # Sample normal traces more aggressively
  probabilistic_sampler/normal:
    sampling_percentage: 10

  batch/normal:
    timeout: 10s
    send_batch_size: 1024

service:
  pipelines:
    traces/errors:
      receivers: [routing/errors-fanout]
      processors: [attributes/error-enrichment, batch/errors]
      exporters: [otlp/errors]
    traces/normal:
      receivers: [routing/errors-fanout]
      processors: [probabilistic_sampler/normal, batch/normal]
      exporters: [otlp/normal]
```

This gives you 100% retention on error traces and 10% sampling on normal traces. That is a very cost-effective approach when you care most about debugging failures.

## Matching on Exception Attributes

You can also route based on specific exception types or messages:

```yaml
connectors:
  routing/exceptions:
    default_pipelines: [traces/normal]
    match_once: true
    table:
      # Route OutOfMemoryError to a specific pipeline
      - condition: IsMatch(attributes["exception.type"], ".*OutOfMemoryError.*")
        pipelines: [traces/oom-errors]
      # Route timeout exceptions separately
      - condition: IsMatch(attributes["exception.type"], ".*TimeoutException.*")
        pipelines: [traces/timeout-errors]
      # Catch-all for other errors
      - condition: status.code == STATUS_CODE_ERROR
        pipelines: [traces/general-errors]
```

## Verifying the Setup

After deploying, check the Collector's own metrics to confirm data is flowing through both pipelines:

```bash
# Check exporter metrics to see data flow
curl -s http://localhost:8888/metrics | grep otelcol_exporter_sent_spans
```

You should see separate counters for each exporter, confirming that the split is working.

This pattern is one of the highest-value routing configurations you can set up. It directly impacts your ability to debug production issues quickly while keeping your observability costs reasonable.
