# How to Cap Tail-Sampled Output by Bytes per Second Instead of Trace or Span Count

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Tail Sampling, OpenTelemetry Collector, Rate Limiting, Cost Control

Description: Configure the tail sampler's byte token bucket, choose sustained and burst capacity, and avoid policy combinations that silently bypass the intended output cap.

---

A trace-per-second limit treats a two-span trace like a 2 MiB trace. A span-per-second limit is better, but spans with events, links, and large attributes still vary widely. The current tail-sampling processor includes a `bytes_limiting` policy that charges each evaluated trace by its protobuf-marshaled size.

The policy uses a token bucket. `bytes_per_second` is the continuous refill rate, and `burst_capacity` is the maximum number of byte tokens held. If there are not enough tokens for the entire trace at evaluation time, that policy votes not sampled.

## Configure the Sustained Rate and Burst

This example permits 1 MiB/s over time and up to a 5 MiB burst:

```yaml
processors:
  tail_sampling:
    sampling_strategy: trace-complete
    decision_wait: 15s
    maximum_trace_size_bytes: 4194304
    policies:
      - name: byte-budget
        type: bytes_limiting
        bytes_limiting:
          bytes_per_second: 1048576
          burst_capacity: 5242880
```

If `burst_capacity` is omitted, it defaults to twice `bytes_per_second`. A single trace whose evaluated protobuf size exceeds the burst capacity can never obtain enough tokens, even when the bucket is otherwise full. Set the burst at least as large as the biggest trace this policy should admit, and use `maximum_trace_size_bytes` as an independent upper bound.

The bucket starts with burst capacity and refills continuously. Short intervals can exceed the sustained rate until the bucket drains; over a long, continuously busy interval, output selected by this policy approaches `bytes_per_second`.

## Make It the Only Positive Vote for a Decision-Path Cap

Top-level tail-sampling policies do not form an all-must-pass chain. In the absence of a hard `drop` decision, any top-level `Sampled` vote is enough to keep the trace. This does **not** enforce a byte cap:

```yaml
processors:
  tail_sampling:
    policies:
      - name: byte-budget
        type: bytes_limiting
        bytes_limiting:
          bytes_per_second: 1048576
      - name: errors-bypass-budget
        type: status_code
        status_code:
          status_codes: [ERROR]
```

When the bucket rejects an error trace, the status policy can still sample it. That design may be desirable as a soft baseline budget with an error escape hatch, but it is not a total output cap.

To ensure that every ordinary positive policy decision is charged to one bucket, keep `bytes_limiting` as the only positive top-level sampler. Hard `drop` policies may coexist because they can only remove traces. If you need content priority and one shared byte budget, test the architecture carefully: multiple `and` policies with separate byte limiters create separate buckets, and the composite policy allocates spans per second, not bytes.

Even this layout is not an absolute egress cap. After a trace has been sampled, later batches that find its live decision or sampled decision-cache entry are forwarded without re-running `bytes_limiting`. Use a downstream byte-aware queue, gateway, or backend quota when every exported byte—including late spans—must be bounded.

## Understand What Is Counted

The evaluator calls the Collector protobuf marshaler's `TracesSize()` for the trace data supplied to the policy. In `trace-complete`, this is the accumulated trace retrieved for the decision. It is not:

- gzip-compressed OTLP wire size;
- JSON exporter size;
- backend index or object-storage bytes;
- Collector heap allocation; or
- the size of spans that arrive after the decision.

Calibrate the setting with observed OTLP protobuf sizes and compare the downstream backend's actual compression ratio and storage amplification separately.

## Account for Strategy, Shards, and Replicas

The byte limiter reports itself stateful, so the processor rejects it with `sampling_strategy: span-ingest`. Use `trace-complete`.

With `num_shards` greater than one, the configured sustained byte rate is divided across shards. `burst_capacity` is deliberately not divided because a whole trace is evaluated on one shard and still needs to fit. The aggregate instantaneous burst allowance can therefore grow to roughly the per-shard burst multiplied by shard count.

Every Collector replica owns an independent bucket. A 1 MiB/s setting on six replicas permits approximately 6 MiB/s sustained across the tier, assuming balanced traffic. Divide a fleet budget deliberately and leave room for uneven trace-ID distribution.

## Compare Related Policies

- `rate_limiting` charges span count per second and has `spans_per_second` plus `burst_capacity`.
- `composite` allocates a `max_total_spans_per_second` budget among ordered subpolicies.
- `maximum_trace_size_bytes` rejects any still-pending trace that grows beyond a per-trace boundary.
- `bytes_limiting` controls serialized trace bytes selected over time by that policy.

Use byte limiting for egress or cost budgets dominated by payload size. Use the per-trace maximum even when byte rate is controlled, because one pathological trace can otherwise consume the entire burst and substantial pending resources.

## Observe and Load-Test the Bucket

The generated `count_traces_sampled` metric reports decisions by policy. Current Contrib also offers a feature-gated alpha `count_bytes_sampled` metric through `processor.tailsamplingprocessor.metricstatcountbytessampled`.

Replay a distribution containing small, typical, and near-burst traces. Verify long-run selected protobuf bytes, short burst behavior, large-trace rejection, and results across all shards and replicas. Token buckets are arrival-order sensitive: a large trace can be rejected while smaller traces arriving later fit the remaining tokens.

## Official Documentation

- [Tail-sampling bytes-limiting policy](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/README.md#bytes-limiting-policy)
- [Byte-limiter configuration fields](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/config.go)
- [Byte token-bucket implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/internal/sampling/bytes_limiting.go)
- [Tail-sampling byte telemetry feature gate](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/tailsamplingprocessor/documentation.md)

## Conclusion

Use `bytes_limiting` when serialized payload volume, not trace or span count, drives the budget. Size both refill and burst from real protobuf traces, multiply limits across replicas, and remember that the limiter is a policy vote. Making it the only positive top-level policy prevents other policy votes from bypassing the bucket, but late spans still bypass evaluation; enforce an absolute byte cap downstream.
