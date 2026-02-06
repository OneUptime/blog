# How to Configure the Filter Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Filter Processor, Data Filtering, Cost Optimization, Sampling

Description: Master the filter processor in OpenTelemetry Collector to drop unwanted telemetry, reduce costs, eliminate noise, and control data volume with precision filtering rules.

The filter processor enables selective dropping of telemetry data in the OpenTelemetry Collector based on configurable criteria. It acts as a gatekeeper in your pipeline, allowing only valuable telemetry to flow to downstream processors and exporters while discarding noise, health checks, debugging spans, and other unwanted data.

Proper filtering is essential for production observability pipelines. It reduces storage costs, improves query performance, decreases network bandwidth consumption, and eliminates alert fatigue by removing telemetry that provides no actionable insights.

## Why Filtering Matters

Unfiltered telemetry pipelines suffer from several problems:

- **Excessive costs**: Storage and ingestion charges for millions of health check spans and debug logs
- **Noise pollution**: Important signals buried in verbose debug output
- **Performance degradation**: Backends slowed by processing irrelevant data
- **Alert fatigue**: Dashboards and alerts triggered by noise rather than real issues
- **Compliance risk**: Sensitive data accidentally exported before sanitization

The filter processor solves these problems by dropping unwanted telemetry early in the pipeline, before it consumes resources or reaches backends.

## How Filter Processor Works

The filter processor evaluates telemetry items against configured rules and either passes them through or drops them:

```mermaid
graph LR
    A[Incoming Telemetry] --> B{Filter Rules}
    B -->|Match: Drop| C[Dropped Items Metric]
    B -->|No Match: Keep| D[Next Processor]
    D --> E[Batch]
    E --> F[Exporter]
```

Filtering happens early in the processor chain, preventing dropped items from consuming memory or CPU in downstream processors.

## Basic Configuration

Here's a minimal filter processor configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  filter:
    traces:
      span:
        # Drop health check spans
        - 'attributes["http.target"] == "/healthz"'
        - 'attributes["http.target"] == "/readyz"'

  batch:
    timeout: 5s
    send_batch_size: 1024

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp
    encoding: json
    headers:
      x-oneuptime-token: "YOUR_TOKEN"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter, batch]
      exporters: [otlphttp]
```

This configuration drops spans for health check endpoints before they reach the batch processor and exporter.

## Core Configuration Structure

The filter processor uses OTTL (OpenTelemetry Transformation Language) for filtering rules:

```yaml
processors:
  filter:
    # Error mode: "ignore" (log and continue) or "propagate" (fail pipeline)
    error_mode: ignore

    traces:
      span:
        - 'condition1'
        - 'condition2'

      spanevent:
        - 'condition3'

    metrics:
      metric:
        - 'condition4'

      datapoint:
        - 'condition5'

    logs:
      log_record:
        - 'condition6'
```

Each condition is an OTTL expression that returns true (drop) or false (keep).

## Filtering Traces

### Dropping Spans by Attribute

Filter out health checks and internal endpoints:

```yaml
processors:
  filter:
    traces:
      span:
        # Drop health check endpoints
        - 'attributes["http.target"] == "/healthz"'
        - 'attributes["http.target"] == "/readyz"'
        - 'attributes["http.target"] == "/livez"'

        # Drop metrics scrape endpoints
        - 'attributes["http.target"] == "/metrics"'

        # Drop Kubernetes probes
        - 'attributes["user_agent"] matches ".*kube-probe.*"'
```

### Dropping Spans by Name

Filter based on span operation names:

```yaml
processors:
  filter:
    traces:
      span:
        # Drop debugging spans
        - 'name == "debug.trace"'

        # Drop internal monitoring spans
        - 'name matches "^internal\\..*"'

        # Drop low-value spans
        - 'name == "noop"'
```

### Dropping Spans by Status

Remove successful spans to focus on errors:

```yaml
processors:
  filter:
    traces:
      span:
        # Only keep error spans (drop OK spans)
        - 'status.code == STATUS_CODE_OK'

        # Alternative: keep errors and warnings only
        # This drops STATUS_CODE_OK, keeping ERROR and UNSET
