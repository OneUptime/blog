# Validation Summary: Why Multiple Tail-Sampling Policies Do Not Behave Like a Simple OR—and How Drop Vetoes Work

## Status
validated

## Post Type
Technical guide / configuration reference

## Technologies Covered
- OpenTelemetry Collector Contrib v0.159.0
- OpenTelemetry Collector `tail_sampling` processor
- Tail-sampling policies and decision aggregation
- YAML processor configuration
- Prometheus / PromQL internal telemetry queries
- OTLP trace batching and late-arriving spans

## Sources Consulted
- [Tail Sampling Processor README, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md) — official policy decision flow, sampling strategies, configuration examples, metrics guidance, and policy tracking documentation.
- [Tail Sampling Processor configuration types, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go) and [generated configuration schema](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.schema.yaml) — authoritative field names and types for `sample_on_first_match`, `drop_sub_policy`, boolean attributes, status codes, latency, probabilistic sampling, nested policies, and sampling strategies.
- [Tail Sampling Processor implementation, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go) — top-level drop-policy reordering, final decision precedence, short-circuiting, `sample_on_first_match`, `span-ingest`, per-policy metrics, global metrics, and policy-attribution behavior.
- [Sampling-policy decision API, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/pkg/samplingpolicy/samplingpolicy.go) — definitions of `Sampled`, `NotSampled`, `Dropped`, and deprecated inverted decisions.
- [`drop` evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/drop.go), [`and` evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/and.go), and [`not` evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/not.go) — wrapper decision semantics.
- [`composite` evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/composite.go) and [composite policy construction](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/composite_helper.go) — ordered subpolicy evaluation and spans-per-second allocations.
- [Attribute-filter decision helpers, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/util.go) — current ordinary `Sampled` / `NotSampled` results for built-in `invert_match` policies.
- [Generated tail-sampling telemetry documentation, v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md) and [telemetry metadata](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/metadata.yaml) — exact metric names, labels, decision values, stability levels, and the `recordpolicy` feature gate.
- [OpenTelemetry Collector Contrib v0.155.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.155.0) — removal of the permanently enabled `processor.tailsamplingprocessor.disableinvertdecisions` feature gate.
- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0) — latest released version at the review date.

## Issues Found
1. **Outdated implication about `invert_match` decisions** — The post associated current `invert_match` behavior with deprecated `InvertSampled` / `InvertNotSampled` precedence. Since the old behavior became permanently disabled and its feature gate was removed, current built-in attribute policies return ordinary `Sampled` or `NotSampled`. The paragraph now distinguishes the deprecated compatibility decision types from current built-in behavior and still recommends explicit `not` or `drop` wrappers for clarity.
2. **`sample_on_first_match` was not scoped to its actual decision path** — The original text implied that the option controlled both sampling strategies. In v0.159.0 it is checked by the `trace-complete` evaluator; `span-ingest` uses a separate terminal/pending flow and does not consult the option. The section now says this explicitly. References to “early evaluation” were also changed to “early exit” / “policy-evaluation time” so they do not imply that the trace is evaluated before the normal trace-complete timer.
3. **Impossible current drop-veto metrics example** — The post said an error policy could record a sampled vote and then be vetoed by a top-level drop policy. Current loading moves every top-level drop policy before every non-drop policy, and a `Dropped` result stops evaluation immediately, so the later error policy records no vote for that trace. The paragraph now explains that the per-policy ratio covers only evaluations that actually occurred and directs readers to `otelcol_processor_tail_sampling_global_count_traces_sampled` for final decisions.
4. **Policy-attribution wording omitted the feature gate and exact attribute** — The original bullet referred generally to “`recordpolicy` attributes.” It now names the alpha `processor.tailsamplingprocessor.recordpolicy` feature gate and correctly states that `tailsampling.policy` identifies the first sampled top-level policy reached.
5. **Attribute-alternative advice was too broad** — A `boolean_attribute` policy accepts one `value`; the multi-value exact-match form is specifically `string_attribute.values`. The advice now names `string_attribute` rather than suggesting that all attribute policy types accept alternative exact values.
6. **Composite ordering was ambiguous** — The current runtime iterates `composite_sub_policy` entries in their listed order. The text now names that effective order directly rather than implying that any generic ordering field controls evaluation.

## Review Notes
- The YAML example matches the v0.159.0 schema. `ERROR` is a valid status code; `threshold_ms: 1500` is valid; integer `5` decodes correctly into `sampling_percentage`; and `drop.drop_sub_policy` is the correct singular field name for the subpolicy list.
- The stated non-deprecated trace-complete precedence is correct: `Dropped` wins, otherwise any `Sampled` wins, and otherwise the trace is not sampled. Top-level drop policies are stably moved ahead of non-drop policies, preserving order within each group.
- The `drop` subpolicy list is AND-like for the supported built-in policies, while multiple top-level drop policies act as independent vetoes. The `and`, `not`, and `composite` summaries and the trace-complete decision matrix are correct.
- The warning about `span-ingest` is important: it evaluates the current incoming batch without re-evaluating earlier batches, rejects evaluators reported as stateful, and finalizes unresolved traces as not sampled on cleanup. In particular, a nonmatching top-level drop remains pending because a future batch could match it, which blocks a positive ingest-time decision.
- Although `CompositeCfg` still exposes `policy_order`, the v0.159.0 construction and evaluator code use the order of `composite_sub_policy`. The corrected post describes the effective runtime behavior.
- Both tail-sampling decision counters discussed in the post have Development stability. `processor.tailsamplingprocessor.recordpolicy` remains an alpha feature gate and writes instrumentation-scope attributes when enabled.
- The review was pinned to the latest release, v0.159.0, and cross-checked against `main` on 2026-08-25; the relevant files matched. Older Collector versions can differ in drop ordering, inverted-decision behavior, and availability of `sampling_strategy`.
- All external links in the post were reachable and pointed to the intended official OpenTelemetry Collector Contrib files at review time.
