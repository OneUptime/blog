# How to Write OTTL Statements That Add Computed Attributes Based on Multiple Existing Span Fields

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, OTTL, Computed Attributes, Transform Processor

Description: Write OTTL statements that compute new span attributes from multiple existing span fields for richer observability data in the Collector.

Sometimes the most useful attributes on a span are not set by the instrumentation library but need to be computed from other fields. A "slow request" flag derived from duration and HTTP route, an "error category" computed from exception type and status code, or a "service tier" based on service name patterns. OTTL lets you compute these derived attributes in the Collector without modifying application code.

## Computing Attributes from Duration

The span duration is accessible via the `duration` field in OTTL, representing the span's elapsed time:

```yaml
processors:
  transform/computed:
    trace_statements:
      - context: span
        statements:
          # Flag slow spans based on duration
          # Duration is in nanoseconds
          - set(attributes["perf.slow"], true) where duration > 1000000000
          # 1 second = 1,000,000,000 nanoseconds

          # More granular classification
          - set(attributes["perf.category"], "fast") where duration <= 100000000
          - set(attributes["perf.category"], "normal") where duration > 100000000 and duration <= 500000000
          - set(attributes["perf.category"], "slow") where duration > 500000000 and duration <= 2000000000
          - set(attributes["perf.category"], "very_slow") where duration > 2000000000
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
          - set(attributes["http.endpoint"], Concat([attributes["http.method"], attributes["http.route"]], " ")) where attributes["http.method"] != nil and attributes["http.route"] != nil

          # Flag critical errors: 5xx on high-priority routes
          - set(attributes["alert.critical"], true) where attributes["http.response.status_code"] >= 500 and IsMatch(attributes["http.route"], "^/(checkout|payment|auth)/.*")

          # Compute error context from exception and status
          - set(attributes["error.context"], Concat([attributes["exception.type"], " on ", attributes["http.route"]], "")) where status.code == 2 and attributes["exception.type"] != nil and attributes["http.route"] != nil
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
          - set(attributes["sla.met"], true) where IsMatch(attributes["http.route"], "^/api/.*") and duration <= 200000000
          - set(attributes["sla.met"], false) where IsMatch(attributes["http.route"], "^/api/.*") and duration > 200000000

          # Webhook endpoints: 5s SLA (more lenient)
          - set(attributes["sla.met"], true) where IsMatch(attributes["http.route"], "^/webhooks/.*") and duration <= 5000000000
          - set(attributes["sla.met"], false) where IsMatch(attributes["http.route"], "^/webhooks/.*") and duration > 5000000000

          # Report generation: 30s SLA
          - set(attributes["sla.met"], true) where IsMatch(attributes["http.route"], "^/reports/.*") and duration <= 30000000000
          - set(attributes["sla.met"], false) where IsMatch(attributes["http.route"], "^/reports/.*") and duration > 30000000000

          # Add the SLA threshold for context
          - set(attributes["sla.threshold_ms"], 200) where IsMatch(attributes["http.route"], "^/api/.*")
          - set(attributes["sla.threshold_ms"], 5000) where IsMatch(attributes["http.route"], "^/webhooks/.*")
          - set(attributes["sla.threshold_ms"], 30000) where IsMatch(attributes["http.route"], "^/reports/.*")
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
          - set(attributes["error.category"], "timeout") where IsMatch(attributes["exception.type"], "(?i).*(Timeout|DeadlineExceeded).*")
          - set(attributes["error.category"], "connection") where IsMatch(attributes["exception.type"], "(?i).*(Connection|Socket|Network).*")
          - set(attributes["error.category"], "auth") where IsMatch(attributes["exception.type"], "(?i).*(Auth|Unauthorized|Forbidden|Permission).*")
          - set(attributes["error.category"], "validation") where IsMatch(attributes["exception.type"], "(?i).*(Validation|Invalid|BadRequest).*")
          - set(attributes["error.category"], "not_found") where IsMatch(attributes["exception.type"], "(?i).*(NotFound|NoSuch).*")
          - set(attributes["error.category"], "rate_limit") where attributes["http.response.status_code"] == 429
          - set(attributes["error.category"], "unknown") where status.code == 2 and attributes["error.category"] == nil

          # Set actionability flag
          - set(attributes["error.actionable"], true) where attributes["error.category"] == "timeout" or attributes["error.category"] == "connection"
          - set(attributes["error.actionable"], false) where attributes["error.category"] == "validation" or attributes["error.category"] == "not_found"
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
          - set(attributes["operation.fqn"], Concat([resource.attributes["service.name"], ".", name], ""))

          # Determine criticality from service and HTTP route
          - set(attributes["criticality"], "high") where resource.attributes["service.name"] == "checkout-service" and IsMatch(attributes["http.route"], "^/api/(payment|order).*")
          - set(attributes["criticality"], "medium") where resource.attributes["service.name"] == "checkout-service" and attributes["criticality"] == nil
          - set(attributes["criticality"], "low") where resource.attributes["deployment.environment"] == "staging"
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
          # kind == 1: Internal, 2: Server, 3: Client, 4: Producer, 5: Consumer
          - set(attributes["span.kind.label"], "internal") where kind == 1
          - set(attributes["span.kind.label"], "server") where kind == 2
          - set(attributes["span.kind.label"], "client") where kind == 3
          - set(attributes["span.kind.label"], "producer") where kind == 4
          - set(attributes["span.kind.label"], "consumer") where kind == 5

          # Compute a direction label
          - set(attributes["span.direction"], "inbound") where kind == 2 or kind == 5
          - set(attributes["span.direction"], "outbound") where kind == 3 or kind == 4
          - set(attributes["span.direction"], "internal") where kind == 1
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
          - set(attributes["perf.category"], "fast") where duration <= 100000000
          - set(attributes["perf.category"], "normal") where duration > 100000000 and duration <= 1000000000
          - set(attributes["perf.category"], "slow") where duration > 1000000000

          # Error classification
          - set(attributes["error.category"], "server") where attributes["http.response.status_code"] >= 500
          - set(attributes["error.category"], "client") where attributes["http.response.status_code"] >= 400 and attributes["http.response.status_code"] < 500

          # Composite key for grouping
          - set(attributes["group.key"], Concat([resource.attributes["service.name"], attributes["http.method"], attributes["http.route"]], "|")) where attributes["http.method"] != nil

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
