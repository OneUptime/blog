# Validation Summary: How to Write OTTL Statements That Add Computed Attributes Based

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform Processor
- OTLP trace/span fields
- OpenTelemetry HTTP semantic conventions

## Sources Consulted
- OpenTelemetry Collector Contrib Transform Processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OTTL span context path documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OTTL language grammar documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/LANGUAGE.md
- OTTL functions documentation for Concat and IsMatch: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/ottlfuncs
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/

## Issues Found
- The post stated that span duration is accessible through a `duration` field. Current OTTL span context documentation does not list a direct `duration` path, so I changed the examples to compute elapsed nanoseconds with `span.end_time_unix_nano - span.start_time_unix_nano`.
- The OTTL statements used unprefixed span paths such as `attributes`, `status.code`, `kind`, and `name`. Current Transform Processor and span context docs use context-prefixed paths, so I updated examples to use `span.attributes`, `span.status.code`, `span.kind`, and `span.name`.
- The examples compared status and span kind fields to raw integer values. OTTL span context docs expose enum symbols such as `STATUS_CODE_ERROR` and `SPAN_KIND_SERVER`, so I updated those comparisons to use the documented enum names.
- The examples used the older HTTP method attribute `http.method`. Current stable HTTP semantic conventions use `http.request.method`, so I updated the affected computed endpoint and grouping examples.

## Review Notes
The examples assume incoming telemetry contains route, status code, and exception attributes with the shown names. That is reasonable for a transform tutorial, but actual availability depends on the instrumentation library and semantic convention version used by the application.
