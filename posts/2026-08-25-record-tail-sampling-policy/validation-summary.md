# Validation Summary: How to Record Which OpenTelemetry Tail-Sampling Policy Kept Each Trace with `recordpolicy`

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- OpenTelemetry Collector Contrib
- Tail Sampling Processor
- Collector feature gates
- OTLP trace and instrumentation-scope attributes
- Prometheus and PromQL
- Kubernetes container arguments

## Sources Consulted

- [Tail Sampling Processor README and policy-tracking documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#tracking-sampling-policy)
- [Generated Tail Sampling Processor metrics and feature-gate documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Tail Sampling Processor configuration types and validation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Feature-gate hookup and default processor configuration](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/factory.go)
- [Top-level policy ordering, decision attribution, cache handling, and late-batch paths](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Decision-cache metadata type](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/cache/types.go)
- [Composite policy construction](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/composite_helper.go) and [composite subpolicy attribution implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/composite.go)
- [Instrumentation-scope attribute helper](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/util.go)
- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-releases/releases/tag/v0.159.0)
- [OpenTelemetry Collector feature-gate CLI syntax](https://github.com/open-telemetry/opentelemetry-collector/blob/main/featuregate/README.md#controlling-gates)
- [Prometheus `rate()` function](https://prometheus.io/docs/prometheus/latest/querying/functions/#rate) and [aggregation operators](https://prometheus.io/docs/prometheus/latest/querying/operators/#aggregation-operators)

## Issues Found

- The post originally implied that `tailsampling.composite_policy` always identifies a subpolicy belonging to the top-level policy credited in `tailsampling.policy`. With the default `sample_on_first_match: false`, each matching composite evaluator writes this scope attribute during evaluation, but the processor later credits the first sampled top-level policy. A later matching composite can therefore leave a composite marker beside an earlier non-composite top-level policy, and multiple matching composites can overwrite the marker. The interpretation and validation checklist now describe this overlap behavior and explain when the two keys form an unambiguous pair.
- The policy-order recommendation did not clearly distinguish user-configured non-drop ordering from the processor's automatic reordering of explicit drop policies. It now states that the processor moves drop policies to the front and that the user-controlled explanatory ordering applies among non-drop policies.
- The cache discussion did not state that decision-cache metadata preserves only the top-level policy name. It now explains that a cached late batch cannot restore `tailsampling.composite_policy`.
- The no-cache edge case described `num_traces` as a live structure, but it is the configured trace-capacity limit. The post now refers to the live in-memory trace map governed by that setting.

## Review Notes

The command, YAML fields, policy types, metric names, label names, and PromQL expressions are valid for OpenTelemetry Collector Contrib v0.159.0, the latest release available on the validation date. The feature gate remains alpha, and the generated per-policy and global metrics are marked Development. The current implementation stores attribution as instrumentation-scope attributes even though the upstream README describes them loosely as attributes on sampled spans. Cached sampled releases restore the top-level policy name when cache metadata contains it and add `tailsampling.cached_decision=true`; they do not restore a composite subpolicy name. For a named processor instance such as `tail_sampling/edge`, the per-policy metric's `policy` label is prefixed with the instance name, while the attribution value remains the configured policy name. Collector internal-telemetry settings or later metric translation can add Prometheus type suffixes such as `_total`, so deployments that override the default name-translation settings should adjust the example metric names accordingly.
