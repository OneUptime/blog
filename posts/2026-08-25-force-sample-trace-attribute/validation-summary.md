# Validation Summary: How to Force-Sample One OpenTelemetry Trace with an Attribute While Preserving a Hard Do-Not-Sample Rule

## Status

validated

## Post Type

Technical configuration and operations guide

## Technologies Covered

- OpenTelemetry Collector Contrib 0.159.0
- Tail Sampling Processor
- Boolean attribute, drop, status-code, and probabilistic tail-sampling policies
- Tail-sampling decision caches and late-arriving spans
- Load Balancing Exporter with trace-ID routing
- Probabilistic Sampling Processor
- OpenTelemetry SDK head sampling and OTLP trace export
- Telemetry data governance and redaction

## Sources Consulted

- [OpenTelemetry Collector Contrib 0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Tail Sampling Processor documentation and policy decision flow](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#policy-decision-flow)
- [Tail-sampling practical force-sample and do-not-sample example](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#a-practical-example)
- [Tail-sampling late-arriving span behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#late-arriving-spans)
- [Tail-sampling scaling and trace-affinity guidance](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#scaling-collectors-with-the-tail-sampling-processor)
- [Tail-sampling configuration schema](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.schema.yaml#L426-L472)
- [Tail-sampling policy and configuration types](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go#L20-L70)
- [Tail-sampling defaults](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/factory.go#L29-L36)
- [Drop-first policy loading and final decision implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go#L226-L273)
- [Tail-sampling policy evaluation and precedence implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go#L775-L866)
- [Boolean attribute evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/boolean_tag_filter.go#L37-L76)
- [Drop policy evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/drop.go#L31-L46)
- [Not policy evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/not.go#L30-L48)
- [Sampling decision definitions](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/pkg/samplingpolicy/samplingpolicy.go#L25-L53)
- [Probabilistic Sampling Processor sampling-priority behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/probabilisticsamplerprocessor/README.md#sampling-priority)
- [Load Balancing Exporter trace-ID routing](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/exporter/loadbalancingexporter/README.md)
- [OpenTelemetry trace SDK sampling specification](https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/trace/sdk.md#sampling)
- [OpenTelemetry guidance for handling sensitive data](https://opentelemetry.io/docs/security/handling-sensitive-data/)
- [OpenTelemetry Collector architecture and pipeline behavior](https://opentelemetry.io/docs/collector/architecture/)

## Issues Found

- The late-span explanation implied that a decision cache was generally responsible for preserving an already sampled outcome. Decision caches are disabled by default, and late spans first inherit a decision while it remains in the processor's in-memory trace state. The post now distinguishes that behavior from a configured `decision_cache.sampled_cache_size`, which preserves a sampled decision after the trace state is evicted.
- The sensitive-data guidance implied that redaction in an earlier Collector processor could keep raw data out of Collector memory. Because Collector processing occurs after reception and deserialization, that guarantee is available only when redaction happens at instrumentation. The post now recommends instrumentation-time redaction for that guarantee and otherwise calls for the earliest processor in every applicable pipeline to minimize exposure.

## Review Notes

- The YAML is valid for OpenTelemetry Collector Contrib 0.159.0. The `trace-complete` strategy, `decision_wait`, `sample_on_first_match`, all four top-level policies, and the nested boolean `drop_sub_policy` use current, non-deprecated configuration fields. The explicit `sampling_strategy` field requires Collector Contrib 0.149.0 or newer.
- Current policy loading places top-level drop policies before ordinary policies. A matching drop returns `Dropped`, evaluation short-circuits, and the final decision gives `Dropped` precedence over `Sampled`. Ordinary `NotSampled` votes remain soft, as the post states.
- The boolean evaluator searches resource and span attributes and uses any-match semantics. A boolean `true` matches, while the string `"true"` does not match the configured true value.
- `sample_on_first_match: false` permits later policies to record vote metrics when no drop policy has already short-circuited evaluation. Per-policy metrics are votes, so inspecting final exporter output remains necessary.
- The referenced upstream practical example has a documentation typo in its do-not-sample subpolicy, but the blog's own `boolean_attribute` block is correct according to the schema and implementation.
- The post's four external links resolved successfully to the intended upstream documentation and source files. Because they target the mutable `main` branch, implementation claims were also checked against the current v0.159.0 release and upstream commit `af3c4bbb9f33cbf93ce955b906add999529484ca`.
- The exact YAML snippet loaded successfully through the Tail Sampling Processor factory. Focused execution tests confirmed force-only sampling, hard-drop-only rejection, and hard-drop precedence when both attributes are true; processor lifecycle checks also passed. The upstream test suites for the Tail Sampling Processor and Probabilistic Sampling Processor passed during validation.
- Attribute provenance is not encoded in an attribute key itself. A deployment must enforce trust through authenticated or isolated ingress, or strip an untrusted key before a trusted component sets it.
