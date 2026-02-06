# How to Configure the Group by Trace Processor in the OpenTelemetry Collector

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Processors, Traces, Grouping, Distributed Tracing, Tail Sampling

Description: Learn how to configure the group-by-trace processor in OpenTelemetry Collector to group spans by trace ID, enable trace-aware processing, and prepare traces for tail sampling, filtering, and complete trace analysis across distributed systems.

---

Distributed tracing generates spans across multiple services, and these spans arrive at the OpenTelemetry Collector out of order and from different sources. A single trace - representing one user request through your system - might generate dozens of spans that arrive milliseconds or even seconds apart.

The group-by-trace processor (groupbytrace) solves a critical problem: it collects all spans belonging to the same trace and groups them together before passing them to downstream processors. This grouping enables trace-aware operations like tail sampling (deciding to keep or drop an entire trace based on its complete content), trace-level filtering, and complete trace analysis.

## Understanding Trace Fragmentation

In a distributed system, a single user request generates multiple spans across services. These spans flow through your observability pipeline independently.

```mermaid
sequenceDiagram
    participant API as API Service
    participant Auth as Auth Service
    participant DB as Database Service
    participant Collector as OTel Collector

    Note over API,DB: User request starts (Trace ID: abc123)

    API->>Collector: Span 1 (API entry)
    Auth->>Collector: Span 3 (Auth check)
    API->>Collector: Span 2 (API → Auth call)
    DB->>Collector: Span 5 (DB query)
    Auth->>Collector: Span 4 (Auth → DB call)
    API->>Collector: Span 6 (API exit)

    Note over Collector: Spans arrive out of order!
```

Without grouping, downstream processors see individual spans in arrival order: Span 1, Span 3, Span 2, Span 5, Span 4, Span 6. They have no context about which spans belong together or whether all spans for a trace have arrived.

The group-by-trace processor buffers spans and groups them by trace ID, enabling processors downstream to see complete traces: Trace abc123 with all 6 spans together.

## Why You Need This Processor

The group-by-trace processor enables several critical capabilities:

**Tail Sampling**: Make sampling decisions based on the complete trace. Keep all traces with errors, slow traces, or traces matching specific patterns, while dropping normal successful traces. This requires seeing the entire trace before deciding.

**Trace-Level Filtering**: Drop entire traces that match certain patterns (like health checks or internal monitoring) instead of dropping individual spans and leaving partial traces.

**Trace Analysis**: Calculate trace-level metrics like total duration, span count, service depth, or error propagation. This requires having all spans together.

**Complete Trace Export**: Ensure backends receive complete traces instead of fragments. Some analysis tools require complete traces to build accurate service maps and dependency graphs.

**Memory Optimization**: By grouping spans before export, you can compress and batch complete traces more efficiently than individual spans.

## Basic Configuration

The processor requires minimal configuration to start. At minimum, you specify how long to wait for all spans of a trace to arrive.

Here is a basic configuration:

```yaml
# RECEIVERS: Accept traces via OTLP
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

# PROCESSORS: Group spans by trace ID
processors:
  # Group spans belonging to the same trace
  groupbytrace:
    # Maximum time to wait for all spans of a trace
    # After this duration, release the trace even if incomplete
    wait_duration: 10s

  # Batch for efficiency
  batch:
    send_batch_max_size: 1024
    timeout: 10s

# EXPORTERS: Send to backend
exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

# SERVICE: Define the traces pipeline
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [groupbytrace, batch]
      exporters: [otlphttp]
```

The `wait_duration` parameter controls how long the processor waits for spans. Set it based on your system's trace latency - how long it takes for the slowest span in a trace to arrive. For most systems, 10 seconds is sufficient. For complex distributed systems with high latency, you might need 30-60 seconds.

## Enabling Tail Sampling with Trace Grouping

The most common use case for groupbytrace is enabling tail sampling. Tail sampling makes sampling decisions after seeing the complete trace, allowing you to keep all error traces and slow traces while sampling normal traces.

Here is a configuration combining trace grouping with tail sampling:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # STEP 1: Group spans by trace ID
  groupbytrace:
    wait_duration: 10s
    num_traces: 100000    # Maximum concurrent traces to track

  # STEP 2: Make tail sampling decisions on complete traces
  tail_sampling:
    # Wait for trace grouping before deciding
    decision_wait: 10s
    num_traces: 100000

    policies:
      # Policy 1: Always keep error traces
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Policy 2: Keep slow traces (>1 second)
      - name: slow_traces
        type: latency
        latency:
          threshold_ms: 1000

      # Policy 3: Sample 10% of normal traces
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - groupbytrace      # First group spans into complete traces
        - tail_sampling     # Then make sampling decisions
        - batch
      exporters: [otlphttp]
