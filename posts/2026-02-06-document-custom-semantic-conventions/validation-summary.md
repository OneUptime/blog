# Validation Summary: How to Document Custom Semantic Conventions for Your Business Domain

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry semantic conventions
- OpenTelemetry semantic convention YAML registry format
- OpenTelemetry Python tracing API
- OpenTelemetry Go tracing API
- YAML

## Sources Consulted
- OpenTelemetry semantic conventions overview: https://opentelemetry.io/docs/specs/semconv/
- OpenTelemetry semantic convention groups: https://opentelemetry.io/docs/specs/semconv/general/semantic-convention-groups/
- OpenTelemetry attribute requirement levels: https://opentelemetry.io/docs/specs/semconv/general/attribute-requirement-level/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry "How to write semantic conventions": https://opentelemetry.io/docs/specs/semconv/how-to-write-conventions/
- OpenTelemetry Weaver semantic convention definition language: https://github.com/open-telemetry/weaver/blob/main/schemas/semconv-syntax.md
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Python manual instrumentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry Go manual instrumentation: https://opentelemetry.io/docs/languages/go/instrumentation/

## Issues Found
- The YAML example used a loose `group`/`prefix` shape instead of the current semantic convention registry structure. I changed it to use top-level `groups`, `id`, `type: attribute_group`, and nested `attributes`, matching the current semantic convention definition language.
- Attribute definitions omitted `stability`, which the semantic convention definition language requires for attributes. I added `stability: development` to the example attributes and enum members.
- The `order.status` attribute described allowed values in a note while keeping `type: string`. I changed it to an enum-style `type` with `members`, which is the documented way to define enumerated attribute values.
- The article listed `Optional` as an upstream requirement level. Current OpenTelemetry semantic conventions use `Opt-In` / `opt_in`, so I updated the prose accordingly.
- The `order.total_amount` note said to use the "smallest common denomination" while giving dollars instead of cents as the example. I changed this to "major currency unit" to make the guidance internally consistent.
- The deprecation policy said to remove old attributes from the convention document after 90 days. OpenTelemetry guidance says semantic convention names should generally remain documented and be marked deprecated, so I changed the policy to keep deprecated attributes documented for legacy telemetry.

## Review Notes
The Python and Go tracing examples use current OpenTelemetry APIs for starting spans, setting attributes, recording errors, and setting error status. The examples are illustrative snippets and assume surrounding application types and imports such as `Order`, `Cart`, `User`, `context`, `attribute`, and `codes`.
