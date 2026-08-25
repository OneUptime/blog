# Validation Summary: Enforce Per-Service Trace Budgets with Composite Tail Sampling

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- OpenTelemetry
- OpenTelemetry Collector Contrib
- Tail Sampling Processor
- Composite sampling policies
- Span-per-second rate allocation
- Collector sharding and replica-aware capacity planning
- OpenTelemetry Collector feature gates and internal telemetry

## Sources Consulted

- [OpenTelemetry Collector v0.159.0 official release](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.159.0)
- [Tail Sampling Processor documentation for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail Sampling Processor configuration structs for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go) and [generated configuration schema](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.schema.yaml)
- [Composite allocation helper in v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/composite_helper.go) and [the v0.158.0 helper](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.158.0/processor/tailsamplingprocessor/composite_helper.go) for the version comparison
- [Composite evaluator and decision-time span accounting](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/composite.go) and [its Unix-second clock](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/time_provider.go)
- [Tail-sampling decision, late-span, and policy aggregation paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Sharded processor and per-shard rate division](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/sharded_processor.go)
- [String-attribute policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/string_tag_filter.go) and [resource/span traversal helpers](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/util.go)
- [Tail Sampling Processor feature-gate and metric metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/metadata.yaml) and [generated telemetry documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [OpenTelemetry service resource semantic conventions](https://opentelemetry.io/docs/specs/semconv/resource/service/)

## Issues Found

- The post described the limit as unqualified whole-trace charging and an aggregate sampled-span ceiling. The composite evaluator charges only the spans accumulated when the decision runs. Late spans that inherit a retained or cached sampled decision are forwarded without another composite evaluation or counter increment. The description, introduction, allocation explanation, whole-trace section, observability guidance, and conclusion now consistently state that charging occurs at decision time and that late spans can make exported throughput exceed the configured rate.
- The equal-share behavior for omitted, zero, or negative allocations was described only as “current.” That behavior was introduced in v0.159.0; releases through v0.158.0 left an omitted subpolicy with zero capacity. The text now pins this behavior to v0.159.0 and records the earlier behavior.
- The aggregate-ceiling statement implicitly required unique subpolicy names and one allocation per subpolicy. Because the helper keys allocations by name while the evaluator maintains a separate counter for every subpolicy entry, duplicate names can invalidate that reasoning. The guidance now explicitly requires uniquely named subpolicies and one allocation for each.
- The text said counters reset at the start of a Unix second. They actually reset when the first composite evaluation observes that the Unix second has changed. The wording now reflects the implementation precisely.
- The giant-trace guidance could imply that a standalone `span_count` policy is a hard exclusion. It is an ordinary positive sampling policy and can bypass a composite rejection. The post now directs hard span-count exclusions to a `span_count` matcher inside a top-level `drop` policy and distinguishes this from the early byte-size drop provided by `maximum_trace_size_bytes`.
- The policy-attribution paragraph did not identify that `tailsampling.composite_policy` is written to instrumentation-scope attributes only for batches present during the accepting evaluation, and it could imply that the gated span metric represents final exporter output. The paragraph now documents the attribute location, late-span limitation, exact span-metric feature gate, and per-policy evaluation semantics.

## Review Notes

- The YAML example parses successfully, uses current v0.159.0 field names and policy types, and its allocations total 100%.
- The configuration uses `trace-complete`, which is the correct strategy for evaluating the accumulated trace data available at decision time. No deprecated configuration fields or policy types are used.
- Replica scaling, sharded integer rate division, first-match classification, non-fallthrough on allocation exhaustion, top-level `drop` precedence, and top-level positive-policy bypass behavior all match v0.159.0 source.
- The alpha feature-gate names `processor.tailsamplingprocessor.recordpolicy` and `processor.tailsamplingprocessor.metricstatcountspanssampled` are correct as of v0.159.0.
- All external links in the post returned HTTP 200 during validation and pointed to the intended official files.
- The implementation-specific claims were also checked against Collector Contrib `main` at commit `af3c4bbb9f33cbf93ce955b906add999529484ca` from 2026-08-24; no relevant behavior differed from v0.159.0. Because the post links to mutable `main` files, these details should be rechecked on future Collector upgrades.
