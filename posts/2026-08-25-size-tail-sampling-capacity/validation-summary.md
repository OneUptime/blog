# Validation Summary: How to Size OpenTelemetry Tail Sampling from Real Traffic

## Status

validated

## Post Type

Technical capacity-planning and configuration guide

## Technologies Covered

- OpenTelemetry Collector Contrib v0.159.0
- Tail Sampling processor and the default `trace-complete` strategy
- Tail-sampling decision windows and root-span decision acceleration
- Live-trace capacity, internal sharding, and overflow behavior
- Sampled and non-sampled LRU decision caches
- Tail-sampling internal telemetry
- Experimental tail-storage extensions
- YAML Collector configuration

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Official Collector Contrib v0.159.0 distribution](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.159.0)
- [Tail Sampling processor documentation and configuration reference](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail Sampling configuration structs and validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Tail Sampling defaults](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/factory.go)
- [Tail Sampling shard allocation and trace-ID routing](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/sharded_processor.go)
- [Tail Sampling trace lifecycle, overflow, cache, late-span, and size-limit implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Decision-cache LRU implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/cache/lru_cache.go)
- [No-op decision-cache implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/cache/nop_cache.go)
- [Decision timer's trace-ID batcher](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/idbatcher/id_batcher.go)
- [Generated Tail Sampling internal-telemetry reference](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Experimental tail-storage interface](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/tailstorageextension/tailstorageextension.go)

## Issues Found

- The guide did not scope its arrival-completeness model to the default `trace-complete` sampling strategy. Under `span-ingest`, policies evaluate incoming batches immediately and the wait settings govern pending cleanup or finalization instead. The introduction now states the strategy assumption.
- The rate-times-wait formula and example called the result total live-trace slots. With default no-op caches, decided trace records can remain live after their span bodies are released. The wording now identifies the result as the undecided trace-slot requirement.
- The capacity example referred ambiguously to a shard group even though `num_traces` is configured independently on each Collector replica. The example now states that the measured rate is for one replica.
- The sharding explanation omitted that both decision-cache sizes are divided across internal shards. The post now includes those caches and notes that per-shard skew can exhaust a shard's allocation before the aggregate configured capacity.
- The cache-retention explanation considered insertion rate but omitted LRU refreshes caused by cache hits. It now states that both insertions and hits affect effective remembrance time.
- The cache YAML could be mistaken for a standalone replacement of the preceding processor configuration, which would lose its 20-second wait and policies. It is now explicitly described as an addition to the preceding configuration.
- The no-op-cache lifecycle statement was too broad. It now includes `block_on_overflow: false`; the guide's introduction separately scopes the lifecycle model to the default `trace-complete` strategy.
- The metric guidance did not mention the blind spot after both live state and a cache entry are gone. The post now explains that such a late fragment is treated as a new trace and contributes to neither late-span signal.
- The `tail_storage` statement omitted its required feature gate and its incompatibility with `num_shards` greater than one. Both operational constraints are now stated.

## Review Notes

- The exact processor YAML, including both decision-cache sizes, was validated successfully in a complete traces pipeline with the official `otelcol-contrib` v0.159.0 binary.
- v0.159.0 is the latest released version as of the validation date. `num_shards` is new in that release; older Collector builds do not accept that field. The functionally relevant processor files also match current `main` as reviewed on 2026-08-25.
- All seven processor metrics named in the post exist in v0.159.0 and have Development stability. `early_releases_from_cache_decision` counts spans, while the late-age histogram records one observation per processed late trace fragment rather than weighting by span count.
- `maximum_trace_size_bytes` accumulates protobuf-serialized `ResourceSpans` sizes while a decision is still unspecified. It is a payload safety rail, not a direct Go heap or RSS cap, which is why the post correctly retains load-testing guidance.
- The four external documentation links in the post resolve to the intended official README, configuration source, generated telemetry reference, and processor implementation.
