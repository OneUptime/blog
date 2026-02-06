# How to Fix the Collector Memory Leak Caused by the Tail Sampling Processor Holding Too Many Traces

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Collector, Tail Sampling, Memory Leak

Description: Fix memory leaks in the OpenTelemetry Collector caused by the tail sampling processor retaining too many traces in memory.

The tail sampling processor is one of the most useful components in the OpenTelemetry Collector. It lets you make sampling decisions after seeing all spans in a trace, which means you can keep all error traces and sample down healthy ones. But it comes with a significant cost: it holds entire traces in memory until the decision is made.

## Why Tail Sampling Causes Memory Issues

Head sampling (at the SDK level) decides whether to sample a trace at the moment it starts. It uses almost no memory. Tail sampling, by contrast, must buffer all spans of a trace until the trace is "complete" or a timeout expires.

If your traces are long-running or your traffic is high, the buffer fills up quickly. The default configuration is often not tuned for production workloads.

## The Default Configuration Problem

```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    num_traces: 50000
    expected_new_traces_per_sec: 100
    policies:
    - name: keep-errors
      type: status_code
      status_code:
        status_codes: [ERROR]
    - name: sample-rest
      type: probabilistic
      probabilistic:
        sampling_percentage: 10
```

With `decision_wait: 30s` and `expected_new_traces_per_sec: 100`, the processor buffers up to `30 * 100 = 3000` traces at any time. But if your actual trace rate is 10,000 per second, you are buffering `30 * 10,000 = 300,000` traces. Each trace can have dozens of spans, each with attributes. This easily consumes gigabytes of memory.

## Diagnosing the Leak

Watch the Collector's memory over time:

```bash
# Check Collector memory usage
kubectl top pods -l app=otel-collector

# Watch it over time
watch -n 5 kubectl top pods -l app=otel-collector
```

If memory steadily increases and never decreases, the tail sampling processor is likely holding traces longer than expected.

Check the Collector's internal metrics:

```
# Prometheus query for traces in the tail sampling buffer
otelcol_processor_tail_sampling_count_traces_sampled
otelcol_processor_tail_sampling_sampling_decision_timer_latency
```

## Fix 1: Reduce decision_wait

The shorter the wait, the less memory is needed. But you trade completeness for memory:

```yaml
processors:
  tail_sampling:
    decision_wait: 10s    # reduced from 30s
    num_traces: 100000
    expected_new_traces_per_sec: 5000
    policies:
    - name: keep-errors
      type: status_code
      status_code:
        status_codes: [ERROR]
    - name: sample-rest
      type: probabilistic
      probabilistic:
        sampling_percentage: 10
```

With 10 seconds, you hold fewer traces but risk making decisions before all spans arrive. For most web services with sub-second response times, 10 seconds is plenty.

## Fix 2: Set num_traces Appropriately

`num_traces` is the maximum number of traces to buffer. When this limit is reached, the oldest traces are force-sampled (kept or dropped based on incomplete information):

```yaml
processors:
  tail_sampling:
    decision_wait: 10s
    # Set this based on your actual traffic
    # traffic_per_second * decision_wait * safety_factor
    num_traces: 200000
    expected_new_traces_per_sec: 10000
```

## Fix 3: Use Composite Policies to Reduce Buffer Size

Instead of keeping all traces and sampling at the end, use composite policies that can make faster decisions:

```yaml
processors:
  tail_sampling:
    decision_wait: 5s
    num_traces: 50000
    policies:
    # Always keep error traces
    - name: keep-errors
      type: status_code
      status_code:
        status_codes: [ERROR]

    # Always keep slow traces (latency > 2s)
    - name: keep-slow
      type: latency
      latency:
        threshold_ms: 2000

    # Sample 5% of the rest
    - name: probabilistic-sample
      type: probabilistic
      probabilistic:
        sampling_percentage: 5
```

## Fix 4: Move to a Two-Tier Architecture

For high-traffic deployments, use a two-tier Collector setup:

```yaml
# Tier 1: Gateway collectors (many replicas)
# These do head sampling to reduce volume
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, batch]
      exporters: [loadbalancing]

exporters:
  loadbalancing:
    # Route traces by trace ID to ensure all spans
    # of a trace go to the same backend collector
    routing_key: traceID
    protocol:
      otlp:
        tls:
          insecure: true
    resolver:
      dns:
        hostname: otel-collector-tail-sampler
```

```yaml
# Tier 2: Tail sampling collectors (fewer, larger replicas)
service:
  pipelines:
    traces:
      receivers: [otlp]
      processors: [memory_limiter, tail_sampling, batch]
      exporters: [otlp]
```

The load balancing exporter routes by trace ID, ensuring all spans of a trace reach the same tail sampling instance. This is critical; without it, the tail sampler sees incomplete traces and makes wrong decisions.

## Memory Sizing Formula

Use this formula to estimate memory needs:

```
memory_needed = traces_per_second * decision_wait_seconds * avg_spans_per_trace * avg_span_size_bytes

Example:
5000 traces/s * 10s * 5 spans/trace * 2KB/span = 500MB
```

Add a 50% safety margin and set your container limit accordingly.

## Summary

The tail sampling processor holds traces in memory by design. The fix is to reduce `decision_wait`, set `num_traces` appropriately, and use a load-balanced architecture for high-traffic deployments. Always size your Collector's memory based on your actual trace rate and the decision wait window.
