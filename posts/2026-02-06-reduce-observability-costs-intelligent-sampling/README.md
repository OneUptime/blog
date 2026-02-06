# How to Reduce Observability Costs by 80% with OpenTelemetry Intelligent Sampling and Filtering

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cost Reduction, Sampling, Filtering, Observability

Description: Cut observability costs dramatically by combining tail-based sampling, attribute filtering, and data tiering in your OpenTelemetry pipeline.

Observability costs scale with data volume, and most organizations export far more telemetry than they actually use. Health checks, high-frequency cron jobs, internal keepalive requests, and verbose debug spans all flow into expensive storage backends where nobody looks at them.

The fix is not to reduce visibility. It is to be intelligent about which data gets stored at full fidelity and which data gets sampled, summarized, or dropped. OpenTelemetry gives you the tools to do this at the Collector level, before data reaches your backend.

## Where the Money Goes

Before optimizing, understand your cost breakdown. Typically:

- **Traces** account for 60-70% of observability costs (high cardinality, large payloads)
- **Logs** account for 20-30% (high volume, often unstructured)
- **Metrics** account for 5-10% (compact, aggregated)

Trace data is where the biggest savings are. A single HTTP request can generate 10-50 spans across a microservice architecture. Multiply that by millions of requests per hour.

## Strategy 1: Tail-Based Sampling

Head-based sampling (deciding at the start of a trace) is simple but blind - it cannot know if a trace will be interesting. Tail-based sampling waits until the trace is complete, then decides based on the full picture.

This Collector config implements multi-policy tail sampling that keeps important traces and samples routine ones:

```yaml
# cost-optimized-collector.yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Tail sampling requires seeing complete traces
  # decision_wait must be longer than your longest expected trace
  tail_sampling:
    decision_wait: 15s
    num_traces: 100000
    policies:
      # Policy 1: Always keep error traces - these are the most valuable
      - name: keep-errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Policy 2: Always keep slow traces above 2 seconds
      - name: keep-slow
        type: latency
        latency:
          threshold_ms: 2000

      # Policy 3: Always keep traces with specific debug headers
      - name: keep-debug
        type: string_attribute
        string_attribute:
          key: http.request.header.x-debug
          values: ["true"]

      # Policy 4: Drop health check traces entirely
      - name: drop-health-checks
        type: string_attribute
        string_attribute:
          key: http.route
          values: ["/health", "/healthz", "/ready", "/readyz", "/ping"]
          enabled_regex_matching: false
          invert_match: true

      # Policy 5: Sample 5% of remaining normal traffic
      - name: sample-rest
        type: probabilistic
        probabilistic:
          sampling_percentage: 5

  batch:
    timeout: 10s
    send_batch_size: 512

exporters:
  otlphttp:
    endpoint: https://backend:4318

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlphttp]
```

This alone can reduce trace volume by 80-90% while keeping every error, every slow request, and every debug-flagged trace.

## Strategy 2: Attribute Trimming

Spans often carry attributes that are useful during development but expensive in production. Long URL query strings, full SQL queries, and request/response bodies inflate span sizes significantly.

This transform processor strips oversized and low-value attributes from spans:

```yaml
processors:
  transform/trim:
    trace_statements:
      - context: span
        statements:
          # Truncate long URL query strings to 200 characters
          - truncate_all(attributes, 200) where attributes["http.url"] != nil

          # Remove full SQL text - keep only the operation type
          - delete_key(attributes, "db.statement")

          # Remove verbose HTTP headers that inflate span size
          - delete_matching_keys(attributes, "http\\.request\\.header\\..*")
          - delete_matching_keys(attributes, "http\\.response\\.header\\..*")
```

## Strategy 3: Metrics Aggregation

Instead of exporting every metric data point at the highest granularity, aggregate at the Collector before export.

This configuration reduces metric cardinality by dropping high-cardinality labels that are not useful for dashboards:

```yaml
processors:
  # Remove high-cardinality attributes that explode metric series
  transform/metrics:
    metric_statements:
      - context: datapoint
        statements:
          # Remove per-instance-id labels from aggregated metrics
          - delete_key(attributes, "net.sock.peer.addr")
          - delete_key(attributes, "net.sock.peer.port")
          # Remove UUIDs from HTTP route patterns
          - replace_pattern(attributes["http.route"], "/users/[a-f0-9-]+", "/users/{id}")
          - replace_pattern(attributes["http.route"], "/orders/[a-f0-9-]+", "/orders/{id}")

  # Aggregate metrics with a longer interval to reduce volume
  # 60-second aggregation vs the default 10-second
  metricstransform:
    transforms:
      - include: ".*"
        match_type: regexp
        action: update
        aggregation_type: ""
```

## Strategy 4: Log Severity Filtering

Production log pipelines often include DEBUG and INFO level logs that are only useful during active debugging. Filter these at the Collector.

This filter processor drops low-severity logs in production while keeping them for critical services:

```yaml
processors:
  filter/logs:
    logs:
      # Drop DEBUG logs entirely
      log_record:
        - 'severity_number < SEVERITY_NUMBER_INFO'
      # Drop INFO logs from high-volume services
      # Keep WARN and above from everything
      log_record:
        - 'severity_number < SEVERITY_NUMBER_WARN and resource.attributes["service.name"] == "health-checker"'
        - 'severity_number < SEVERITY_NUMBER_WARN and resource.attributes["service.name"] == "load-balancer"'
```

## Measuring the Savings

Track the before and after data volumes using the Collector's internal metrics. The key metrics to watch are:

```yaml
# Add the telemetry config to your collector to track its own performance
service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888
```

Then query these metrics from the Collector's Prometheus endpoint:

- `otelcol_receiver_accepted_spans` - total spans received
- `otelcol_exporter_sent_spans` - total spans exported after sampling
- `otelcol_processor_dropped_spans` - spans dropped by processors

The ratio of exported to received spans gives you your reduction percentage. A well-tuned pipeline typically shows:

- 90-95% reduction in trace volume
- 40-60% reduction in log volume
- 20-30% reduction in metric cardinality

## Validating You Have Not Lost Visibility

Cost reduction without validation is dangerous. After applying each strategy, confirm:

1. **Error traces are complete.** Trigger a known error and verify the full trace appears in your backend.
2. **Slow traces are captured.** Introduce artificial latency in a test service and confirm the trace is kept.
3. **Dashboards still work.** Metrics dashboards should show the same trends - the values may be slightly different due to sampling, but the patterns should match.
4. **Alerts still fire.** Run a test that should trigger an alert and verify it does.

Do not apply all four strategies at once. Roll them out one at a time, validate after each, and measure the cumulative savings. Most organizations find that tail-based sampling alone gets them 70-80% of the way there, with the remaining strategies adding incremental improvements.
