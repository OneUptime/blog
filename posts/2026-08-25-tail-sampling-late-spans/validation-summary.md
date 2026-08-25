# Validation Summary: How to Keep Late-Arriving Spans from Splitting One Trace into Conflicting Sampling Decisions

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenTelemetry
- OpenTelemetry Collector Contrib
- Tail-sampling processor
- Tail-sampling decision caches
- Load-balancing exporter
- Distributed tracing and trace-ID routing
- Pebble tail-storage extension
- OpenTelemetry Collector internal telemetry and feature gates

## Sources Consulted

- [Tail-sampling processor README and late-arriving-span guidance](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/processor/tailsamplingprocessor/README.md#late-arriving-spans)
- [Tail-sampling processor configuration definitions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/processor/tailsamplingprocessor/config.go)
- [Tail-sampling processor implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/processor/tailsamplingprocessor/processor.go)
- [Tail-sampling LRU decision-cache implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/processor/tailsamplingprocessor/cache/lru_cache.go)
- [Tail-sampling telemetry and feature-gate metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/processor/tailsamplingprocessor/metadata.yaml)
- [Generated tail-sampling telemetry documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/processor/tailsamplingprocessor/documentation.md)
- [Load-balancing exporter documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/exporter/loadbalancingexporter/README.md)
- [Load-balancing exporter consistent-hashing implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/exporter/loadbalancingexporter/consistent_hashing.go)
- [Pebble tail-storage extension limitations](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/extension/tailstorage/pebbletailstorageextension/README.md#limitations)
- [Pebble tail-storage startup implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/379901ca4e8da834d0fe2d669925ef6acd62d6c9/extension/tailstorage/pebbletailstorageextension/storage.go)
- [OpenTelemetry tracing SDK sampling specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/sdk.md#sampling)

## Issues Found

- The no-cache late-span path was stated without a sampling-strategy qualifier. Re-evaluation after `decision_wait` describes the default `trace-complete` strategy; the newer `span-ingest` strategy evaluates incoming batches differently. Added the default-strategy qualifier.
- The rollout advice could imply that drain time preserves trace affinity after a backend membership change. A consistent-hash ring can remap a trace as soon as the endpoint set changes, so the text now says that draining alone cannot preserve affinity after the ring changes.
- The post described the feature-gated span-count telemetry as alpha. The `processor.tailsamplingprocessor.metricstatcountspanssampled` feature gate is alpha, while the emitted metric has development stability. Corrected the terminology.
- The Pebble extension was described as clearing its directory. It actually drops the existing trace data from its Pebble database at startup. Corrected the scope of that operation without changing the restart-durability conclusion.
- The cached-decision diagnostic enrichment was described as marking spans and retaining policy metadata generally. The implementation adds attributes to instrumentation scopes and restores only the cached top-level `tailsampling.policy` value when available. Corrected the description.

## Review Notes

The YAML processor fragment parses correctly, and its field names, policy types, values, and cache settings match the current Collector Contrib configuration. Both decision caches are independent LRUs and default to zero-sized no-op caches. The cache-sizing equations are appropriately presented as estimates because LRU hits affect recency and traffic rates can vary. The post also correctly uses the current `load_balancing` component spelling and exact `traceID` routing key; the older `loadbalancing` spelling remains only as a deprecated alias. Alpha feature-gated behavior and development-stability telemetry should be rechecked when upgrading Collector versions.
