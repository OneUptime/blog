# Validation Summary: How to Protect the OpenTelemetry Collector from Giant Traces with `maximum_trace_size_bytes`

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenTelemetry Collector Contrib
- Tail Sampling Processor
- OTLP protobuf trace data and `ptrace.ProtoMarshaler`
- Tail-sampling decision caches and sampling strategies
- Prometheus and PromQL monitoring
- Experimental tail-storage extensions

## Sources Consulted

- [Tail Sampling Processor documentation (Collector Contrib v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [`maximum_trace_size_bytes` and sampling configuration definition (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Trace-size accounting, guard, decision, and cache implementation (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Per-`ResourceSpans` trace splitting and shard ingestion (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/sharded_processor.go)
- [Tail Sampling Processor internal telemetry reference (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [`bytes_limiting` token-bucket policy implementation (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/bytes_limiting.go)
- [Pebble tail-storage extension documentation (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/extension/tailstorage/pebbletailstorageextension/README.md)
- [Collector default internal-telemetry configuration (v0.159.0)](https://github.com/open-telemetry/opentelemetry-collector/blob/v0.159.0/service/telemetry/otelconftelemetry/factory.go)
- [Collector internal telemetry documentation](https://opentelemetry.io/docs/collector/internal-telemetry/)
- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.159.0)

## Issues Found

No technical issues found.

## Review Notes

- The review was performed against Collector Contrib v0.159.0, the latest official release on the validation date, and the relevant files on the current `main` branch. The implementations matched for the behavior discussed in the post.
- `maximum_trace_size_bytes` was introduced in v0.145.0, and the complete YAML example requires v0.149.0 or later because it explicitly sets `sampling_strategy`. The optional `tail_storage` and sampled-byte metric discussions refer to alpha features introduced in v0.150.0 and v0.152.0, respectively.
- The sampled-byte feature gate and the processor metrics discussed in the post are not stable APIs and may change between Collector releases.
- The PromQL expression uses the correct unsuffixed metric name for the Collector's default internal Prometheus reader. A manually configured reader with `without_type_suffix: false` exposes the counter with a `_total` suffix instead.
- The upstream configuration and large-trace guard tests passed, including the strict threshold, early-drop metric, and runtime maximum-size update cases.
