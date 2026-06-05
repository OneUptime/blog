# Validation Summary: How to Chain Multi OTTL Statements in the Transform Processor for Complex

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OpenTelemetry HTTP semantic conventions
- Collector YAML configuration

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/ottl/ottlfuncs
- OpenTelemetry HTTP semantic conventions for spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic convention stability migration: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- `otel/opentelemetry-collector-contrib:latest validate` against a composed config containing the post's OTTL examples.

## Issues Found
- The HTTP examples used pre-stable semantic convention attributes `http.url` and `http.method`. Updated them to `url.full` and `http.request.method`, matching the current stable HTTP semantic conventions.
- The URL normalization example mutated the URL attribute and stored a derived path in `http.route`. Updated it to preserve `url.full`, save `url.full.original`, and write the derived low-cardinality value to `url.path.normalized` instead of treating a synthesized path as an HTTP route.
- The error status examples used numeric status code `2`. Updated them to the OTTL enum `STATUS_CODE_ERROR` for clarity and alignment with Collector examples.
- The multi-processor pipeline referenced `batch` without declaring it. Added a `batch:` processor declaration.
- The split-processor cleanup removed `url.full.original` without setting it in the parse step. Added the corresponding save operation.

## Review Notes
The OTTL snippets were validated with the current contrib Collector image after correction. The examples are still illustrative snippets, so the final service pipeline assumes matching `otlp` receiver and exporter definitions elsewhere in a complete Collector config.