```

**Note**: Be cautious with this approach. Dropping all successful spans eliminates baseline behavior needed for anomaly detection and performance analysis. Consider sampling instead of filtering for success cases.

### Dropping Spans by Duration

Filter out very short spans that provide little value:

```yaml
processors:
  filter:
    traces:
      span:
        # Drop spans shorter than 1ms
        - 'duration < 1000000'  # nanoseconds

        # Drop very long timeout spans (> 30 seconds)
        - 'duration > 30000000000'
```

### Dropping Spans by Service

Exclude telemetry from specific services:

```yaml
processors:
  filter:
    traces:
      span:
        # Drop spans from test services
        - 'resource.attributes["service.name"] == "test-service"'

        # Drop spans from staging environment
        - 'resource.attributes["deployment.environment"] == "staging"'
```

### Combining Multiple Conditions

Use logical operators for complex filtering:

```yaml
processors:
  filter:
    traces:
      span:
        # Drop successful health checks
        - 'attributes["http.target"] == "/healthz" and status.code == STATUS_CODE_OK'

        # Drop fast successful requests to static content
        - 'attributes["http.target"] matches ".*/static/.*" and status.code == STATUS_CODE_OK and duration < 10000000'

        # Drop internal service-to-service health checks
        - 'resource.attributes["service.name"] == "health-checker" and attributes["http.method"] == "GET"'
```

## Filtering Metrics

### Dropping Metrics by Name

Remove unwanted metric families:

```yaml
processors:
  filter:
    metrics:
      metric:
        # Drop Go runtime metrics
        - 'name matches "^go_.*"'

        # Drop process metrics
        - 'name matches "^process_.*"'

        # Drop specific noisy metrics
        - 'name == "http.server.request.body.size"'
```

### Dropping Metric Data Points

Filter specific data points within a metric:

```yaml
processors:
  filter:
    metrics:
      datapoint:
        # Drop data points with specific attribute values
        - 'attributes["http.status_code"] == "200"'

        # Drop data points below threshold
        - 'value_int < 10'

        # Drop data points from test environments
        - 'resource.attributes["environment"] == "test"'
```

### Dropping High-Cardinality Metrics

Control cardinality explosion:

```yaml
processors:
  filter:
    metrics:
      datapoint:
        # Drop data points with user-specific labels
        - 'attributes["user.id"] != ""'

        # Drop data points with session IDs
        - 'attributes["session.id"] != ""'

        # Drop data points with UUIDs in paths
        - 'attributes["http.route"] matches ".*[a-f0-9]{8}-[a-f0-9]{4}-.*"'
```

## Filtering Logs

### Dropping Logs by Level

Remove verbose log levels in production:

```yaml
processors:
  filter:
    logs:
      log_record:
        # Drop debug logs
        - 'severity_text == "DEBUG"'

        # Drop trace logs
        - 'severity_text == "TRACE"'

        # Alternative: keep only warnings and errors
        - 'severity_number < SEVERITY_NUMBER_WARN'
```

### Dropping Logs by Body Content

Filter based on log message content:

```yaml
processors:
  filter:
    logs:
      log_record:
        # Drop health check logs
        - 'body matches ".*health check.*"'

        # Drop verbose library logs
        - 'body matches ".*DEBUG: .*"'

        # Drop specific noisy patterns
        - 'body matches ".*Connection pool.*"'
```

### Dropping Logs by Attribute

Remove logs with specific attributes:

```yaml
processors:
  filter:
    logs:
      log_record:
        # Drop logs from test users
        - 'attributes["user.id"] == "test-user"'

        # Drop internal monitoring logs
        - 'attributes["log.source"] == "internal-monitor"'

        # Drop logs from specific services
        - 'resource.attributes["service.name"] == "chatty-service"'
```

## Advanced Filtering Patterns

### Inverse Filtering (Keep Only)

The filter processor drops matching items. To keep only specific items, invert your logic:

```yaml
processors:
  filter:
    traces:
      span:
        # Keep ONLY errors: drop everything that's NOT an error
        - 'status.code != STATUS_CODE_ERROR'

        # Keep ONLY slow spans: drop fast spans
        - 'duration < 500000000'  # Drop spans < 500ms

        # Keep ONLY specific services: drop others
        - 'resource.attributes["service.name"] != "critical-service"'
