# Validation Summary: How to Write OTTL Statements That Conditionally Set span.status to ERROR Based

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OpenTelemetry trace span status
- OpenTelemetry HTTP semantic conventions
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector transforming telemetry documentation: https://opentelemetry.io/docs/collector/transforming-telemetry/
- OpenTelemetry trace API specification, span status: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP semantic conventions for spans: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP semantic conventions overview and migration guidance: https://opentelemetry.io/docs/specs/semconv/http/

## Issues Found
- The post used numeric span status values (`0`, `1`, `2`) throughout the OTTL examples. Current OpenTelemetry Collector examples use named OTTL enum constants such as `STATUS_CODE_OK`, and the transform processor supports enum constants for status fields. I changed the examples to use `STATUS_CODE_ERROR` and updated the explanatory list to show `STATUS_CODE_UNSET`, `STATUS_CODE_OK`, and `STATUS_CODE_ERROR`.
- Several examples set `status.message` for HTTP status-code-derived errors. The OpenTelemetry HTTP semantic conventions say not to set the span status description when the reason can be inferred from `http.response.status_code`, and the trace API specification says descriptions are only for error status. I removed the status message statements from the examples.
- The full Collector configuration set `STATUS_CODE_OK` behavior for 2xx spans. OpenTelemetry HTTP semantic conventions say HTTP 1xx, 2xx, and 3xx spans should generally be left unset unless another error occurred. I removed the 2xx `OK` transform from the full configuration.

## Review Notes
The remaining examples are technically valid for current transform processor advanced configuration using `context: span` and span-context paths such as `attributes` and `status.code`. The post correctly notes the migration from legacy `http.status_code` to the current `http.response.status_code`; keeping both checks is reasonable during semantic-convention migrations.
