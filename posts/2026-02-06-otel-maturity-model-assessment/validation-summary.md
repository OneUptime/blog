# Validation Summary: How to Create an OpenTelemetry Maturity Model Assessment for Your Organization

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry
- OpenTelemetry semantic conventions
- OpenTelemetry logs, traces, metrics, exemplars, and sampling
- Jaeger-compatible trace query API
- Python
- YAML

## Sources Consulted
- OpenTelemetry service resource semantic conventions: https://opentelemetry.io/docs/specs/semconv/resource/service/
- OpenTelemetry resources documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry semantic convention naming guidance: https://opentelemetry.io/docs/specs/semconv/general/naming/
- OpenTelemetry logs specification, log correlation: https://opentelemetry.io/docs/specs/otel/logs/
- OpenTelemetry trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- Jaeger APIs documentation: https://www.jaegertracing.io/docs/1.76/architecture/apis/

## Issues Found
- The post used `deployment.environment`, but current OpenTelemetry resource documentation uses `deployment.environment.name`. Updated the rubric and Python checks to use `deployment.environment.name`.
- The rubric and Python example used `service.team` as a resource attribute. OpenTelemetry naming guidance recommends not using an existing semantic convention namespace such as `service.*` for company- or application-specific custom attributes. Updated the example to use an organization-specific attribute, `com.example.team.name`.
- The Python example described a generic backend, but its `/api/traces` response parsing is Jaeger-compatible JSON. Updated the script description to make the Jaeger-compatible backend assumption explicit.
- The custom span detection comment implied broad auto-instrumented span naming behavior that is not generally guaranteed by OpenTelemetry. Updated the comment to frame the check as an organization-specific `<domain>.<operation>` convention.

## Review Notes
- The Python snippet was extracted from the Markdown and checked with `python3 -m py_compile`; it is syntactically valid.
- Jaeger documents its HTTP JSON query API as internal and intentionally undocumented, and recommends gRPC/Protobuf for programmatic trace retrieval. The example is acceptable as a simple Jaeger-compatible self-assessment script, but production tooling should prefer a stable API or vendor-supported query interface.
