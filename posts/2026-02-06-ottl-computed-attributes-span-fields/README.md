# How to Write OTTL Statements That Add Computed Attributes Based

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Computed Attributes, Transform Processor

Description: Write OTTL statements that compute new span attributes from multiple existing span fields for richer observability data in the Collector.

Sometimes the most useful attributes on a span are not set by the instrumentation library but need to be computed from other fields. A "slow request" flag derived from duration and HTTP route, an "error category" computed from exception type and status code, or a "service tier" based on service name patterns. OTTL lets you compute these derived attributes in the Collector without modifying application code.

## Computing Attributes from Duration

The span duration can be computed from `span.end_time_unix_nano - span.start_time_unix_nano` in OTTL:

```yaml
processors:
  transform/computed:
    trace_statements:
      - context: span
        statements:
          # Flag slow spans based on duration
          # Duration is in nanoseconds
          - set(span.attributes["perf.slow"], true) where span.end_time_unix_nano - span.start_time_unix_nano > 1000000000
          # 1 second = 1,000,000,000 nanoseconds

          # More granular classification
          - set(span.attributes["perf.category"], "fast") where span.end_time_unix_nano - span.start_time_unix_nano <= 100000000
          - set(span.attributes["perf.category"], "normal") where span.end_time_unix_nano - span.start_time_unix_nano > 100000000 and span.end_time_unix_nano - span.start_time_unix_nano <= 500000000
          - set(span.attributes["perf.category"], "slow") where span.end_time_unix_nano - span.start_time_unix_nano > 500000000 and span.end_time_unix_nano - span.start_time_unix_nano <= 2000000000
          - set(span.attributes["perf.category"], "very_slow") where span.end_time_unix_nano - span.start_time_unix_nano > 2000000000
```

## Computing from Multiple Attributes

Combine information from several span fields:

```yaml
processors:
  transform/multi_field:
    trace_statements:
      - context: span
        statements:
          # Compute a composite route key from method and path
          - set(span.attributes["http.endpoint"], Concat([span.attributes["http.request.method"], span.attributes["http.route"]], " ")) where span.attributes["http.request.method"] != nil and span.attributes["http.route"] != nil

          # Flag critical errors: 5xx on high-priority routes
          - set(span.attributes["alert.critical"], true) where span.attributes["http.response.status_code"] >= 500 and IsMatch(span.attributes["http.route"], "^/(checkout|payment|auth)/.*")

          # Compute error context from exception and status
          - set(span.attributes["error.context"], Concat([span.attributes["exception.type"], " on ", span.attributes["http.route"]], "")) where span.status.code == STATUS_CODE_ERROR and span.attributes["exception.type"] != nil and span.attributes["http.route"] != nil
```

## SLA-Based Attribute Computation

Compute whether a request met its SLA based on route and duration:

```yaml
processors:
  transform/sla:
    trace_statements:
      - context: span
        statements:
          # Different SLA thresholds per endpoint type
          # API endpoints: 200ms SLA
          - set(span.attributes["sla.met"], true) where IsMatch(span.attributes["http.route"], "^/api/.*") and span.end_time_unix_nano - span.start_time_unix_nano <= 200000000
          - set(span.attributes["sla.met"], false) where IsMatch(span.attributes["http.route"], "^/api/.*") and span.end_time_unix_nano - span.start_time_unix_nano > 200000000

          # Webhook endpoints: 5s SLA (more lenient)
          - set(span.attributes["sla.met"], true) where IsMatch(span.attributes["http.route"], "^/webhooks/.*") and span.end_time_unix_nano - span.start_time_unix_nano <= 5000000000
          - set(span.attributes["sla.met"], false) where IsMatch(span.attributes["http.route"], "^/webhooks/.*") and span.end_time_unix_nano - span.start_time_unix_nano > 5000000000

          # Report generation: 30s SLA
          - set(span.attributes["sla.met"], true) where IsMatch(span.attributes["http.route"], "^/reports/.*") and span.end_time_unix_nano - span.start_time_unix_nano <= 30000000000
          - set(span.attributes["sla.met"], false) where IsMatch(span.attributes["http.route"], "^/reports/.*") and span.end_time_unix_nano - span.start_time_unix_nano > 30000000000

          # Add the SLA threshold for context
          - set(span.attributes["sla.threshold_ms"], 200) where IsMatch(span.attributes["http.route"], "^/api/.*")
          - set(span.attributes["sla.threshold_ms"], 5000) where IsMatch(span.attributes["http.route"], "^/webhooks/.*")
          - set(span.attributes["sla.threshold_ms"], 30000) where IsMatch(span.attributes["http.route"], "^/reports/.*")
```

## Error Categorization

Classify errors into actionable categories:

