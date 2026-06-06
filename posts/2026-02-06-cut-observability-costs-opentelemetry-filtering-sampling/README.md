# How to Cut Observability Costs by 40% with OpenTelemetry Filtering and Sampling

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Cost Optimization, Filtering, Sampling, Performance

Description: Reduce observability costs by 40% or more using OpenTelemetry's filtering and sampling capabilities. Learn practical configurations for traces, metrics, and logs with real-world examples.

Observability costs can quickly spiral out of control as your system scales. A typical production deployment generates millions of spans, metrics, and log entries daily, most of which provide little value. The key to cost-effective observability is intelligently filtering and sampling your telemetry data before it reaches expensive storage backends.

OpenTelemetry provides powerful filtering and sampling mechanisms that can reduce data volume by 40-70% while maintaining observability for critical issues. This guide shows you exactly how to implement these cost-saving strategies.

## Understanding the Cost Problem

Most observability costs follow this breakdown:

```mermaid
pie title Observability Cost Distribution
    "Trace Storage" : 45
    "Metric Storage" : 30
    "Log Storage" : 20
    "Processing/Ingestion" : 5
```

The problem is not the volume itself, but the lack of differentiation. Not all telemetry data is equally valuable:

- Health check requests provide little value but generate 30-50% of traces
- Debug-level logs rarely get queried but consume significant storage
- Metrics from internal services are less critical than customer-facing services
- Successful requests are less interesting than errors

Filtering and sampling allow you to keep the signal and drop the noise.

## Strategy 1: Trace Filtering at the Collector

The OpenTelemetry Collector's filter processor drops entire spans based on attributes, reducing ingestion volume immediately.

```yaml
# Collector configuration for trace filtering

receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  # Filter processor to drop low-value traces
  filter/drop_health_checks:
    error_mode: ignore
    trace_conditions:
      # Drop health check endpoints
      - 'span.attributes["http.route"] == "/health"'
      - 'span.attributes["http.route"] == "/healthz"'
      - 'span.attributes["http.route"] == "/ready"'
      - 'span.attributes["http.route"] == "/alive"'
      - 'span.attributes["http.route"] == "/ping"'

  # Filter internal monitoring traffic
  filter/drop_internal:
    error_mode: ignore
    trace_conditions:
      - 'resource.attributes["service.name"] == "prometheus"'
      - 'resource.attributes["service.name"] == "grafana"'
      - 'IsMatch(span.attributes["user_agent.original"], ".*prometheus.*")'
      - 'IsMatch(span.attributes["user_agent.original"], ".*pingdom.*")'

  # Filter by status code (keep errors, sample success)
  filter/errors_only:
    error_mode: ignore
    trace_conditions:
      # Drop successful requests (2xx, 3xx status codes)
      # These will be sampled separately at lower rate
      - 'span.attributes["http.response.status_code"] >= 200 and span.attributes["http.response.status_code"] < 400'

  batch:
    timeout: 10s
    send_batch_size: 1024

exporters:
  otlp:
    endpoint: backend:4317

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/drop_health_checks, filter/drop_internal, batch]
      exporters: [otlp]
```

This configuration typically reduces trace volume by 30-40% by dropping low-value traffic.

## Strategy 2: Multi-Tier Sampling

Instead of applying a single sampling rate, use multiple tiers based on trace importance. This keeps all errors while aggressively sampling routine traffic.

```yaml
# Advanced multi-tier sampling configuration
processors:
  # Tail sampling makes intelligent decisions based on complete traces
  tail_sampling:
    # How long to wait for a complete trace before making decision
    decision_wait: 10s

    # Number of traces to keep in memory while waiting
    num_traces: 100000

    # Expected number of new traces per second
    expected_new_traces_per_sec: 1000

    # Sampling policies in order of evaluation
    policies:
      # Policy 1: Always keep errors (100% sampling)
      - name: errors-always
        type: status_code
        status_code:
          status_codes:
            - ERROR

      # Policy 2: Always keep slow requests (100% sampling)
      - name: slow-traces
        type: latency
        latency:
          threshold_ms: 1000  # Keep all requests over 1 second

      # Policy 3: Always keep specific services (100% sampling)
      - name: critical-services
        type: string_attribute
        string_attribute:
          key: service.name
          values:
            - payment-service
            - authentication-service
            - checkout-service

      # Policy 4: Sample by trace ID for consistent sampling
      # Keep 10% of remaining traces
      - name: probabilistic-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

      # Policy 5: Rate limiting - maximum traces per second
      - name: rate-limit
        type: rate_limiting
        rate_limiting:
          spans_per_second: 500

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]
```

