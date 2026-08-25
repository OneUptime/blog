# Validation Summary: How to Use `decision_wait_after_root_received` to Reduce Tail-Sampling Delay Without Truncating Long Traces

## Status

validated

## Post Type

Technical configuration and operations guide

## Technologies Covered

- OpenTelemetry Collector Contrib v0.159.0
- OpenTelemetry Collector `tail_sampling` processor
- Tail-sampling decision strategies and policies
- OTLP distributed traces and root-span identification
- YAML Collector configuration
- Decision caches and late-span handling
- OpenTelemetry Collector internal telemetry and Prometheus metric names
- Load-balancing and trace-ID affinity

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Tail Sampling Processor README, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md) — configuration options, sampling strategies, decision caches, late spans, capacity guidance, and tail-storage status.
- [Tail Sampling Processor configuration definitions, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go) — field names, types, accepted strategy values, cache behavior, trace-size limits, and sharding constraints.
- [Tail Sampling Processor defaults, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/factory.go) — default strategy, decision wait, trace capacity, and shard count.
- [Tail Sampling Processor implementation, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go) — one-second timer path, root detection, earlier-batch scheduling, span-ingest finalization, cache hits, late-span metrics, and live-entry release behavior.
- [Decision ID batcher, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/idbatcher/id_batcher.go) — bucket scheduling and move-only-if-earlier behavior.
- [Tail-sampling processor tests, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor_test.go) — root-triggered acceleration and late-span behavior.
- [Generated tail-sampling telemetry documentation, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md) and [telemetry metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/metadata.yaml) — exact metric names, units, types, attributes, and stability levels.
- [OpenTelemetry Trace API](https://opentelemetry.io/docs/specs/otel/trace/api/) — root and child semantics, new trace IDs for roots, and the rule that ending a span does not end its children.
- [OpenTelemetry Trace SDK](https://opentelemetry.io/docs/specs/otel/trace/sdk/) — `OnEnd`, batching span processors, queues, and export timing.
- [OTLP trace protobuf schema](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto) — `parent_span_id` representation and the empty-parent rule for roots.
- [Load-balancing exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/exporter/loadbalancingexporter/README.md) — trace-ID routing and rerouting when the backend set changes.
- [Collector Contrib v0.144.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.144.0) and [v0.149.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.149.0) — introduction of `decision_wait_after_root_received` and `sampling_strategy`, respectively.

## Issues Found

- The root-shape discussion incorrectly said a partial trace could make an internal child appear root-like. The processor does not infer roots from the set of received spans; it checks only whether the encoded `ParentSpanID` is empty. The post now states that an absent parent span does not erase a child's nonempty parent ID and that multiple zero-parent spans under one trace ID represent malformed or manually constructed telemetry.
- The `span-ingest` description used the imprecise phrase “positive or drop outcomes” and omitted cleanup's exact result. It now names the terminal `sampled` and `dropped` outcomes and states that unresolved traces are finalized as not sampled without policy re-evaluation.
- The late-span consistency wording was absolute. Decision caches are bounded, local LRUs, so a decision is inherited only while the live entry or cache entry remains on the same Collector instance. The post now documents cache eviction and the possibility of a new evaluation afterward.
- The capacity section implied that acceleration alone shortens live-entry residence. In the current implementation, decided entries are removed immediately when their outcome is stored in an enabled decision cache; without a cache, a decided live entry can remain while its span payload is cleared. The claim is now scoped to the caches configured in the example.

## Review Notes

- The complete example configuration was validated successfully with the released `otelcol-contrib` v0.159.0 binary. All field names, duration values, cache fields, policy types, status values, and thresholds are accepted and current.
- The conceptual deadline is accurate: the batcher retains the original first-observation schedule unless the root-triggered proposal is earlier. Scheduling uses one-second buckets and converts waits to whole seconds, so it is approximate; the example's `30s` and `4s` values are unaffected by sub-second truncation.
- The three metric names are exact. `sampling_late_span_age` records seconds for late spans handled through a live decided trace entry; cache hits increment `early_releases_from_cache_decision` and bypass that histogram; `sampling_traces_on_memory` is the total live-trace gauge. These component metrics currently have Development stability.
- `decision_wait_after_root_received` was introduced in v0.144.0 and explicit `sampling_strategy` in v0.149.0. Because the example sets `sampling_strategy`, the shown configuration requires Collector Contrib v0.149.0 or newer.
- `tail_storage` remains alpha behind `processor.tailsamplingprocessor.tailstorageextension`. `num_shards` greater than one is not supported together with `tail_storage`, although both settings remain independent of root-triggered timing.
- The title's “without truncating long traces” is conditional on sizing `decision_wait` and the root grace from the actual arrival distribution. As the body correctly warns, spans arriving after an accelerated decision can still be excluded from that policy evaluation.
- All four external documentation links in the post resolved to the intended official OpenTelemetry Collector Contrib files during review.
