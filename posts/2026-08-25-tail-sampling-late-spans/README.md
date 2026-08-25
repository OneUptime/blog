# How to Keep Late Spans from Splitting Tail-Sampling Decisions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, Distributed Tracing, OpenTelemetry Collector, Reliability

Description: Preserve one tail-sampling outcome for late spans with trace-ID routing, measured wait windows, and correctly sized sampled and non-sampled decision caches.

---

A tail sampler can decide to keep a trace, release its spans, and then receive another span with the same trace ID. If the processor still remembers the outcome, the late span inherits it. If all memory of the trace has been evicted, that span can look like a brand-new trace and receive a different decision.

The result is confusing: one backend may contain the first part of a trace but not its late child, or it may contain an isolated late span from a trace that was originally dropped.

## Understand the Three Late-Span Paths

The Collector Contrib documentation describes three paths:

1. While the completed trace entry remains in the live trace structure, a late span follows its existing final decision.
2. With the default `trace-complete` sampling strategy and no decision cache, once that entry is evicted, a late span starts a new pending trace and is evaluated again after `decision_wait`.
3. With a decision cache, the processor can apply the remembered sampled or non-sampled outcome immediately, even after buffered span data is gone.

The third path is the durable behavior within a running processor instance. Configure both caches when both kinds of decision matter:

```yaml
processors:
  tail_sampling:
    decision_wait: 20s
    num_traces: 60000
    decision_cache:
      sampled_cache_size: 300000
      non_sampled_cache_size: 2000000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 10
```

The caches are independent LRU caches and default to size zero, which disables them. A hit in the sampled cache forwards the late span immediately; a hit in the non-sampled cache discards it immediately.

## Size Caches by Decision Throughput

An LRU cache does not promise a fixed duration. Estimate the number of entries needed for the desired remembrance window:

```text
sampled cache ~= sampled decisions/s x remembrance seconds
drop cache    ~= non-sampled decisions/s x remembrance seconds
```

Add burst headroom and measure actual eviction behavior. If 90% of traces are dropped, using equal cache sizes gives the drop cache a much shorter effective history. The configuration comments recommend caches substantially larger than `num_traces`; an order of magnitude is a starting heuristic, not a substitute for the keep/drop rates.

## Keep Every Trace on One Collector

Caches only help the instance that made the decision. All spans for a trace must reach the same tail-sampling Collector. In a scaled deployment, use the documented two-tier pattern: an upstream Collector layer with the load-balancing exporter routes by `traceID`, and a downstream layer owns tail-sampling state.

Use the current snake-case component name and the trace-ID routing key in a version-tested configuration. Do not put a generic round-robin service directly in front of independent tail samplers and assume their caches are shared.

Membership changes are another source of splits. When the downstream endpoint set changes, consistent hashing remaps some trace IDs. During rollouts, old spans can be pending on one replica while later spans are sent to another. Minimize endpoint-set churn and drain retiring replicas, but understand that draining alone cannot preserve affinity after the hash ring changes.

## Reduce Lateness Before Caching It

Decision caches preserve consistency, but a late span cannot change an already completed decision. If an error span arrives after a trace was dropped, a cached drop correctly drops that error too. Therefore:

- measure `otelcol_processor_tail_sampling_sampling_late_span_age` for live-entry late spans;
- count cache-served late spans with `otelcol_processor_tail_sampling_early_releases_from_cache_decision`;
- increase `decision_wait` if important spans routinely arrive before a slightly longer boundary;
- inspect SDK batch intervals, exporter queues, retries, and network paths;
- avoid batching or routing that separates spans of the same trace; and
- use `decision_wait_after_root_received` only with a grace that covers observed post-root arrivals.

The optional span-count metric used in the upstream late-span ratio example requires the `processor.tailsamplingprocessor.metricstatcountspanssampled` feature gate. The feature gate is alpha, and the metric has development stability, so review both during upgrades.

Do not combine the two late-span metrics as though both carry an age. The current cache-hit path increments `early_releases_from_cache_decision` with a `sampled` attribute but does not record `sampling_late_span_age`; the histogram covers only the path where the final decision remains in the live trace entry.

## Know What the Cache Does Not Survive

Decision caches are process memory. They do not survive a crash or restart and are not shared across replicas. The experimental Pebble tail-storage extension currently drops all data from its Pebble database at startup, so it does not make decisions restart-durable either.

A cache also cannot repair upstream head sampling. If an SDK never records or exports a span, the Collector cannot see it. Finally, cached late spans follow the old decision; they are intentionally not allowed to reopen the trace and vote again.

If the `processor.tailsamplingprocessor.recordpolicy` feature gate is enabled, current implementations add `tailsampling.cached_decision=true` to the instrumentation-scope attributes for spans released through a cached sampled decision and restore the cached top-level `tailsampling.policy` value when available. That is useful for verifying the path, but it is alpha diagnostic enrichment rather than a correctness mechanism.

## Test the Boundary Explicitly

Create fixtures with a stable trace ID and send spans at four times: before the decision, just after it, after the live entry would normally rotate out, and after the cache's expected LRU horizon. Run both a trace that should be kept and one that should be dropped. Verify that:

- every pre-horizon span follows the original outcome;
- no second decision appears in policy metrics for cache hits;
- sampled cache hits reach the exporter promptly; and
- behavior after cache eviction is understood and alerted on.

Repeat during a replica rollout because routing changes, not just time, can bypass the correct cache.

## Official Documentation

- [Tail-sampling late-arriving span guidance](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#late-arriving-spans)
- [Tail-sampling decision-cache configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Cached trace handling in the tail-sampling processor](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [Load-balancing exporter and trace-ID routing](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md)

## Conclusion

Keep trace-ID affinity stable, wait long enough for decision-relevant spans, and size sampled and non-sampled LRU caches from their separate decision rates. The cache makes late spans consistent with a completed decision; it does not make state shared, restart-durable, or able to recover telemetry that never reached the Collector.