This multi-tier approach keeps configured critical categories while dramatically reducing volume for routine operations.

## Strategy 3: Head Sampling at the SDK

Head sampling makes decisions early, before spans are recorded and exported. This is more efficient but less sophisticated than tail sampling.

```python
# Python SDK configuration with head sampling
from opentelemetry import trace
from opentelemetry.sdk.trace import TracerProvider
from opentelemetry.sdk.trace.sampling import (
    ALWAYS_OFF,
    ALWAYS_ON,
    ParentBased,
    Sampler,
    TraceIdRatioBased,
)
from opentelemetry.sdk.trace.export import BatchSpanProcessor
from opentelemetry.exporter.otlp.proto.grpc.trace_exporter import OTLPSpanExporter

# Custom sampler that combines multiple strategies
class CustomSampler(Sampler):
    def __init__(self, default_sampling_rate=0.1):
        self.default_sampling_rate = default_sampling_rate
        self.default_sampler = TraceIdRatioBased(default_sampling_rate)

    def should_sample(self, parent_context, trace_id, name, kind, attributes, links, trace_state):
        # Always sample errors that are known at span creation time
        if attributes and attributes.get("error"):
            return ALWAYS_ON.should_sample(
                parent_context, trace_id, name, kind, attributes, links, trace_state
            )

        # Always sample critical endpoints
        route = attributes.get("http.route", "") if attributes else ""
        if route in ["/api/payment", "/api/checkout", "/api/auth"]:
            return ALWAYS_ON.should_sample(
                parent_context, trace_id, name, kind, attributes, links, trace_state
            )

        # Drop health checks entirely
        if route in ["/health", "/healthz", "/ready", "/ping"]:
            return ALWAYS_OFF.should_sample(
                parent_context, trace_id, name, kind, attributes, links, trace_state
            )

        # Use default sampling for everything else
        return self.default_sampler.should_sample(
            parent_context, trace_id, name, kind, attributes, links, trace_state
        )

    def get_description(self):
        return f"CustomSampler{{{self.default_sampling_rate}}}"

# Initialize tracer provider with custom sampler
provider = TracerProvider(
    sampler=ParentBased(root=CustomSampler(default_sampling_rate=0.1))
)

# Add span processor
provider.add_span_processor(
    BatchSpanProcessor(OTLPSpanExporter())
)

trace.set_tracer_provider(provider)
```

This SDK-level sampling prevents unnecessary span recording and export work, reducing CPU and memory overhead.

## Strategy 4: Metric Filtering

Metrics can be filtered based on name patterns, attributes, or values:

```yaml
# Collector configuration for metric filtering
processors:
  # Filter metrics by name
  filter/drop_metrics:
    error_mode: ignore
    metric_conditions:
      # Drop metrics matching these patterns
      - 'IsMatch(metric.name, "runtime\\..*")'
      - 'IsMatch(metric.name, "jvm\\.gc\\..*\\.time")'
      - 'IsMatch(metric.name, "process\\..*")'

  # Alternative: include only specific metrics
  filter/keep_key_metrics:
    error_mode: ignore
    metric_conditions:
      - 'metric.name != "http.server.request.duration" and metric.name != "db.client.operation.duration" and metric.name != "redis.client.operation.duration"'

  # Filter metrics by attribute values
  filter/drop_by_attributes:
    error_mode: ignore
    metric_conditions:
      # Drop metrics from test environments
      - 'resource.attributes["deployment.environment"] == "test"'
      # Drop metrics from internal services
      - 'IsMatch(resource.attributes["service.name"], ".*-internal")'

  # Transform processor to remove high-cardinality attributes
  transform/reduce_cardinality:
    metric_statements:
      - context: datapoint
        statements:
          # Remove user-specific identifiers
          - delete_key(attributes, "user.id")
          - delete_key(attributes, "session.id")
          - delete_key(attributes, "request.id")

service:
  pipelines:
    metrics:
      receivers: [otlp]
      processors: [filter/drop_metrics, filter/drop_by_attributes, transform/reduce_cardinality, batch]
      exporters: [otlp]
```