```

### Environment-Specific Filtering

Different filtering rules for different environments:

```yaml
processors:
  # Production: aggressive filtering
  filter/prod:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'
        - 'status.code == STATUS_CODE_OK and duration < 100000000'

  # Staging: keep more data
  filter/staging:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'

  # Development: minimal filtering
  filter/dev:
    traces:
      span:
        - 'attributes["http.target"] == "/internal/debug"'

service:
  pipelines:
    traces/prod:
      receivers: [otlp]
      processors: [filter/prod, batch]
      exporters: [otlphttp]

    traces/staging:
      receivers: [otlp]
      processors: [filter/staging, batch]
      exporters: [otlphttp]
```

Select the appropriate pipeline at deployment time based on environment.

### Sampling vs. Filtering

Sometimes you want to reduce volume without complete elimination. Combine filtering with probabilistic sampling:

```yaml
processors:
  # First, drop definite noise
  filter:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'

  # Then, sample remaining traces
  probabilistic_sampler:
    sampling_percentage: 10  # Keep 10% of remaining traces

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      processors: [filter, probabilistic_sampler, batch]
```

This approach drops noise completely while sampling useful telemetry to manage volume.

### Multi-Stage Filtering

Complex filtering scenarios often need multiple stages:

```yaml
processors:
  # Stage 1: Drop absolute noise
  filter/noise:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'
        - 'attributes["http.target"] == "/metrics"'

  # Stage 2: Drop fast successful requests
  filter/successful:
    traces:
      span:
        - 'status.code == STATUS_CODE_OK and duration < 50000000'

  # Stage 3: Drop internal testing traffic
  filter/testing:
    traces:
      span:
        - 'attributes["user_agent"] matches ".*test.*"'

  batch:
    timeout: 5s

service:
  pipelines:
    traces:
      processors: [filter/noise, filter/successful, filter/testing, batch]
```

This staged approach makes the pipeline easier to understand and modify.

## Common Filtering Scenarios

### Scenario 1: SaaS Cost Reduction

Drop high-volume, low-value telemetry to reduce SaaS observability costs:

```yaml
processors:
  filter/cost_reduction:
    traces:
      span:
        # Drop health checks (often 30-50% of volume)
        - 'attributes["http.target"] matches ".*health.*"'

        # Drop successful sub-10ms spans (fast, unlikely to be issues)
        - 'status.code == STATUS_CODE_OK and duration < 10000000'

        # Drop internal monitoring spans
        - 'resource.attributes["service.name"] matches ".*monitor.*"'

        # Drop static asset requests
        - 'attributes["http.target"] matches ".*/static/.*"'

    metrics:
      metric:
        # Drop runtime metrics (often not actionable)
        - 'name matches "^(go_|process_).*"'

    logs:
      log_record:
        # Drop debug logs
        - 'severity_number < SEVERITY_NUMBER_INFO'
```

This configuration can reduce telemetry volume by 50-70% while retaining actionable signals.

### Scenario 2: PII Compliance

Ensure no PII-containing telemetry reaches backends:

```yaml
processors:
  # Drop telemetry containing PII
  filter/pii:
    traces:
      span:
        # Drop spans with email attributes
        - 'attributes["user.email"] != ""'

        # Drop spans with phone numbers
        - 'attributes["user.phone"] != ""'

        # Drop spans with credit card patterns
        - 'attributes["payment.card"] matches ".*[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{4}.*"'

    logs:
      log_record:
        # Drop logs containing email patterns
        - 'body matches ".*@.*\\.com.*"'

        # Drop logs with social security numbers
        - 'body matches ".*[0-9]{3}-[0-9]{2}-[0-9]{4}.*"'
