# Validation Summary: How to Configure highlight.project_id and highlight.session_id Resource

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Highlight.io
- OpenTelemetry resource and span attributes
- OpenTelemetry Collector
- Python Flask
- Node.js Express
- Go HTTP middleware
- Highlight browser SDK

## Sources Consulted
- Highlight.io Native OpenTelemetry overview: https://www.highlight.io/docs/getting-started/native-opentelemetry/overview
- Highlight.io Native OpenTelemetry tracing: https://www.highlight.io/docs/getting-started/native-opentelemetry/tracing
- Highlight.io Native OpenTelemetry logging: https://www.highlight.io/docs/getting-started/native-opentelemetry/logging
- Highlight.io Fullstack Mapping: https://www.highlight.io/docs/getting-started/frontend-backend-mapping
- Highlight.io Client SDK API Reference: https://www.highlight.io/docs/sdk/client
- Highlight.io Recording Network Requests and Responses: https://www.highlight.io/docs/getting-started/browser/replay-configuration/recording-network-requests-and-responses
- OpenTelemetry Resource SDK specification: https://opentelemetry.io/docs/specs/otel/resource/sdk/
- OpenTelemetry resources concept documentation: https://opentelemetry.io/docs/concepts/resources/
- OpenTelemetry Protocol exporter specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- Go OpenTelemetry semconv package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/semconv

## Issues Found
- The frontend example implied `networkRecording.recordHeadersAndBody` automatically adds `x-highlight-request` to outgoing requests. Highlight's SDK documentation says `tracingOrigins` controls where the `X-Highlight-Request` header is attached, while `networkRecording` controls network request/response recording. Added `tracingOrigins: true` and corrected the comment.
- The collector example used the gRPC OTLP exporter with `otel.highlight.io:4317`. Highlight's Native OpenTelemetry documentation recommends OTLP HTTP with `endpoint: "https://otel.highlight.io"` and gzip compression for collector fan-out. Updated the exporter to `otlphttp/highlight` and adjusted the pipeline reference.
- The verification text only mentioned checking the browser header. Highlight's fullstack mapping troubleshooting also calls out `tracingOrigins`, `networkRecording`, and CORS for `x-highlight-request`, so the verification note now includes `tracingOrigins` and CORS.

## Review Notes
The middleware snippets are reasonable examples for adding Highlight context to the active request span, but production implementations should make sure OpenTelemetry framework instrumentation is initialized before the middleware runs and that cross-origin backends explicitly allow the `x-highlight-request` header.