## Strategy 5: Log Filtering

Logs often consume the most storage and provide the least value. Filter aggressively:

```yaml
# Collector configuration for log filtering
processors:
  # Filter logs by severity
  filter/drop_debug_logs:
    error_mode: ignore
    log_conditions:
      # Only keep warning and above in production
      - 'log.severity_number < SEVERITY_NUMBER_WARN'

  # Filter logs by content
  filter/drop_noisy_logs:
    error_mode: ignore
    log_conditions:
      # Drop health check logs
      - 'IsMatch(log.body, ".*health.*check.*")'
      # Drop successful authentication logs
      - 'IsMatch(log.body, ".*auth.*success.*")'
      # Drop routine database connection logs
      - 'IsMatch(log.body, ".*connection.*pool.*")'

  # Filter logs by source
  filter/drop_by_source:
    error_mode: ignore
    log_conditions:
      # Drop logs from internal monitoring
      - 'resource.attributes["service.name"] == "prometheus"'
      # Drop logs from specific components
      - 'log.attributes["component"] == "health_checker"'

  # Sampling for high-volume logs
  probabilistic_sampler:
    # Keep only 10% of remaining logs
    sampling_percentage: 10
    # Use the trace ID when present to keep sampling decisions consistent
    attribute_source: traceID
    hash_seed: 22

service:
  pipelines:
    logs:
      receivers: [otlp]
      processors: [filter/drop_debug_logs, filter/drop_noisy_logs, filter/drop_by_source, probabilistic_sampler, batch]
      exporters: [otlp]
```

## Strategy 6: Combined Multi-Pipeline Approach

The most effective approach uses multiple pipelines with different filtering rules:

```yaml
# Advanced multi-pipeline configuration
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Batch processor for all pipelines
  batch:
    timeout: 10s
    send_batch_size: 1024

  # Processors for high-priority data (no filtering)
  tail_sampling/critical:
    decision_wait: 10s
    num_traces: 50000
    policies:
      - name: always-keep-critical
        type: always_sample
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: critical-services
        type: string_attribute
        string_attribute:
          key: service.name
          values: [payment-service, auth-service]

  # Processors for normal priority data (moderate filtering)
  tail_sampling/normal:
    decision_wait: 5s
    num_traces: 50000
    policies:
      - name: sample-10-percent
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  # Processors for low priority data (aggressive filtering)
  tail_sampling/low:
    decision_wait: 5s
    num_traces: 50000
    policies:
      - name: sample-1-percent
        type: probabilistic
        probabilistic:
          sampling_percentage: 1

connectors:
  # Router to split traffic by resource attribute
  routing:
    default_pipelines: [traces/normal]
    table:
      - context: resource
        condition: 'attributes["priority"] == "critical"'
        pipelines: [traces/critical]
      - context: resource
        condition: 'attributes["priority"] == "low"'
        pipelines: [traces/low]

exporters:
  otlp/critical:
    endpoint: backend:4317
  otlp/normal:
    endpoint: backend:4317
  otlp/low:
    endpoint: backend:4317

service:
  pipelines:
    traces/in:
      receivers: [otlp]
      exporters: [routing]

    # Critical data pipeline (no sampling)
    traces/critical:
      receivers: [routing]
      processors: [tail_sampling/critical, batch]
      exporters: [otlp/critical]

    # Normal data pipeline (10% sampling)
    traces/normal:
      receivers: [routing]
      processors: [tail_sampling/normal, batch]
      exporters: [otlp/normal]

    # Low priority pipeline (1% sampling)
    traces/low:
      receivers: [routing]
      processors: [tail_sampling/low, batch]
      exporters: [otlp/low]
```

## Real-World Case Study: E-Commerce Platform

An e-commerce company implemented filtering and sampling to reduce costs by 43%:

**Before Optimization**:
- 100M spans/day
- 500M metric data points/day
- 2TB logs/day
- $25,000/month observability cost

