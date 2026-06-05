# Validation Summary: How to Use OTTL to Truncate Long Attribute Values and Limit Log Body Size

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- Transform processor
- OTLP logs and traces
- YAML Collector configuration

## Sources Consulted
- OpenTelemetry Collector Contrib transform processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md
- OpenTelemetry Collector Contrib OTTL functions README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/ottlfuncs/README.md
- OpenTelemetry Collector Contrib OTTL README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/README.md
- OpenTelemetry Collector Contrib log context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottllog/README.md
- OpenTelemetry Collector Contrib span context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlspan/README.md
- OpenTelemetry Collector Contrib resource context docs: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/ottl/contexts/ottlresource/README.md
- OpenTelemetry Logs Data Model severity number specification: https://github.com/open-telemetry/opentelemetry-specification/blob/main/specification/logs/data-model.md
- Local validation with `otel/opentelemetry-collector-contrib:latest` / `otelcol-contrib version 0.153.0`

## Issues Found
- `truncate_all` was described as limiting characters. The official OTTL function documentation defines the limit as a maximum number of bytes, so the wording and comments were updated from characters to bytes.
- The selective truncation section was titled "Selective Truncation with limit_all", but the examples used `Substring` and did not use a `limit_all` function. The heading was corrected to "Selective Truncation with Substring".
- The log truncation metadata was set after mutating `body`, which meant `log.original_length` recorded the truncated length and `log.truncated` could be set for an exactly 4096-byte body. The marker and original length statements now run before truncation and use `Len(body) > 4096`.
- The stack trace truncation marker used `Len(...) >= 2048` after truncation, which could mark an exactly 2048-byte stack trace as truncated. The marker now runs before truncation and uses `Len(...) > 2048`.
- The `db.statement.removed` marker was set whenever `db.statement` was nil after deletion, including records where the attribute was already absent. It now sets the marker only when `db.statement` exists and exceeds the deletion threshold.

## Review Notes
- The current transform processor documentation for version 0.120.0 and later emphasizes prefixed paths such as `log.body` and `span.attributes`, while older context-grouped syntax like `context: log` with `body` and `attributes` remains supported. The post keeps the existing context-grouped style.
- `Substring` and `Len` operate on byte lengths in the Collector version validated here. All YAML snippets parsed successfully, and each snippet plus the full pipeline validated with `otelcol-contrib` 0.153.0.