```

**Important**: Filtering for PII compliance should be combined with the attributes processor to mask PII in remaining telemetry. Filtering alone isn't sufficient.

### Scenario 3: High-Cardinality Control

Prevent cardinality explosion in backends:

```yaml
processors:
  filter/cardinality:
    traces:
      span:
        # Drop spans with user IDs (unbounded cardinality)
        - 'attributes["user.id"] != ""'

        # Drop spans with session IDs
        - 'attributes["session.id"] != ""'

        # Drop spans with request IDs
        - 'attributes["request.id"] != ""'

    metrics:
      datapoint:
        # Drop metric data points with unbounded labels
        - 'attributes["user.id"] != ""'
        - 'attributes["trace.id"] != ""'
```

This prevents high-cardinality attributes from exploding metric dimensions, which can crash backends or drive up costs dramatically.

### Scenario 4: Multi-Tenant Filtering

Different filtering rules per tenant:

```yaml
processors:
  # Free tier: aggressive filtering
  filter/free_tier:
    traces:
      span:
        - 'resource.attributes["tenant.tier"] == "free" and status.code == STATUS_CODE_OK'
        - 'resource.attributes["tenant.tier"] == "free" and duration < 100000000'

  # Paid tier: moderate filtering
  filter/paid_tier:
    traces:
      span:
        - 'resource.attributes["tenant.tier"] == "paid" and attributes["http.target"] == "/healthz"'

  # Enterprise tier: minimal filtering
  filter/enterprise_tier:
    traces:
      span:
        - 'resource.attributes["tenant.tier"] == "enterprise" and attributes["http.target"] == "/healthz"'
```

Note: This requires routing to different pipelines based on tenant tier, which is complex. Often better handled at the receiver or routing level.

## Performance Considerations

Filtering improves overall pipeline performance by reducing downstream processing, but the filter processor itself has costs:

### Efficient Filtering

```yaml
processors:
  filter:
    traces:
      span:
        # Simple equality checks are fast
        - 'attributes["http.target"] == "/healthz"'

        # Direct attribute access is fast
        - 'status.code == STATUS_CODE_OK'
```

### Less Efficient Filtering

```yaml
processors:
  filter:
    traces:
      span:
        # Complex regex patterns are slower
        - 'body matches ".*very(complex|regex|with|many|alternatives).*"'

        # Multiple nested conditions can be slow
        - 'attributes["a"] == "1" and (attributes["b"] == "2" or (attributes["c"] == "3" and attributes["d"] == "4"))'
```

**Best practices**:
1. Place filter processor early in pipeline (before expensive processors)
2. Use simple conditions when possible (equality over regex)
3. Combine related conditions into a single filter processor
4. Test performance impact with realistic load

## Monitoring Filter Processor

Track filtering effectiveness with collector metrics:

```bash
# Query collector metrics
curl http://localhost:8888/metrics | grep processor

# Key metrics:
# - otelcol_processor_dropped_spans: Number of spans dropped
# - otelcol_processor_dropped_metric_points: Number of metric points dropped
# - otelcol_processor_dropped_log_records: Number of logs dropped
```

### Healthy Filtering Patterns

```
otelcol_processor_dropped_spans{processor="filter"} 150000
otelcol_processor_accepted_spans{processor="filter"} 50000
```

Drop rate: 75%. This is typical for aggressive health check filtering.

### Alert on Unexpected Changes

```yaml
# Alert if drop rate changes significantly
- alert: FilterDropRateChanged
  expr: |
    rate(otelcol_processor_dropped_spans{processor="filter"}[5m])
    /
    rate(otelcol_processor_accepted_spans{processor="filter"}[5m])
    > 0.9  # More than 90% dropped
  annotations:
    summary: Filter processor drop rate unusually high
```

## Troubleshooting Common Issues

### Issue 1: Filter Not Dropping Expected Telemetry

**Symptom**: Telemetry you expected to be dropped still appears in backends.

**Diagnosis**:

```yaml
exporters:
  logging:
    verbosity: detailed

service:
  pipelines:
    traces:
      processors: [filter, batch]
      exporters: [logging, otlphttp]
```

Check logging output to see if filtered items are present.

**Common causes**:

1. **Incorrect OTTL expression**:

```yaml
# WRONG: Using wrong attribute key
- 'attributes["http.path"] == "/healthz"'

