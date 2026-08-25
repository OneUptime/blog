# Validation Summary: How to Keep Probabilistic Sampling Deterministic Across Collectors by Pinning `hash_seed`

## Status
validated

## Post Type
Technical configuration guide

## Technologies Covered
- OpenTelemetry Collector and Collector Contrib v0.159.0
- `probabilistic_sampler` processor (`hash_seed`, `proportional`, and `equalizing` modes)
- `tail_sampling` processor and its probabilistic policy
- OTLP receiver and OTLP gRPC exporter configuration
- W3C Trace Context and OpenTelemetry probability sampling in `tracestate`
- YAML and distributed-tracing deployment configuration

## Sources Consulted
- [OpenTelemetry Collector configuration documentation](https://opentelemetry.io/docs/collector/configuration/)
- [OpenTelemetry Collector v0.159.0 OTLP gRPC exporter status](https://github.com/open-telemetry/opentelemetry-collector/blob/69c0873044e80fe1f0647a0bc5afec6244bcad76/exporter/otlpexporter/internal/metadata/generated_status.go#L11-L15) and [exporter configuration](https://github.com/open-telemetry/opentelemetry-collector/blob/69c0873044e80fe1f0647a0bc5afec6244bcad76/exporter/otlpexporter/config.go#L35-L39)
- [Collector Contrib v0.159.0 probabilistic sampler documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/probabilisticsamplerprocessor/README.md)
- [`probabilistic_sampler` configuration and defaults](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/probabilisticsamplerprocessor/config.go) and [factory defaults](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/probabilisticsamplerprocessor/factory.go)
- [Sampler-mode algorithms, 14-bit hash decision, and error-path ordering](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/probabilisticsamplerprocessor/sampler_mode.go) and [FNV-1a implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/probabilisticsamplerprocessor/fnvhasher.go)
- [Trace processing, `rv`/`th` handling, and `sampling.priority` overrides](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/probabilisticsamplerprocessor/tracesprocessor.go)
- [Tail-sampling probabilistic policy schema](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/config.go#L210-L219), [`hash_salt` default and decision implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/internal/sampling/probabilistic.go), and [tail-sampling documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/README.md)
- [`processor.tailsamplingprocessor.usetracestate` feature-gate metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/1120cc0714bf4d14600105e5673c3b00fe87467a/processor/tailsamplingprocessor/metadata.yaml#L45-L50)
- [OpenTelemetry TraceState probability-sampling specification](https://opentelemetry.io/docs/specs/otel/trace/tracestate-probability-sampling/) and [TraceState encoding rules](https://opentelemetry.io/docs/specs/otel/trace/tracestate-handling/)
- [W3C Trace Context Level 2](https://www.w3.org/TR/trace-context-2/)
- [Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)

## Issues Found
- The first YAML example referenced `otlp` receiver and exporter components without defining them, so it was not a valid standalone Collector configuration. It also used `otlp` as the exporter identifier even though that exporter type is a deprecated alias in v0.159.0. Added the receiver and exporter definitions, switched the exporter to the canonical `otlp_grpc` type, and supplied its required endpoint. The corrected configuration passes `otelcol-contrib v0.159.0 validate`.
- The determinism explanation described the final decision as depending only on the trace ID, percentage, and seed. A span-level `sampling.priority` attribute can override the probabilistic result, and sampling-related errors can take a different path. Changed the wording to describe the underlying hash decision and explicitly qualify the same-decision guarantee.
- The existing-`rv`/`th` and `fail_closed` wording was too absolute. At the demonstrated 10% rate, those fields enter the legacy hash error path, but rates that collapse to `neverSampler` do not reach that check; additionally, `sampling.priority` is applied after fail-closed/fail-open selection and can reverse it. Anchored the error claim to the demonstrated rate and documented the override ordering. Also clarified that a later stage does not apply its requested percentage on this error path.
- Saying that `hash_seed` did not provide the standard probability semantics was too broad. Current hash mode emits compatible `rv` and `th` state for normally kept spans. Reworded the distinction precisely: it does not consume incoming probability state and bases its decision on the legacy 14-bit FNV path rather than the standard 56-bit TraceID/R-value randomness.
- The tail-sampling feature gate was described only as belonging to the probabilistic policy. It also controls processor-wide outgoing threshold handling across sampled policy results. Clarified that the alpha gate is off by default and covers probability-`tracestate` handling, including the probabilistic policy.

## Review Notes
- The review was performed against the current released Collector/Collector Contrib v0.159.0 (released 2026-08-17) and Collector Contrib main commit `af3c4bbb9f33cbf93ce955b906add999529484ca` from 2026-08-24. The reviewed behavior is the same in both.
- The OpenTelemetry TraceState probability-sampling specification is currently marked Development. The tail-sampling `usetracestate` gate is alpha, off by default, and was introduced in v0.154.0, so the post's advice to pin and replay exact Collector versions remains important.
- The probability-aware modes calculate with 56-bit randomness, but the default `sampling_precision: 4` can round encoded thresholds beyond 16 significant bits.
- The example exporter endpoint is a placeholder and must be replaced with the deployment's real TLS-enabled downstream endpoint.
- All external links in the post were reachable and pointed to the intended official resources at review time.