```yaml
processors:
  transform/error_categories:
    trace_statements:
      - context: span
        statements:
          # Categorize based on exception type
          - set(span.attributes["error.category"], "timeout") where IsMatch(span.attributes["exception.type"], "(?i).*(Timeout|DeadlineExceeded).*")
          - set(span.attributes["error.category"], "connection") where IsMatch(span.attributes["exception.type"], "(?i).*(Connection|Socket|Network).*")
          - set(span.attributes["error.category"], "auth") where IsMatch(span.attributes["exception.type"], "(?i).*(Auth|Unauthorized|Forbidden|Permission).*")
          - set(span.attributes["error.category"], "validation") where IsMatch(span.attributes["exception.type"], "(?i).*(Validation|Invalid|BadRequest).*")
          - set(span.attributes["error.category"], "not_found") where IsMatch(span.attributes["exception.type"], "(?i).*(NotFound|NoSuch).*")
          - set(span.attributes["error.category"], "rate_limit") where span.attributes["http.response.status_code"] == 429
          - set(span.attributes["error.category"], "unknown") where span.status.code == STATUS_CODE_ERROR and span.attributes["error.category"] == nil

          # Set actionability flag
          - set(span.attributes["error.actionable"], true) where span.attributes["error.category"] == "timeout" or span.attributes["error.category"] == "connection"
          - set(span.attributes["error.actionable"], false) where span.attributes["error.category"] == "validation" or span.attributes["error.category"] == "not_found"
```

## Computing from Resource and Span Fields Together

Combine resource-level and span-level data:

```yaml
processors:
  transform/cross_level:
    trace_statements:
      - context: span
        statements:
          # Build a fully qualified operation name
          - set(span.attributes["operation.fqn"], Concat([resource.attributes["service.name"], ".", span.name], ""))

          # Determine criticality from service and HTTP route
          - set(span.attributes["criticality"], "high") where resource.attributes["service.name"] == "checkout-service" and IsMatch(span.attributes["http.route"], "^/api/(payment|order).*")
          - set(span.attributes["criticality"], "medium") where resource.attributes["service.name"] == "checkout-service" and span.attributes["criticality"] == nil
          - set(span.attributes["criticality"], "low") where resource.attributes["deployment.environment"] == "staging"
```

## Computing Span Kind Descriptions

Make span kind more readable:

```yaml
processors:
  transform/span_kind:
    trace_statements:
      - context: span
        statements:
          # Map span kind integer to readable string
          # SPAN_KIND_INTERNAL: Internal, SPAN_KIND_SERVER: Server, SPAN_KIND_CLIENT: Client, SPAN_KIND_PRODUCER: Producer, SPAN_KIND_CONSUMER: Consumer
          - set(span.attributes["span.kind.label"], "internal") where span.kind == SPAN_KIND_INTERNAL
          - set(span.attributes["span.kind.label"], "server") where span.kind == SPAN_KIND_SERVER
          - set(span.attributes["span.kind.label"], "client") where span.kind == SPAN_KIND_CLIENT
          - set(span.attributes["span.kind.label"], "producer") where span.kind == SPAN_KIND_PRODUCER
          - set(span.attributes["span.kind.label"], "consumer") where span.kind == SPAN_KIND_CONSUMER

          # Compute a direction label
          - set(span.attributes["span.direction"], "inbound") where span.kind == SPAN_KIND_SERVER or span.kind == SPAN_KIND_CONSUMER
          - set(span.attributes["span.direction"], "outbound") where span.kind == SPAN_KIND_CLIENT or span.kind == SPAN_KIND_PRODUCER
          - set(span.attributes["span.direction"], "internal") where span.kind == SPAN_KIND_INTERNAL
```

## Full Configuration

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  transform/compute:
    trace_statements:
      - context: span
        statements:
          # Performance classification
          - set(span.attributes["perf.category"], "fast") where span.end_time_unix_nano - span.start_time_unix_nano <= 100000000
          - set(span.attributes["perf.category"], "normal") where span.end_time_unix_nano - span.start_time_unix_nano > 100000000 and span.end_time_unix_nano - span.start_time_unix_nano <= 1000000000
          - set(span.attributes["perf.category"], "slow") where span.end_time_unix_nano - span.start_time_unix_nano > 1000000000

          # Error classification
          - set(span.attributes["error.category"], "server") where span.attributes["http.response.status_code"] >= 500
          - set(span.attributes["error.category"], "client") where span.attributes["http.response.status_code"] >= 400 and span.attributes["http.response.status_code"] < 500

          # Composite key for grouping
          - set(span.attributes["group.key"], Concat([resource.attributes["service.name"], span.attributes["http.request.method"], span.attributes["http.route"]], "|")) where resource.attributes["service.name"] != nil and span.attributes["http.request.method"] != nil and span.attributes["http.route"] != nil

  batch:
    send_batch_size: 512
    timeout: 5s

exporters:
  otlp:
    endpoint: backend:4317
    tls:
      insecure: true

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [transform/compute, batch]
      exporters: [otlp]
```

Computed attributes turn raw telemetry into actionable signals. By deriving SLA compliance, error categories, and performance tiers in the Collector, your dashboards and alerts can work with high-level concepts instead of raw numbers.
