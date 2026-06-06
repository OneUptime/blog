# Validation Summary: How to Implement Custom Semantic Conventions for Your Domain

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- OpenTelemetry Semantic Conventions
- OpenTelemetry Python tracing API
- OpenTelemetry Python metrics API
- OpenTelemetry Collector transform processor
- OpenTelemetry Transformation Language (OTTL)
- YAML
- Mermaid

## Sources Consulted
- OpenTelemetry Semantic Conventions 1.41.1: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry semantic convention groups: https://opentelemetry.io/docs/specs/semconv/general/semantic-convention-groups/
- OpenTelemetry guidance for writing semantic conventions: https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Metrics API specification: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/processor/transformprocessor
- OTTL function documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs

## Issues Found
- The semantic convention YAML used relative attribute IDs with `prefix` and placed requirement levels directly on attribute definitions. Updated the example to define full attribute IDs in an `attribute_group` and reference them from a span convention where requirement levels apply.
- The versioning YAML used the same incorrect attribute-definition shape and an outdated stability comment. Updated it to use current stability terminology and a span attribute reference for the recommended currency attribute.
- The metrics example used `ecommerce.order.id` as a metric attribute, which creates high-cardinality metric streams. Removed the per-order ID from the metric attributes and updated the surrounding explanation to recommend trace/log IDs plus exemplar or backend correlation for metric-to-trace navigation.
- The metrics example passed attributes positionally and imported an unused `OrderStatus`. Updated calls to use `attributes=attributes` and removed the unused import.
- The order value histogram used `USD` as the unit. Updated it to `{USD}` to align with UCUM-style annotation syntax while keeping the example's intent.
- The Collector transform example used bare `attributes` paths in span context and an invalid `Concat` call for lowercasing. Updated it to use `span.attributes` and `ToLowerCase(...)`, and added `error_mode: ignore` as shown in current transform processor examples.
- Fixed a typo from `debugates` to `debugs`.

## Review Notes
Python snippets were syntax-checked with `ast.parse`, and YAML snippets were parsed with PyYAML after edits. The snippets remain illustrative because the blog intentionally omits application-specific functions such as `generate_order_id`, `validate_inventory`, and `reserve_payment`.
