# Validation Summary: How to Instrument REST API Endpoints with OpenTelemetry for Latency, Error Rate,

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTelemetry JavaScript
- OpenTelemetry NodeSDK
- OpenTelemetry metrics and traces
- OTLP HTTP exporters
- Node.js
- Express
- TypeScript

## Sources Consulted
- OpenTelemetry JavaScript exporters documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry JavaScript documentation and status: https://opentelemetry.io/docs/languages/js/
- OpenTelemetry JavaScript NodeSDK README: https://github.com/open-telemetry/opentelemetry-js/blob/main/experimental/packages/opentelemetry-sdk-node/README.md
- OpenTelemetry HTTP metrics semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-metrics/
- OpenTelemetry HTTP semantic convention migration notes: https://opentelemetry.io/docs/specs/semconv/non-normative/http-migration/
- OpenTelemetry metrics SDK specification: https://opentelemetry.io/docs/specs/otel/metrics/sdk/

## Issues Found
- The custom `http.server.request.duration` histogram used milliseconds, but the current stable OpenTelemetry HTTP server duration metric uses seconds. Changed the histogram unit to `s`, recorded duration in seconds, and adjusted the production bucket-boundary note to refer to `0.2` seconds for a 200ms SLO target.
- The metric attributes used older HTTP semantic-convention names, `http.method` and `http.status_code`. Changed them to the current stable names, `http.request.method` and `http.response.status_code`.
- The route attribute fell back to `req.path`, which can introduce high-cardinality path values into `http.route`. Changed the fallback to `unknown` when Express route metadata is unavailable, while preserving low-cardinality route templates when available.
- The span attribute example accessed `req.user` directly, which is not present on Express' default TypeScript request type unless the application augments it. Changed the example to `(req as any).user?.tier` so the snippet remains syntactically valid in a generic Express TypeScript app.

## Review Notes
The OpenTelemetry NodeSDK setup, package names, OTLP HTTP endpoint paths, auto-instrumentation usage, `metrics.getMeter`, histogram and counter APIs, and `trace.getActiveSpan()` usage are consistent with current OpenTelemetry JavaScript documentation. The post does not pin package versions, so this review reflects the current OpenTelemetry JavaScript and semantic-convention guidance available on 2026-06-05.
