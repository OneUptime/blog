# Validation Summary: How to Use Conditional Routing with OTTL Statements to Send Error Traces to a

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry Collector
- OpenTelemetry Transformation Language (OTTL)
- OpenTelemetry Collector routing connector
- OpenTelemetry Collector transform processor
- OTLP gRPC and OTLP/HTTP
- YAML configuration

## Sources Consulted
- OpenTelemetry Collector routing connector README: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/connector/routingconnector
- OpenTelemetry OTTL span context documentation: https://pkg.go.dev/github.com/open-telemetry/opentelemetry-collector-contrib/pkg/ottl/contexts/ottlspan
- OpenTelemetry exception semantic conventions: https://opentelemetry.io/docs/specs/otel/trace/exceptions/
- OpenTelemetry error recording guidance: https://opentelemetry.io/docs/specs/semconv/general/recording-errors/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/

## Issues Found
- The routing rules used span-level fields without setting `context: span`. The routing connector defaults to resource context, so those expressions would not evaluate against span status or span attributes. Added `context: span` to each span-level routing rule.
- The status check used `attributes["otel.status_code"] == "ERROR"`, but the collector's OTTL span context exposes the actual OTLP span status as `span.status.code` and provides the `STATUS_CODE_ERROR` enum. Updated the examples to use `span.status.code == STATUS_CODE_ERROR`.
- The exception rule checked `attributes["exception.type"]`, but OpenTelemetry records exception details on exception events and current error guidance recommends the span-level `error.type` attribute for failed operations. Updated the rule to check `span.attributes["error.type"] != nil`.
- The curl test sent OTLP/HTTP data to port `4318`, but the receiver configuration only enabled OTLP/gRPC on `4317`. Added the OTLP/HTTP receiver endpoint on `0.0.0.0:4318`.
- The performance section claimed a specific benchmark result of less than 1 microsecond per span without an authoritative source. Rephrased it to a qualitative statement about the low overhead of simple status and attribute lookups.

## Review Notes
Validated the corrected collector configuration with `otel/opentelemetry-collector-contrib:latest validate --config=/dev/stdin`. The post still uses a placeholder-style title ending in "to a", but that is editorial rather than technical.