```

This configuration ensures the tail sampling processor sees complete traces. It can then make intelligent decisions: keep all error traces, keep all slow traces, but only sample 10% of normal fast traces. This dramatically reduces telemetry volume while preserving all problematic traces for debugging.

## Memory Management and Trace Limits

The groupbytrace processor maintains in-memory state for every trace it's tracking. In high-throughput systems, this can consume significant memory.

Here is a production configuration with memory protection:

```yaml
processors:
  # Protect collector from memory exhaustion
  memory_limiter:
    limit_mib: 2048          # Hard limit: 2GB
    spike_limit_mib: 512     # Allow temporary spikes
    check_interval: 1s

  # Group traces with strict limits
  groupbytrace:
    wait_duration: 10s

    # Maximum number of concurrent traces to track
    # Prevents memory exhaustion from trace ID explosion
    num_traces: 50000

    # Maximum number of spans to buffer per trace
    # Protects against pathological traces with thousands of spans
    num_spans: 1000

    # Discard traces when limits are reached (vs blocking)
    discard_orphaned_traces: true

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter     # First line of defense
        - groupbytrace       # Then group with limits
        - batch
      exporters: [otlphttp]
```

The `num_traces` parameter limits how many concurrent traces the processor tracks. If this limit is exceeded, the processor starts discarding the oldest traces (with `discard_orphaned_traces: true`) or blocks until space is available (with `discard_orphaned_traces: false`).

The `num_spans` parameter protects against individual traces with pathological span counts. Some instrumentation bugs or malicious activity can create traces with thousands or millions of spans. This limit prevents a single trace from exhausting memory.

## Handling Incomplete Traces

Not all traces will have all their spans arrive within the wait duration. Network delays, service failures, or SDK bugs can cause spans to be lost or delayed beyond the wait window.

The processor handles this with configurable behavior:

```yaml
processors:
  groupbytrace:
    wait_duration: 10s
    num_traces: 50000

    # What to do with incomplete traces after wait_duration expires
    discard_orphaned_traces: false   # false = still send them (default)
                                     # true = discard incomplete traces

    # Store trace IDs to detect late-arriving spans
    store_trace_ids: true

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [groupbytrace, batch]
      exporters: [otlphttp]
```

With `discard_orphaned_traces: false` (the default), the processor sends incomplete traces after the wait duration expires. This ensures you don't lose trace data, even if some spans are missing.

With `discard_orphaned_traces: true`, incomplete traces are dropped. Use this when you prefer complete traces only and can tolerate data loss.

The `store_trace_ids` parameter (when true) keeps a record of trace IDs that have been processed. When a late-arriving span shows up for an already-released trace, the processor can detect it and handle it appropriately (by default, it sends the span as a single-span trace).

## Multi-Tenant Trace Grouping

In multi-tenant environments, you might want to group traces per tenant to ensure fair resource allocation and prevent one tenant from exhausting the processor's memory.

Here is a configuration for multi-tenant trace grouping:

```yaml
processors:
  # First, ensure tenant ID is available as an attribute
  resource/ensure_tenant:
    attributes:
      - key: tenant.id
        value: "default"
        action: insert    # Add default if missing

  # Group traces with per-tenant limits (requires custom configuration)
  groupbytrace:
    wait_duration: 10s
    num_traces: 50000    # Total across all tenants

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - resource/ensure_tenant
        - groupbytrace
        - batch
      exporters: [otlphttp]
```

The groupbytrace processor doesn't have built-in per-tenant limits, but you can combine it with the resource processor to ensure tenant identification. Downstream systems (like OneUptime) can then enforce per-tenant quotas and analysis.

## Combining with Trace-Aware Filtering

After grouping spans into complete traces, you can apply trace-aware filtering to drop entire traces based on patterns.

Here is a configuration that drops health check traces:

```yaml
processors:
  # Group spans into complete traces
  groupbytrace:
    wait_duration: 10s
    num_traces: 50000

  # Filter out health check traces
  filter/drop_health_checks:
    error_mode: ignore
    traces:
      span:
        # Drop traces where any span matches health check pattern
        - 'attributes["http.target"] == "/health"'
        - 'attributes["http.target"] == "/healthz"'
        - 'attributes["http.target"] == "/ready"'

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - groupbytrace              # First group
        - filter/drop_health_checks # Then filter complete traces
        - batch
      exporters: [otlphttp]