**After Optimization**:
- 35M spans/day (65% reduction)
- 200M metric data points/day (60% reduction)
- 800GB logs/day (60% reduction)
- $14,250/month observability cost (43% savings)

Their configuration:

```yaml
# Production configuration
processors:
  # Drop health checks (30% of traffic)
  filter/health:
    error_mode: ignore
    trace_conditions:
      - 'IsMatch(span.attributes["http.route"], "/(health|ready|alive)")'

  # Tail sampling with multiple tiers
  tail_sampling:
    decision_wait: 10s
    num_traces: 100000
    expected_new_traces_per_sec: 2000
    policies:
      # Tier 1: Always keep errors and slow requests (5% of traffic)
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000

      # Tier 2: Keep 50% of checkout flow (critical business path)
      - name: checkout
        type: and
        and:
          and_sub_policy:
            - type: string_attribute
              string_attribute:
                key: service.name
                values: [checkout-service, payment-service]
            - type: probabilistic
              probabilistic:
                sampling_percentage: 50

      # Tier 3: Keep 5% of remaining traffic
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5

  # Metric filtering
  filter/metrics:
    error_mode: ignore
    metric_conditions:
      - 'resource.attributes["deployment.environment"] == "staging"'
      - 'IsMatch(datapoint.attributes["http.route"], "/(health|ready)")'

  # Log filtering
  filter/logs:
    error_mode: ignore
    log_conditions:
      - 'log.severity_number < SEVERITY_NUMBER_INFO'
      - 'IsMatch(log.body, ".*health.*check.*")'

  batch:
    timeout: 10s
    send_batch_size: 2048

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [filter/health, tail_sampling, batch]
      exporters: [otlp]

    metrics:
      receivers: [otlp]
      processors: [filter/metrics, batch]
      exporters: [otlp]

    logs:
      receivers: [otlp]
      processors: [filter/logs, batch]
      exporters: [otlp]
```

## Monitoring Your Savings

Track the effectiveness of your filtering and sampling:

```yaml
# Calculate reduction percentage
# reduction = (receiver accepted - exporter sent) / receiver accepted * 100

# Monitor these key metrics
# - otelcol_receiver_accepted_spans
# - otelcol_receiver_accepted_metric_points
# - otelcol_receiver_accepted_log_records
# - otelcol_processor_incoming_items
# - otelcol_processor_outgoing_items
# - otelcol_exporter_sent_spans
# - otelcol_exporter_sent_metric_points
# - otelcol_exporter_sent_log_records
```

## Best Practices

1. **Start with head sampling** - Configure SDK sampling before implementing collector filtering
2. **Always keep errors** - Configure rules to retain error traces/logs, and route error logs around probabilistic sampling if necessary
3. **Test in staging first** - Validate you're not losing critical data
4. **Monitor sampling rates** - Track what percentage of data is being kept
5. **Document your filters** - Explain why each filter exists
6. **Review quarterly** - Re-evaluate filters as your system evolves
7. **Use tail sampling for critical systems** - It's more accurate but more resource-intensive

## Common Pitfalls to Avoid

1. **Over-aggressive sampling** - Don't drop below 1% for normal traffic
2. **Forgetting parent-based sampling** - Maintain trace consistency
3. **Not handling distributed traces** - Use consistent trace ID hashing
4. **Filtering too early** - Use tail sampling when you need to see complete traces
5. **Ignoring resource overhead** - Tail sampling uses significant memory

## Related Resources

For more cost optimization strategies:
- https://oneuptime.com/blog/post/2026-02-06-handle-high-cardinality-metrics-opentelemetry/view
- https://oneuptime.com/blog/post/2026-02-06-delta-temporality-manage-cardinality-explosions/view
- https://oneuptime.com/blog/post/2026-02-06-probabilistic-sampling-opentelemetry-cost-control/view
- https://oneuptime.com/blog/post/2026-02-06-reduce-telemetry-data-volume-span-suppression/view

Filtering and sampling are essential tools for cost-effective observability. By implementing these strategies, you can dramatically reduce your observability costs while maintaining visibility into critical issues. The key is to be intentional about what data you collect and intelligent about how you sample it.
