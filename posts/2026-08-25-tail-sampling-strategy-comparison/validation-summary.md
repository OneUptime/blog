# Validation Summary: OpenTelemetry `trace-complete` vs `span-ingest` Tail Sampling

## Status

validated

## Post Type

Technical guide and strategy comparison

## Technologies Covered

- OpenTelemetry Collector Contrib
- Tail Sampling processor
- `trace-complete` and `span-ingest` sampling strategies
- OTLP distributed tracing batches
- Tail-sampling policies and decision caches
- Pebble Tail Storage Extension
- YAML Collector configuration

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Tail Sampling processor documentation: configuration, sampling strategies, and late spans](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/README.md)
- [Tail Sampling configuration types and validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/config.go)
- [Tail Sampling factory defaults](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/factory.go)
- [Trace decision, cleanup, cache, and ingest implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/processor.go)
- [Sampling policy evaluator contract](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/pkg/samplingpolicy/samplingpolicy.go)
- [Built-in policy evaluator implementations](https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/internal/sampling)
- [Tail Sampling decision-path tests](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/processor_decisions_test.go)
- [Pebble Tail Storage Extension documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/extension/tailstorage/pebbletailstorageextension/README.md)
- [Pebble Tail Storage startup and storage implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/extension/tailstorage/pebbletailstorageextension/storage.go)

## Issues Found

No technical issues found.

## Review Notes

- The post was validated against the latest release, Collector Contrib v0.159.0 at commit `1120cc0714bf4d14600105e5673c3b00fe87467a`, and current `main` at commit `379901ca4e8da834d0fe2d669925ef6acd62d6c9`. The relevant implementation is unchanged between them.
- The upstream `go test ./...` suites passed in both the Tail Sampling processor module and the Pebble Tail Storage Extension module.
- Evaluator-reported statefulness is a compatibility check, not a guarantee that a policy proves a whole-trace fact. In the reviewed version, `composite` reports child statefulness even though it also maintains rate-allocation counters, while `not` can be accepted with a stateless child even when whole-trace absence is not yet provable. The post correctly addresses this distinction by requiring target-version validation and reordered, split-batch semantic replay.
- `span-ingest` behavior changed during its early development, so the post's warning to test the exact Collector release remains important.