# CORRECT: Using correct attribute key
- 'attributes["http.target"] == "/healthz"'
```

2. **Wrong data type comparison**:

```yaml
# WRONG: Comparing string to int
- 'attributes["http.status_code"] == 200'

# CORRECT: String comparison
- 'attributes["http.status_code"] == "200"'
```

3. **Resource vs. span attributes confusion**:

```yaml
# WRONG: Looking for service.name in span attributes
- 'attributes["service.name"] == "my-service"'

# CORRECT: Looking in resource attributes
- 'resource.attributes["service.name"] == "my-service"'
```

### Issue 2: Filter Dropping Too Much

**Symptom**: Important telemetry being dropped unexpectedly.

**Solution**: Add negative conditions to exclude important telemetry:

```yaml
processors:
  filter:
    traces:
      span:
        # Drop successful spans EXCEPT errors
        - 'status.code == STATUS_CODE_OK and attributes["http.target"] != "/critical-endpoint"'
```

Or use multiple filter processors with clear separation:

```yaml
processors:
  filter/aggressive:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'

  filter/conditional:
    traces:
      span:
        # Only drop successful fast requests (keep errors)
        - 'status.code == STATUS_CODE_OK and duration < 100000000'
```

### Issue 3: Performance Degradation

**Symptom**: Collector CPU usage high, latency increased after adding filter.

**Solution**: Simplify filter conditions:

```yaml
# BEFORE: Complex regex
processors:
  filter:
    traces:
      span:
        - 'attributes["http.target"] matches ".*/(health|ready|live|metrics|debug).*"'

# AFTER: Multiple simple equality checks (faster)
processors:
  filter:
    traces:
      span:
        - 'attributes["http.target"] == "/health"'
        - 'attributes["http.target"] == "/ready"'
        - 'attributes["http.target"] == "/live"'
        - 'attributes["http.target"] == "/metrics"'
        - 'attributes["http.target"] == "/debug"'
```

## Testing Filter Configuration

Validate filtering rules with a test pipeline:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  filter:
    traces:
      span:
        - 'attributes["http.target"] == "/healthz"'

exporters:
  logging:
    verbosity: detailed

  otlphttp:
    endpoint: https://oneuptime.com/otlp

service:
  telemetry:
    metrics:
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter]
      exporters: [logging, otlphttp]
```

Send test telemetry and verify filtering:

```bash
# Start collector
otelcol --config test-config.yaml

# Send test spans with /healthz endpoint
# Send test spans with other endpoints

# Check logs for filtered vs. passed spans
# Query metrics for drop counts
curl http://localhost:8888/metrics | grep dropped_spans
```

## Production Checklist

Before deploying filter processor to production:

- [ ] Filter rules tested with representative telemetry samples
- [ ] Logging exporter used to validate filtering during testing
- [ ] Filter processor placed early in pipeline (before expensive processors)
- [ ] Drop rate monitored with collector metrics
- [ ] Alerts configured for unexpected drop rate changes
- [ ] Filter rules documented with rationale
- [ ] OTTL expressions validated for syntax and logic
- [ ] Resource vs. span attribute distinction understood
- [ ] Performance tested under realistic load
- [ ] Backup plan for recovering accidentally dropped telemetry

## Key Takeaways

The filter processor is essential for controlling telemetry volume, reducing costs, and eliminating noise in production OpenTelemetry pipelines. It enables precise, rule-based dropping of unwanted telemetry before it consumes resources or reaches backends.

Use it to drop health checks, debug telemetry, successful fast requests, and high-cardinality data. Place it early in your processor chain to maximize benefits, and monitor drop rates to ensure filters work as expected.

Combine filtering with sampling, attribute processing, and resource detection for comprehensive telemetry pipeline control.

**Related Reading:**

- [How to Configure the Attributes Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/attributes-processor-opentelemetry-collector/view)
- [How to Configure the Transform Processor in the OpenTelemetry Collector](https://oneuptime.com/blog/post/transform-processor-opentelemetry-collector/view)
- [How to reduce noise in OpenTelemetry?](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
