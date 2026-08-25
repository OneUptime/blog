# Validation Summary: How to Drop Liveness and Readiness Traces Without Hiding Errors in Their Child Spans

## Status

validated

## Post Type

Technical configuration and operations guide

## Technologies Covered

- OpenTelemetry Collector Contrib 0.159.0
- Tail Sampling Processor
- `drop`, `not`, `string_attribute`, `status_code`, OTTL, and probabilistic policies
- OpenTelemetry HTTP semantic conventions
- OTLP span status and HTTP attributes
- Kubernetes liveness and readiness probes
- Tail-sampling decision caches, late spans, and trace-ID-aware scaling
- Collector internal telemetry and Prometheus metric names

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [Tail Sampling Processor documentation and policy decision flow](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#policy-decision-flow)
- [Tail-sampling strategies and timing controls](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#sampling-strategies)
- [Tail-sampling late-span, decision-cache, and scaling guidance](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md#late-arriving-spans)
- [Tail-sampling configuration types](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Drop evaluator AND behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/drop.go)
- [Not evaluator behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/not.go)
- [String-attribute evaluator and regex implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/string_tag_filter.go)
- [Status-code evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/status_code.go)
- [OTTL condition evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/ottl.go)
- [Final decision precedence, span-ingest evaluation, cache hits, and late-span implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Decision-batcher earlier-slot behavior](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/idbatcher/id_batcher.go)
- [Decision-cache LRU implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/cache/lru_cache.go)
- [Generated tail-sampling metric documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Collector Contrib v0.154.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.154.0)
- [OpenTelemetry HTTP span semantic conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/)
- [OpenTelemetry HTTP attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/)
- [OTLP trace protocol definition](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto)
- [Go `regexp.Regexp.MatchString` documentation](https://pkg.go.dev/regexp#Regexp.MatchString)

## Issues Found

- The route discussion treated a `string_attribute` match as though it identified the trace's entry route. The evaluator actually scans all resource and span attributes, so an ordinary trace with a downstream `/live` or `/ready` span could match the drop. Added the matcher-scope warning and recommended an entry-scoped OTTL predicate or a dedicated ingress attribute when downstream collisions are possible.
- `decision_wait_after_root_received` was described as an added grace period. It only accelerates a decision when its root-based slot is earlier than the original `decision_wait` slot; it never extends that original deadline. Corrected the timing guidance accordingly.
- The decision-cache sentence implied indefinite consistency. Both caches are bounded LRUs, so the guarantee lasts only while the trace ID remains cached. Added that qualification.
- The HTTP-attribute fallback suggested adding an OTTL condition without explaining where it must participate. A positive OTTL policy alone is still vetoed by `Dropped`, while changing only the nested predicate leaves the trace to the 5% baseline. Corrected the guidance to require the same failure predicate inside the negated drop condition and in a positive top-level retention policy, including for any retained 4xx readiness outcome.
- Four Collector metric names were abbreviated and could not be queried as written. Replaced them with the complete emitted names: `otelcol_processor_tail_sampling_global_count_traces_sampled`, `otelcol_processor_tail_sampling_count_traces_sampled`, `otelcol_processor_tail_sampling_sampling_late_span_age`, and `otelcol_processor_tail_sampling_early_releases_from_cache_decision`.
- The example did not state its minimum Collector version. Added that the complete configuration requires Collector Contrib v0.154.0 or later because that release added support for nesting `not` in the shared sub-policy type used by `drop_sub_policy`.

## Review Notes

- The exact YAML parses and validates with the official `otelcol-contrib` v0.159.0 configuration loader. The current Tail Sampling Processor test suite also passes.
- The core truth table is correct: the route and no-error sub-policies must both sample for the wrapper to return `Dropped`; any error makes the nested `not` return `NotSampled`; and the separate status policy then retains the error trace.
- `sampling_strategy` was introduced in v0.149.0, while the nested `not` used by this example requires v0.154.0. `decision_wait_after_root_received` was introduced in v0.144.0.
- The `status_code` evaluator checks `span.Status().Code()` across every received span and does not infer status from `http.response.status_code`. The post's 5xx and server-side 4xx guidance matches the current HTTP semantic conventions.
- HTTP server spans and `http.route` are Stable. The HTTP Status subsection is currently Development and specifies that 5xx spans SHOULD be marked as errors, which the post states accurately.
- The regex warning is accurate for v0.159.0 and current main: expressions are compiled unchanged and passed to Go's `MatchString`, despite an adjacent source comment claiming automatic anchoring.
- The four tail-sampling metrics named in the post currently have Development stability. With both decision caches enabled, decided trace state is normally removed immediately, so cache-served late spans may increment the cache counter while the live-entry late-age histogram remains empty.
- All five links in the post resolved to the intended official documentation or upstream source. Because the GitHub links target mutable `main`, the claims were also checked against the v0.159.0 release and upstream commit `af3c4bbb9f33cbf93ce955b906add999529484ca`.