```

This configuration groups traces, then drops any trace containing a span that matches the health check patterns. This is more reliable than dropping individual spans, which could leave partial traces.

## Distributed Collector Architecture

In large-scale deployments, you might run multiple collector instances. Trace grouping requires all spans of a trace to reach the same collector instance for proper grouping.

Here is an architecture diagram:

```mermaid
graph TD
    A[Service A] -->|Spans: Trace abc123| B[Load Balancer
    Consistent Hash by Trace ID]
    C[Service B] -->|Spans: Trace abc123| B
    D[Service C] -->|Spans: Trace abc123| B

    B -->|All spans for abc123| E[Collector Instance 1
    groupbytrace]
    B -->|All spans for def456| F[Collector Instance 2
    groupbytrace]
    B -->|All spans for ghi789| G[Collector Instance 3
    groupbytrace]

    E --> H[Backend]
    F --> H
    G --> H
```

The load balancer uses consistent hashing on trace ID to route all spans of a trace to the same collector instance. This ensures the groupbytrace processor can see all spans together.

Here is a configuration for this architecture using a load balancing exporter:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # No grouping at this layer - just forward
  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  # Load balance to downstream collectors by trace ID
  loadbalancing:
    protocol:
      otlp:
        endpoint: collector-cluster:4317
        tls:
          insecure: true

    resolver:
      dns:
        hostname: collector-cluster
        port: 4317

    # CRITICAL: Route by trace ID for proper grouping
    routing_key: "traceID"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [batch]
      exporters: [loadbalancing]
```

This is the configuration for the gateway collector tier. It receives spans and routes them to downstream collectors by trace ID.

Here is the configuration for the downstream collector tier that performs grouping:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  # Now group - all spans for a trace reach this instance
  groupbytrace:
    wait_duration: 10s
    num_traces: 50000

  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: probabilistic
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - groupbytrace
        - tail_sampling
        - batch
      exporters: [otlphttp]
```

This two-tier architecture enables horizontal scaling while maintaining trace grouping correctness.

## Optimizing Wait Duration

The `wait_duration` parameter is critical for performance and completeness. Too short and you'll process incomplete traces. Too long and you'll consume unnecessary memory and add latency.

Here is how to determine the right value:

**Measure your P99 trace duration**: The wait duration should be at least your P99 trace duration. If 99% of traces complete within 5 seconds, set wait_duration to at least 5 seconds.

**Add network and processing buffer**: Add 2-3 seconds for network latency and SDK buffering. If P99 trace duration is 5 seconds, use 7-8 seconds for wait_duration.

**Consider service failures**: When a service fails, its spans might never arrive. A longer wait_duration means holding incomplete traces longer. Balance between completeness and memory usage.

**Monitor incomplete traces**: Track how often traces are released incomplete (via collector internal metrics). If it's high, increase wait_duration. If it's near zero, you can reduce it.

Here is a configuration with monitoring:

```yaml
processors:
  groupbytrace:
    wait_duration: 10s
    num_traces: 50000

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

  # Export collector internal metrics
  prometheus:
    endpoint: 0.0.0.0:8888

service:
  telemetry:
    metrics:
      level: detailed
      address: 0.0.0.0:8888

  pipelines:
    traces:
      receivers: [otlp]
      processors: [groupbytrace, batch]
      exporters: [otlphttp]
```

Monitor these metrics from the collector:
- `otelcol_processor_groupbytrace_traces_released`: Number of traces released
- `otelcol_processor_groupbytrace_spans_released`: Number of spans released
- `otelcol_processor_groupbytrace_traces_evicted`: Traces evicted due to limits

If `traces_evicted` is high, either increase `num_traces` or decrease `wait_duration` to process traces faster.

## Working with Large Traces

Some operations generate traces with hundreds or thousands of spans. A single batch job might create a trace with 10,000 spans. The groupbytrace processor needs protection against these.

Here is a configuration handling large traces:

```yaml
processors:
  memory_limiter:
    limit_mib: 4096          # 4GB for large trace environments
    spike_limit_mib: 1024

  groupbytrace:
    wait_duration: 30s       # Longer wait for large traces
    num_traces: 10000        # Fewer concurrent traces
    num_spans: 10000         # Allow large span counts per trace

  # Split large traces into chunks for processing
  span/limit:
    name:
      to_attributes:
        rules:
          - ^(.{100}).*$     # Truncate long span names
            break_on_match: true

  batch:
    send_batch_max_size: 2048
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - groupbytrace
        - span/limit
        - batch
      exporters: [otlphttp]
