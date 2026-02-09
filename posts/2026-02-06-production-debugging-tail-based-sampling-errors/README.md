# How to Build a Production Debugging Workflow Using OpenTelemetry Tail-Based Sampling of Error Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail-Based Sampling, Error Traces, Production Debugging, Collector

Description: Build a production debugging workflow that captures 100% of error traces using OpenTelemetry tail-based sampling strategies.

In production, you cannot afford to capture every single trace. The volume would overwhelm your storage and your wallet. But you also cannot afford to miss the traces that matter most: the ones that contain errors. Tail-based sampling solves this by making the keep-or-drop decision after the trace is complete, so you can guarantee that every error trace is retained while sampling down the healthy traffic.

## Head-Based vs Tail-Based Sampling

Head-based sampling makes the decision at the start of a trace. You flip a coin when the request arrives, and that decision propagates to all downstream services. The problem is that you do not know at the start whether the request will fail. A 1% sampling rate means you lose 99% of your error traces.

Tail-based sampling waits until all spans in a trace have arrived, inspects the complete trace, and then decides whether to keep it. This means you can apply rules like "keep all traces that contain an error" or "keep all traces where any span exceeds 5 seconds."

## Setting Up the Collector for Tail-Based Sampling

The OpenTelemetry Collector's `tail_sampling` processor handles this. Here is a production-ready configuration:

```yaml
receivers:
  otlp:
    protocols:
      grpc:
        endpoint: 0.0.0.0:4317
      http:
        endpoint: 0.0.0.0:4318

processors:
  tail_sampling:
    # How long to wait for all spans in a trace to arrive
    decision_wait: 30s
    # Number of traces to hold in memory while waiting
    num_traces: 100000
    # Expected number of new traces per second (for memory allocation)
    expected_new_traces_per_sec: 1000

    policies:
      # Policy 1: Always keep traces that have errors
      - name: errors-always-keep
        type: status_code
        status_code:
          status_codes: [ERROR]

      # Policy 2: Always keep traces with high latency
      - name: slow-traces-keep
        type: latency
        latency:
          threshold_ms: 5000

      # Policy 3: Always keep traces with specific attributes
      - name: debug-session-keep
        type: string_attribute
        string_attribute:
          key: debug.session_id
          values: [".*"]
          enabled_regex_matching: true

      # Policy 4: Sample 5% of successful, fast traces
      - name: normal-traffic-sample
        type: probabilistic
        probabilistic:
          sampling_percentage: 5

  batch:
    send_batch_size: 1024
    timeout: 5s

exporters:
  otlp:
    endpoint: "https://otel.oneuptime.com:4317"

service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [tail_sampling, batch]
      exporters: [otlp]
```

## The Debugging Workflow

With tail-based sampling in place, here is the debugging workflow your team follows when an incident occurs:

### Step 1: Check Error Rate Dashboards

Your metrics pipeline (which is separate from trace sampling) shows a spike in 500 errors on the `/api/checkout` endpoint at 14:15 UTC.

### Step 2: Query Error Traces

Because the tail sampler keeps 100% of error traces, you can confidently query for all traces with errors in that time window:

```sql
-- Query your trace backend for error traces
SELECT
    trace_id,
    root_span_name,
    duration_ms,
    error_message,
    timestamp
FROM traces
WHERE status = 'ERROR'
    AND root_span_name LIKE '%checkout%'
    AND timestamp BETWEEN '2026-02-06T14:10:00Z' AND '2026-02-06T14:20:00Z'
ORDER BY timestamp DESC
LIMIT 50;
```

### Step 3: Analyze Error Patterns

Group the error traces by their error message or by the span where the error originated:

```python
from collections import Counter

def categorize_errors(error_traces):
    """Group error traces by their root cause span."""
    error_sources = Counter()

    for trace_data in error_traces:
        # Find the span that has the error status
        for span in trace_data["spans"]:
            if span.get("status", {}).get("code") == "ERROR":
                error_key = f"{span['name']}: {span['status'].get('message', 'unknown')}"
                error_sources[error_key] += 1
                break  # Count once per trace

    return error_sources.most_common(10)

# Output might look like:
# [
#     ("payment.charge: Connection refused to payment-gateway:443", 42),
#     ("inventory.check: Timeout after 5000ms", 8),
#     ("order.validate: Invalid coupon code format", 3),
# ]
```

### Step 4: Deep Dive Into Representative Traces

Pick a trace from the most common error category and examine its full span tree. The trace gives you the complete request path: which services were called, how long each step took, where the error originated, and how it propagated.

## Scaling Tail-Based Sampling

The main challenge with tail-based sampling is that the collector must hold partial traces in memory while waiting for all spans to arrive. For high-throughput systems, this requires careful tuning:

```yaml
processors:
  tail_sampling:
    # Set decision_wait based on your longest trace duration
    # If traces can span up to 60 seconds, set this to 65s
    decision_wait: 30s

    # Calculate based on: traces_per_second * decision_wait_seconds
    # 1000 traces/sec * 30 seconds = 30,000 traces in flight
    # Add buffer: 50,000
    num_traces: 50000
```

For very high throughput, run multiple collector instances behind a load balancer that routes by trace ID. This ensures all spans from the same trace land on the same collector instance:

```yaml
# In your load balancer config, use trace ID based routing
# This is often done with a routing processor in a gateway collector

processors:
  routing:
    from_attribute: "trace_id"
    table:
      - value: "0*"
        exporters: [otlp/collector-1]
      - value: "1*"
        exporters: [otlp/collector-2]
```

## Handling Late-Arriving Spans

Sometimes spans arrive after the sampling decision has been made. Configure a grace period to handle stragglers:

```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    # Additional policies can catch late errors
    policies:
      - name: late-error-catch
        type: status_code
        status_code:
          status_codes: [ERROR]
```

## Summary

Tail-based sampling is the foundation of a solid production debugging workflow. It guarantees you never lose an error trace while keeping storage costs manageable by sampling down healthy traffic. Set up your collector with policies that prioritize errors and high latency, scale it with trace-ID-based routing, and build your debugging workflow around the confidence that every error is captured. When the next incident hits, you will have every failing trace available for analysis.
