# Validation Summary: How to Replace Deprecated `invert_match` Tail-Sampling Rules with `drop` and `not` Policies

## Status

validated

## Post Type

Technical migration guide

## Technologies Covered

- OpenTelemetry Collector Contrib
- Tail Sampling Processor
- YAML configuration
- OpenTelemetry Transformation Language (OTTL)
- Collector internal telemetry metrics

## Sources Consulted

- [Tail Sampling Processor README: policy decision flow, sampling strategies, monitoring, and late spans](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail Sampling Processor configuration types](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [`not` policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/not.go)
- [`drop` policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/drop.go)
- [String attribute matcher implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/string_tag_filter.go)
- [Resource/span matching helpers](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/util.go)
- [Status-code policy implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/status_code.go)
- [Top-level policy loading and final decision aggregation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Generated Tail Sampling Processor telemetry documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Tail Sampling Processor feature-gate metadata in v0.152.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.152.0/processor/tailsamplingprocessor/metadata.yaml)
- [Collector Contrib v0.145.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.145.0)
- [Collector Contrib v0.154.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.154.0)

## Issues Found

- The post used shortened telemetry identifiers, `count_traces_sampled` and `global_count_traces_sampled`, rather than the emitted metric names. They were changed to `otelcol_processor_tail_sampling_count_traces_sampled` and `otelcol_processor_tail_sampling_global_count_traces_sampled`; the per-policy metric's complete attribute set was also stated.
- The hard-exclusion introduction said health traces would “never leave this processor.” That was narrower than the operational behavior because, after decision state expires, a very late span can be treated as a new partial trace when decision caching is not configured. The sentence now accurately scopes the guarantee to vetoing every keep policy in the same sampling decision.
- The error-exception example described only child-span errors, but the `status_code` policy matches an `ERROR` status on any span, including the root. The wording now refers precisely to any span with `ERROR` status.
- The nested `drop`/`not` example only removes the hard-drop veto when an error is present; it does not itself produce a sampled vote. The text now explicitly tells readers to retain the separate top-level `errors` policy shown earlier.
- The decision-timing warning was broadened from the error example to all trace-wide absence tests and now names the exact `sampling_strategy: trace-complete` and `decision_wait` settings. This matters because `span-ingest` evaluates individual incoming batches and can make a terminal sampled decision before a later batch supplies the attribute or error being tested for absence.

## Review Notes

The YAML nesting and field names for `not`, `drop`, string attributes, status codes, and probabilistic sampling are valid in Collector Contrib v0.159.0. The `drop_sub_policy` list has AND behavior, top-level drop policies are evaluated before ordinary policies, and a `Dropped` decision takes precedence over a sampled vote. The missing-key and any-span matching explanations are correct. The `invert_match` configuration field remains available; the deprecated items are the inversion-specific decision values. Top-level `not` requires Collector Contrib v0.145.0 or later, and nesting `not` under `drop` or `and` requires v0.154.0 or later. The generated tail-sampling metrics are marked Development stability. Very late spans may be evaluated as a new partial trace after in-memory decision state is gone unless an appropriately sized decision cache retains the prior result. The post's links target mutable `main`; pinning them to the deployed Collector release would improve long-term reproducibility.
