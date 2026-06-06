# Validation Summary: How to Build Centralized Audit Logging for API Access

## Status
validated

## Post Type
Guide

## Technologies Covered
- OpenTelemetry Go tracing API
- OpenTelemetry Collector
- Collector filter, resource, batch, and OTLP exporters
- OTLP gRPC and OTLP HTTP
- SQL queries over stored span attributes

## Sources Consulted
- OpenTelemetry Go instrumentation documentation: https://opentelemetry.io/docs/languages/go/instrumentation/
- OpenTelemetry Tracing API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- OpenTelemetry Collector filter processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/filterprocessor/README.md
- OpenTelemetry Collector groupbytrace processor README: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/groupbytraceprocessor/README.md
- OpenTelemetry Collector OTLP HTTP exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlphttpexporter/README.md
- OpenTelemetry Collector OTLP gRPC exporter README: https://github.com/open-telemetry/opentelemetry-collector/blob/main/exporter/otlpexporter/README.md

## Issues Found
- The Collector filter processor example used older include-style span matching. Current filter processor documentation uses OTTL conditions that drop matching telemetry, so I changed the audit pipeline to drop spans where `span.attributes["audit.actor.id"] == nil`.
- The Collector snippet used `otlphttp/audit`, which current Collector documentation marks as a deprecated alias. I changed it to `otlp_http/audit`.
- The Collector snippet used `otlp/oneuptime` for the gRPC exporter. Current Collector documentation identifies the component as the OTLP gRPC exporter and uses `otlp_grpc`, so I changed the exporter and pipeline reference to `otlp_grpc/oneuptime`.
- The `groupbytrace` processor was configured but not used in any pipeline, and the comment implied complete request context even though the pipeline only exports audit spans. I removed the unused processor block from the example.
- The SQL query for admin actions compared `audit.is_admin_action` to the string `'true'`, but the Go middleware records it with `attribute.Bool`. I changed the comparison to the boolean literal `true`.

## Review Notes
- The Go middleware uses placeholder helper functions such as `GetAuthIdentity`, `ExtractClientIP`, and `NewResponseCapture`; these are application-specific and would need implementations in a real service.
- Custom `audit.*` attributes are acceptable for application-specific data, but teams should document them internally and avoid high-cardinality or sensitive values.
