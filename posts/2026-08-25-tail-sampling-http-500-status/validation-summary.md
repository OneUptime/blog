# Validation Summary: Why an HTTP 500 Trace Can Miss a `status_code: ERROR` Tail-Sampling Policy

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered

- OpenTelemetry HTTP semantic conventions
- OpenTelemetry Trace API and OTLP span status
- OpenTelemetry Collector Contrib Tail Sampling Processor
- Tail-sampling `status_code` and `ottl_condition` policies
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector Transform Processor
- Trace-ID-aware Collector scaling and late-span decision caches

## Sources Consulted

- [OpenTelemetry Collector Contrib v0.159.0 release](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.159.0)
- [OpenTelemetry Collector Contrib v0.149.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.149.0)
- [OpenTelemetry Collector Contrib v0.153.0 release notes](https://github.com/open-telemetry/opentelemetry-collector-contrib/releases/tag/v0.153.0)
- [Tail Sampling Processor documentation for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/README.md)
- [Tail-sampling configuration source for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/config.go)
- [Tail-sampling status-code evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/status_code.go)
- [Tail-sampling all-span traversal helper](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/util.go)
- [Tail-sampling OTTL evaluator](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/internal/sampling/ottl.go)
- [Tail-sampling strategy and decision implementation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/processor.go)
- [Tail-sampling generated metric documentation](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/tailsamplingprocessor/documentation.md)
- [Transform Processor documentation for v0.159.0](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/processor/transformprocessor/README.md)
- [OTTL span context paths and enums](https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/v0.159.0/pkg/ottl/contexts/ottlspan/README.md)
- [OpenTelemetry HTTP span status conventions](https://opentelemetry.io/docs/specs/semconv/http/http-spans/#status)
- [OpenTelemetry HTTP attribute registry](https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/)
- [OpenTelemetry HTTP semantic-convention migration guide](https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/#summary-of-changes)
- [OpenTelemetry attribute requirement levels](https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/#conditionally-required)
- [OpenTelemetry Trace API status rules](https://opentelemetry.io/docs/specs/otel/trace/api/#set-status)
- [OTLP trace protocol definition](https://github.com/open-telemetry/opentelemetry-proto/blob/main/opentelemetry/proto/trace/v1/trace.proto)

## Issues Found

- The troubleshooting section referred to the late-span histogram as `sampling_late_span_age`, which is not its emitted Collector metric name. Changed it to `otelcol_processor_tail_sampling_sampling_late_span_age` so the named metric can be queried directly.
- The replica bullet said that the error span reaching another tail-sampling replica could make the marked error disappear. A replica that receives the error can sample its own fragment; the actual problem is that splitting one trace across replicas produces incomplete or inconsistent whole-trace decisions. Reworded the bullet accordingly.
- The `span-ingest` bullet implied that any early decision could cause the error to be missed. In this strategy, ordinary non-matches remain pending, while only `Sampled` and `Dropped` results finalize immediately. Narrowed the failure case to a terminal drop decision made before the error arrives.
- The instrumentation guidance referred broadly to “stable semantic conventions,” although the current HTTP Status subsection is marked Development even though the HTTP span conventions and `http.response.status_code` attribute are stable. Changed the wording to “current HTTP semantic conventions.”
- The two-field failure example could be read as a complete convention-compliant span even though HTTP spans contain other required fields and `error.type` is conditionally required when a request ends in error. Clarified that the example shows only the two fields relevant to this sampling decision.

## Review Notes

- Both exact OTTL expressions and their YAML nesting were parsed and validated with the current `otelcol-contrib` v0.159.0 binary. Behavioral checks confirmed that the tail policy matches integer status codes 500 through 599, and that the transform changes a matching span status to `ERROR`.
- `sampling_strategy` requires Collector Contrib v0.149.0 or newer. The path-context form used by the tail-sampling OTTL policy, such as `span.attributes[...]`, requires v0.153.0 or newer. Both are current in v0.159.0.
- The nil guard is effective because OTTL short-circuits `and`; `http.response.status_code` is defined as an integer by the semantic conventions.
- The article correctly warns that the transform can overwrite an explicit `OK` status. The Trace API's `Ok > Error > Unset` finality rule governs API calls, while a Collector transform mutates the serialized span after instrumentation.
- The two positive top-level policies in the shown configuration act as alternatives. An explicit top-level drop-style policy, if added elsewhere, would take precedence.
- All links in the post resolved to their intended official documentation or source pages during validation.
