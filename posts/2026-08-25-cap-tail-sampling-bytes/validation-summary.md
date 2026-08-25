# Validation Summary: How to Cap Tail-Sampled Output by Bytes per Second

## Status

validated

## Post Type

Technical guide and configuration tutorial

## Technologies Covered

- OpenTelemetry Collector Contrib
- Tail Sampling Processor policies (`bytes_limiting`, `rate_limiting`, `drop`, `and`, and `composite`)
- OTLP protobuf sizing through the Collector pdata marshaler
- Go's `golang.org/x/time/rate` token-bucket limiter
- YAML Collector configuration
- Collector internal telemetry and feature gates

## Sources Consulted

- [Tail Sampling Processor documentation, including decision flow, sampling strategies, byte limiting, sharding, and late spans](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail Sampling Processor configuration types](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Tail Sampling Processor configuration schema](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.schema.yaml)
- [`bytes_limiting` implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/bytes_limiting.go)
- [Processor decision aggregation, late-span handling, decision caches, and trace-size accounting](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Shard rate and burst allocation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/sharded_processor.go)
- [`rate_limiting` and `composite` policy implementations](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/v0.159.0/processor/tailsamplingprocessor/internal/sampling)
- [Generated tail-sampling metrics and feature-gate documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Tail-sampling metric metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/metadata.yaml)
- [OpenTelemetry Collector `ptrace.ProtoMarshaler` implementation](https://github.com/open-telemetry/opentelemetry-collector/blob/main/pdata/ptrace/pb.go)
- [`golang.org/x/time/rate` token-bucket implementation](https://github.com/golang/time/blob/v0.15.0/rate/rate.go)
- [OpenTelemetry Collector Contrib v0.159.0 changelog](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/CHANGELOG.md)

## Issues Found

- The policy-decision explanation omitted the deprecated `InvertNotSampled` result, which takes precedence over a `Sampled` vote just as a hard `drop` result does. The sentence now states both precedence exceptions.
- The replica discussion described each replica as owning one bucket, but a sharded processor creates one bucket per shard for each configured byte-limiting policy. The wording now describes the per-policy, per-shard bucket ownership while preserving the correct fleet-rate calculation.
- The telemetry paragraph used abbreviated metric names and described the gated byte metric imprecisely. It now uses the emitted metric names, distinguishes Development metric stability from the alpha feature gate, notes that the gate is disabled by default, and explains that the byte metric is a per-policy `ResourceSpansSize()` counter rather than the limiter's exact `TracesSize()` charge or a final-egress counter.
- The load-test instruction now calls for direct `TracesSize()` measurement when validating the limiter's exact long-run byte charge instead of implying that the byte metric provides that value.

## Review Notes

- The YAML examples are syntactically valid, and all policy names, field names, nesting, durations, and byte values match Collector Contrib v0.159.0.
- Targeted upstream tests covering byte limiting, trace-size calculation, policy aggregation, late spans, rate limiting, and shard-rate division passed against current source.
- `maximum_trace_size_bytes` uses accumulated `ResourceSpansSize()` values, while `bytes_limiting` charges the complete `TracesSize()`. The post correctly treats the former as an independent early-drop bound rather than claiming that the two measurements are byte-for-byte identical.
- The combined feature set is version-sensitive: `bytes_limiting` arrived in v0.141.0, `maximum_trace_size_bytes` in v0.145.0, `sampling_strategy` in v0.149.0, rate-limiter burst support in v0.153.0, and `num_shards` in v0.159.0. The review used the current v0.159.0 release and current main source as of 2026-08-25.
