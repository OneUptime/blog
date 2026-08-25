# How to Fix `sampling_trace_dropped_too_early` Without Adding Memory

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Troubleshooting, Reliability

Description: Diagnose early tail-sampling evictions and choose among shorter waits, root acceleration, sharding, backpressure, and storage before increasing memory.

---

`otelcol_processor_tail_sampling_sampling_trace_dropped_too_early` means a scheduled decision could no longer find the trace's live entry or buffered spans. With the default `trace-complete` strategy and in-memory storage, this usually happens because `num_traces` filled and the FIFO eviction queue removed the oldest trace to admit a new trace.

Increasing `num_traces` can hide the symptom, but it is only correct when the wait window, traffic distribution, and trace-size envelope are already understood.

## Confirm That Capacity Eviction Is the Failure

Graph the early-drop counter as a rate and compare it with live traces, new trace IDs, removal age, and decision-loop latency:

```promql
rate(otelcol_processor_tail_sampling_sampling_trace_dropped_too_early[5m])
```

```promql
histogram_quantile(
  0.01,
  sum by (job, instance, le) (
    rate(otelcol_processor_tail_sampling_sampling_trace_removal_age_bucket[5m])
  )
)
```

```promql
histogram_quantile(
  0.99,
  sum by (job, instance, le) (
    rate(otelcol_processor_tail_sampling_sampling_decision_timer_latency_bucket[5m])
  )
)
```

If the early-drop rate rises while low removal-age quantiles approach or fall below the applicable decision schedule and the live-trace gauge approaches the replica's configured capacity, capacity churn is likely. The removal-age histogram records every successful removal, so use it as supporting evidence rather than an eviction-only signal. A slow decision timer can worsen the problem because decision work and downstream forwarding take longer than expected.

Check per-replica traffic too. Tail sampling requires trace-ID affinity, and a skewed hash distribution, stale load-balancer membership, or one overloaded pod can evict traces even when the fleet-wide average looks comfortable.

## Reduce the Amount of Pending State

First determine whether `decision_wait` is longer than the actual first-to-last span arrival delay needed by your policies. Reducing it lowers the amount of undecided span data and the number of trace IDs that must remain resident until a decision. With the default decision caches disabled, decided trace metadata remains in the live map until FIFO eviction, so the live-trace gauge can still sit near `num_traces`:

```yaml
processors:
  tail_sampling:
    decision_wait: 12s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

Do not tune from application trace duration alone. What matters is when ended spans reach this processor. Validate the new window with `sampling_late_span_age` and with known error and slow-trace fixtures.

In current source, that age histogram observes only late spans whose final decision still exists in the live trace structure. If decision caches are enabled, also inspect `otelcol_processor_tail_sampling_early_releases_from_cache_decision`; cache-served late spans increment that counter but do not add an age sample.

When an ended root span is a reliable completion signal, retain a longer fallback and add a measured grace after root arrival:

```yaml
processors:
  tail_sampling:
    decision_wait: 30s
    decision_wait_after_root_received: 4s
    num_traces: 50000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

The processor uses the earlier of the original schedule and the root-based schedule. The four seconds are not proof that all descendants have arrived; they are an operational grace window that must cover exporter and network reordering.

## Remove Decision-Path Bottlenecks

With the default `trace-complete` strategy, the decision-timer metric includes policy evaluation and passing sampled traces to the next consumer. Keep slow or blocking work out of the synchronous path. A batch processor followed by an exporter with `sending_queue` enabled can move ordinary backend latency off the decision loop until their bounded buffers fill; only a persistent exporter queue adds restart durability.

For high ingestion contention, current Collector Contrib supports `num_shards`:

```yaml
processors:
  tail_sampling:
    num_shards: 4
    decision_wait: 15s
    num_traces: 80000
    expected_new_traces_per_sec: 4000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
```

Trace IDs are hashed to shards, and the aggregate `num_traces`, expected rate, caches, and sustained rate limits are divided among them. A shard can still fill early under skew. `num_shards` above one is not supported with `tail_storage`.

## Decide Whether to Evict or Apply Backpressure

The configuration struct exposes `block_on_overflow`. With its default false behavior, a new trace evicts the oldest trace when `num_traces` is full. Setting it true waits for completed decisions to free slots. In the current `trace-complete` path, that requires a nonzero cache for every decision class the policies can produce:

```yaml
processors:
  tail_sampling:
    block_on_overflow: true
    decision_wait: 10s
    num_traces: 50000
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 500000
```

With the default zero-sized caches, normal decisions retain their live-map entries, so a full processor can remain blocked. The values above follow the component's guidance that an enabled cache be at least an order of magnitude larger than `num_traces`; size each cache for its actual late-span traffic.

This trades silent early eviction for backpressure. It can stall the receiver fan-out and affect other pipelines that share the receiver, so exercise it under overload and confirm that upstream queues, timeouts, and retry behavior are acceptable. It is not free capacity.

Experimental Pebble `tail_storage` can reduce heap pressure from pending span bodies, but live trace metadata remains bounded by `num_traces`, disk appends can fail, and the current extension clears its database on startup. It is not a shortcut around admission and throughput planning.

## Increase `num_traces` Only from a Calculation

After the previous checks, calculate a target:

```text
target slots per replica = peak new trace IDs/s at that replica x effective time to decision x burst-and-skew factor
```

Then replay realistic trace sizes and measure Collector RSS. `num_traces` counts trace IDs, not spans or bytes, so doubling it can more than double practical memory risk when bursts also contain larger traces. Pair the setting with a tested `maximum_trace_size_bytes` limit and pod or host memory headroom.

Decision caches do not raise the configured `num_traces` ceiling. They remember completed keep/drop outcomes for late spans, and current release paths also use active caches to remove completed trace state from the live map, freeing slots sooner.

## Official Documentation

- [Tail-sampling monitoring and tuning guide](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#monitoring-and-tuning)
- [Tail-sampling internal metrics](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)
- [Overflow, sharding, and size configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Tail-sampling eviction and decision-loop implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)

## Conclusion

Fix early drops by locating the constrained replica, validating the necessary arrival window, and removing decision-path contention first. Use root acceleration, sharding, or deliberately tested backpressure where they fit. Increase `num_traces` only after peak rate and real trace sizes show exactly how much capacity and memory are required.