```

For systems that generate very large traces, increase `num_spans` and allocate more memory to the collector. Also increase `wait_duration` because large traces take longer to complete.

## Debugging and Validation

To verify trace grouping is working correctly, enable debug logging and use the spans metrics connector.

Here is a debugging configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317

processors:
  groupbytrace:
    wait_duration: 10s
    num_traces: 50000

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}

  # Log traces to console for debugging
  logging:
    loglevel: debug
    sampling_initial: 10     # Log first 10 traces
    sampling_thereafter: 0

service:
  telemetry:
    logs:
      level: debug

  pipelines:
    traces:
      receivers: [otlp]
      processors: [groupbytrace, batch]
      exporters: [otlphttp, logging]  # Add logging exporter
```

The logging exporter prints complete traces to stdout, showing all spans grouped together. Verify that spans with the same trace ID appear together in the output.

## Common Pitfalls and Solutions

**Problem**: Traces are always incomplete, with missing spans.

**Solution**: Your wait_duration is too short. Measure your actual trace durations (P99) and set wait_duration to at least that value plus a few seconds buffer.

**Problem**: Collector memory usage keeps growing.

**Solution**: Set `num_traces` to limit concurrent traces. Also check for trace ID generation bugs in your instrumentation - if every span gets a unique trace ID, every span becomes its own "trace" and the processor tracks them all separately.

**Problem**: Tail sampling isn't working as expected.

**Solution**: Ensure groupbytrace comes before tail_sampling in the processor list. The tail sampling processor requires complete traces, which only groupbytrace can provide.

**Problem**: Some traces are split across multiple exports.

**Solution**: In multi-collector deployments, ensure you're using consistent hashing by trace ID to route all spans of a trace to the same collector instance. Without this, spans of a trace hit different collectors and can't be grouped.

## Integration with OneUptime

OneUptime handles both complete and incomplete traces efficiently, but complete traces enable better analysis, service maps, and dependency graphs.

Here is a complete production configuration for OneUptime:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  memory_limiter:
    limit_mib: 2048
    spike_limit_mib: 512

  groupbytrace:
    wait_duration: 10s
    num_traces: 50000
    num_spans: 1000

  tail_sampling:
    decision_wait: 10s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 1000
      - name: normal
        type: probabilistic
        probabilistic:
          sampling_percentage: 10

  batch:
    send_batch_max_size: 1024
    timeout: 10s

exporters:
  otlphttp:
    endpoint: https://oneuptime.com/otlp/v1/traces
    headers:
      x-oneuptime-token: ${ONEUPTIME_TOKEN}
    retry_on_failure:
      enabled: true
      initial_interval: 5s
      max_interval: 30s

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors:
        - memory_limiter
        - groupbytrace
        - tail_sampling
        - batch
      exporters: [otlphttp]
```

This configuration groups traces, applies intelligent tail sampling to reduce volume while keeping all problematic traces, and exports complete traces to OneUptime for comprehensive analysis.

## Related Resources

For more information on trace processing and sampling in OpenTelemetry:

- [OpenTelemetry Collector: What It Is, When You Need It, and When You Don't](https://oneuptime.com/blog/post/what-is-opentelemetry-collector-and-why-use-one/view)
- [How to Reduce Noise in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-25-how-to-reduce-noise-in-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)

## Conclusion

The group-by-trace processor is essential for trace-aware processing in OpenTelemetry. It collects fragmented spans from distributed systems and assembles them into complete traces, enabling tail sampling, trace-level filtering, and comprehensive trace analysis.

Configure it with appropriate wait_duration based on your system's trace latency, protect against memory exhaustion with num_traces and num_spans limits, and always place it before tail sampling or other trace-aware processors in your pipeline. With OneUptime as your backend, you get a platform that efficiently handles and analyzes complete traces, making full use of the organization this processor provides.
