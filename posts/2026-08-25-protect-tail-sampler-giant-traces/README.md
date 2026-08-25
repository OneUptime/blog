# How to Protect the OpenTelemetry Collector from Giant Traces with `maximum_trace_size_bytes`

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Memory Management, Reliability

Description: Apply and validate a hard per-trace size guard before giant traces exhaust tail-sampling memory or disk and delay every other decision.

---

`num_traces` limits how many trace IDs the tail-sampling processor tracks, but it does not limit the size of any one trace. A fan-out bug, retry loop, high-volume span events, or oversized attributes can let a single trace consume disproportionate memory, storage I/O, policy time, and export bandwidth.

Current Collector Contrib provides `maximum_trace_size_bytes` as a per-trace safety rail. A value of zero disables the rail. Once an undecided trace grows strictly larger than the configured value, the processor marks it not sampled immediately and increments the dedicated too-large metric.

## Configure a Deliberate Per-Trace Limit

This example rejects pending traces after they exceed 2 MiB of accumulated OTLP protobuf data:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 20s
    num_traces: 80000
    maximum_trace_size_bytes: 2097152
    decision_cache:
      sampled_cache_size: 500000
      non_sampled_cache_size: 3000000
    policies:
      - name: errors
        type: status_code
        status_code:
          status_codes: [ERROR]
      - name: baseline
        type: probabilistic
        probabilistic:
          sampling_percentage: 5
```

The size check occurs before the normal timed policy decision. It is therefore stronger than a normal `NotSampled` vote: an `always_sample`, error, force-sample, or latency policy does not rescue a trace that crosses the size guard while still undecided.

The processor tracks size as Collector `pdata` is ingested, using protobuf-marshaler size calculations for resource-span batches. The configured number is not Collector heap bytes, compressed wire bytes, JSON export size, or the final backend storage footprint.

## Pick a Limit from Real Trace Sizes

Do not choose the pod memory limit divided by `num_traces`. Most traces are small, allocation overhead is not proportional to serialized bytes, and simultaneous high-percentile traces matter more than an impossible all-equal model.

A practical procedure is:

1. Capture representative OTLP protobuf traffic before tail sampling.
2. Group it by trace ID and calculate accumulated protobuf size per trace.
3. Separate legitimate large workflows from malformed or runaway traces.
4. Choose a boundary above the largest trace the backend and operators genuinely need.
5. Replay traces immediately below, exactly at, and just above the boundary.

The implementation drops when accumulated size is greater than the threshold, not when it is equal. Because size is added a received resource-span batch at a time, the trace can overshoot the limit by the size of the last batch before it is rejected.

If legitimate batch jobs are much larger than interactive requests, one global limit may be inappropriate. Route those workloads to a separately sized tail-sampling tier or fix instrumentation that emits unbounded events. The setting is processor-wide, not policy- or service-specific.

## Monitor the Guardrail

Alert on:

```promql
rate(otelcol_processor_tail_sampling_traces_dropped_too_large[5m]) > 0
```

The metric tells you how many traces crossed the limit, not which service caused them or their attempted final size. Correlate the first occurrence with Collector logs and temporary, access-controlled capture at an upstream tier. Avoid routinely logging full trace payloads because attributes and events can contain sensitive data.

Also watch Collector RSS, CPU, decision-timer latency, storage usage, refused spans, and exporter queue behavior. A limit protects future accumulation after it trips; parsing and receiving the batch that crosses it still costs work.

The alpha `processor.tailsamplingprocessor.metricstatcountbytessampled` feature gate exposes per-policy sampled/not-sampled byte counters in current Contrib builds. That telemetry can help quantify policy output, but it is not a replacement for the too-large counter and may change across upgrades.

## Distinguish the Other Byte Controls

`bytes_limiting` limits accepted trace bytes over time with a token bucket. Its `burst_capacity` also prevents a trace larger than the bucket from passing that policy. It is a policy vote, however; another top-level sampling policy can still keep the trace.

`maximum_trace_size_bytes` is different:

- it applies to every still-pending trace;
- it is independent of average bytes per second;
- it fires before ordinary policy evaluation; and
- it protects memory predictability even when output bandwidth is healthy.

Experimental `tail_storage` moves pending batches to a storage extension, but giant traces can still exhaust or churn disk, consume serialization work, and delay decisions. Keep the size guard when moving state out of heap.

## Account for `span-ingest` Decisions

The current implementation applies the size guard while the trace's final decision is still unspecified. In `span-ingest` mode, a policy can sample a trace early; later batches then follow that final decision and are no longer pending for the pre-decision size check.

`trace-complete` keeps the guard active until its scheduled decision and therefore gives a stronger pending-trace bound than an early sampled outcome in `span-ingest`. It is still not an absolute completed-trace bound: a late batch arriving after the trace-complete decision also follows the existing sampled decision without reopening the size check. Enforce a downstream limit when every exported batch must be covered.

Decision caches should still be configured. Once an oversized trace is rejected, late batches should inherit the non-sampled decision instead of starting a fresh accumulation after the live entry is evicted.

## Test Failure Behavior

Generate a trace with bounded synthetic attributes and add spans until it crosses the selected threshold. Confirm that:

- nothing from a trace that crosses the threshold before its `trace-complete` decision reaches the trace exporter;
- the too-large counter increments once for the trace;
- a later span is discarded through the remembered non-sampled decision;
- ordinary traces continue through without a decision-latency spike; and
- no sensitive diagnostic payload is left behind.

Repeat with the largest single OTLP request allowed by the receiver and with multiple giant traces arriving concurrently.

## Official Documentation

- [Tail-sampling processor optional configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md)
- [`maximum_trace_size_bytes` configuration definition](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Trace-size accumulation and early-drop implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/processor.go)
- [Tail-sampling too-large trace metric](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)

## Conclusion

Set `maximum_trace_size_bytes` from measured protobuf trace sizes and a clear definition of the largest useful trace. It is a pre-decision per-trace circuit breaker, not a throughput limiter or exact heap cap. Monitor every trip, retain non-sampled decisions for late batches, and test the special early-finalization behavior before using it with `span-ingest`.
