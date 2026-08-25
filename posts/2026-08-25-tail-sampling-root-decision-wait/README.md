# Reduce Tail-Sampling Delay with `decision_wait_after_root_received`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Distributed Tracing, Latency

Description: Add a measured grace after root-span arrival so tail sampling decides common traces sooner while retaining a longer fallback for reordered and incomplete traces.

---

Tail sampling normally schedules a trace from the time its first span reaches the processor. A conservative `decision_wait` protects against delayed spans, but it also delays every ordinary trace and increases pending storage. Current Collector Contrib adds `decision_wait_after_root_received` as a second, root-triggered schedule.

The setting is an acceleration hint, not a declaration that the trace is complete.

## How the Two Timers Interact

With `sampling_strategy: trace-complete`, a new trace is scheduled around `decision_wait` after first observation. When the processor later receives a span whose parent span ID is empty, it identifies that span as a root and attempts to move the trace to an earlier decision batch, approximately `decision_wait_after_root_received` after that arrival.

Conceptually:

```text
decision time = earlier of:
  first trace arrival + decision_wait
  root span arrival + decision_wait_after_root_received
```

The processor's timer path is bucketed, so this is not a precision scheduling SLA. A value of `0s`, the default, disables root acceleration.

In `span-ingest` mode, `sampled` or `dropped` outcomes can finalize during ingestion. The two waits govern cleanup or earlier cleanup of traces that remain pending, which are finalized as not sampled without policy re-evaluation.

## Why an Ended Root Is Helpful but Not Conclusive

SDKs export ended spans, so an arriving root span often means the top-level operation has finished. In well-formed synchronous traces, its children have usually ended too. They may still reach the tail sampler later because:

- each service has an independent batch span processor;
- exporter queues flush on different schedules;
- network paths and retries reorder OTLP requests;
- an asynchronous descendant can outlive the root; or
- load-balancer membership changes route late data differently.

Deciding immediately at root arrival can therefore miss the exact slow or error child that tail sampling was intended to preserve.

## Derive the Grace Window from Traffic

Measure two distributions at the tail-sampling tier:

```text
first arrival -> last arrival
root arrival  -> last arrival
```

If the first distribution has a 99.9th percentile of 28 seconds but the root-to-last distribution is 3 seconds, this is a reasonable starting point:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 30s
    decision_wait_after_root_received: 4s
    num_traces: 90000
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 3000000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: slow
        type: latency
        latency:
          threshold_ms: 2000
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

The four-second grace handles the common post-root export tail. The 30-second schedule remains the fallback when the root is absent or arrives very late.

Do not copy these values unchanged. Instrumentation languages, batch timeouts, service depth, message consumers, and network topology change the arrival distribution.

## Protect the Decision After Acceleration

While the accelerated decision remains in the live trace entry or a decision-cache entry on the same Collector instance, later spans do not reopen it. Configure sampled and non-sampled decision caches so late spans can inherit the original outcome after the live trace entry is removed. Because these caches are bounded LRUs, a span arriving after its entry is evicted can form a new trace evaluation.

Then watch:

- `otelcol_processor_tail_sampling_sampling_late_span_age` for late spans handled while the decision remains in the live trace entry;
- `otelcol_processor_tail_sampling_early_releases_from_cache_decision` for cache-served late spans, which do not contribute to the age histogram;
- `otelcol_processor_tail_sampling_sampling_traces_on_memory` for the expected capacity reduction; and
- sampled trace completeness in a backend or replay harness.

A cache preserves consistency only while its entry remains on that instance, not correctness of the earlier policy evaluation. An error arriving after an accelerated drop will follow the cached drop during that window. Increase the root grace if decision-relevant spans fall into that interval.

## Check Root Identification and Trace Shape

The implementation recognizes a root solely by an empty `ParentSpanID`. A span that merely represents an important service entry is not necessarily the distributed trace root. A missing parent span at this Collector does not make a child appear root-like: the child still carries its nonempty parent span ID. Multiple zero-parent spans under one trace ID indicate malformed or manually constructed telemetry.

Before enabling acceleration fleet-wide:

1. Count apparent roots per trace in representative data.
2. Verify the expected root is exported and reaches this tail tier.
3. Replay traces with a child intentionally delayed past the proposed grace.
4. Check error, latency, span-count, and attribute policies separately.
5. Exercise rolling deployments and exporter retries.

For traces designed around detached asynchronous work, a longer fixed wait or a different trace boundary may be safer than root acceleration.

## Recalculate Capacity After the Change

With the decision caches configured above, successful acceleration reduces average live-entry residence time, but `num_traces` must still cover traffic whose root is missing or delayed and therefore uses the full `decision_wait`. Size from burst behavior, not only the new average. Keep the fixed wait as a real fallback rather than shrinking capacity until the fallback itself causes early eviction.

Root acceleration is orthogonal to `maximum_trace_size_bytes`, `num_shards`, and experimental `tail_storage`. Those settings address individual trace size, contention, and pending span placement; none proves trace completeness.

## Official Documentation

- [Tail-sampling optional settings and sampling strategies](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#sampling-strategies)
- [`decision_wait_after_root_received` configuration definition](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Root detection and earlier-batch scheduling](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [Tail-sampling decision batcher](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/idbatcher/id_batcher.go)

## Conclusion

Keep a conservative `decision_wait` for missing and reordered roots, then set `decision_wait_after_root_received` from the observed root-to-last-span arrival tail. Pair it with decision caches and late-span monitoring. The result is faster common-case sampling without pretending that root arrival is a universal trace-completion signal.
