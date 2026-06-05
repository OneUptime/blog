# Validation Summary: How to Send OpenTelemetry Traces and Logs to Highlight.io via Their OTLP

## Status
validated

## Post Type
Tutorial / Integration guide

## Technologies Covered
- Highlight.io
- OpenTelemetry Protocol (OTLP)
- OpenTelemetry Python SDK and OTLP exporters
- OpenTelemetry Go SDK and OTLP gRPC trace exporter
- OpenTelemetry JavaScript / Node.js SDK and OTLP exporters
- Flask request header handling

## Sources Consulted
- Highlight.io OpenTelemetry Protocol (OTLP) documentation: https://highlight.io/docs/getting-started/server/otlp
- Highlight.io Native OpenTelemetry overview: https://www.highlight.io/docs/getting-started/native-opentelemetry/overview
- Highlight.io Native OpenTelemetry tracing documentation: https://docs.highlight.io/docs/getting-started/native-opentelemetry/tracing
- Highlight.io Native OpenTelemetry logging documentation: https://docs.highlight.io/docs/getting-started/native-opentelemetry/logging
- Highlight.io Fullstack Mapping documentation: https://www.highlight.io/docs/getting-started/frontend-backend-mapping
- Highlight.io curl / OTLP HTTPS log ingestion documentation: https://highlight.io/docs/getting-started/server/http
- OpenTelemetry OTLP exporter configuration specification: https://opentelemetry.io/docs/specs/otel/protocol/exporter/
- OpenTelemetry Python OTLP exporter documentation: https://opentelemetry-python.readthedocs.io/en/stable/exporter/otlp/otlp.html
- OpenTelemetry Python instrumentation documentation: https://opentelemetry.io/docs/languages/python/instrumentation/
- OpenTelemetry JavaScript exporter documentation: https://opentelemetry.io/docs/languages/js/exporters/
- OpenTelemetry Go otlptracegrpc package documentation: https://pkg.go.dev/go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
- OpenTelemetry JavaScript SDK 2.0 announcement and migration notes: https://opentelemetry.io/blog/2025/otel-js-sdk-2-0/

## Issues Found
- The endpoint list only showed the HTTP base URL. Updated it to include the documented per-signal HTTP paths for traces and logs, and clarified the secure gRPC endpoint form.
- The post said authentication is done through resource attributes rather than headers. Highlight's docs show `highlight.project_id` can be supplied as a resource attribute or, in some implementations, via `x-highlight-project`; updated the text to describe project routing through resource attributes without excluding headers.
- The Python gRPC exporters used `otel.highlight.io:4317` without a scheme. Updated the endpoints to `https://otel.highlight.io:4317` so the secure connection is explicit and consistent with OTLP exporter configuration.
- The Go example imported `log` but never used it, which would fail compilation. Removed the unused import.
- The Go gRPC exporter used `WithEndpoint` with a host:port string. Updated it to `WithEndpointURL("https://otel.highlight.io:4317")` so TLS endpoint semantics are explicit.
- The Node.js example used `new Resource(...)` and `provider.addSpanProcessor(...)`, which are not current OpenTelemetry JS SDK 2.x patterns. Updated it to use `NodeSDK`, `resourceFromAttributes`, and the Highlight-documented OTLP HTTP trace endpoint.
- The frontend linking text named a `highlight.session_id` header, but Highlight documents the frontend-to-backend header as `x-highlight-request`, encoded as `sessionId/requestId`. Updated the wording while keeping the parsing example intact.
- The Python error example referenced `trace.Status` and `trace.StatusCode` indirectly. Updated it to import and use `Status` and `StatusCode` as shown in the OpenTelemetry Python docs.
- The environment variable example pointed `OTEL_EXPORTER_OTLP_ENDPOINT` at the gRPC port without setting a gRPC protocol. Updated it to the OTLP HTTP base endpoint and added `OTEL_EXPORTER_OTLP_PROTOCOL="http/protobuf"`.

## Review Notes
The Python logs API still uses the OpenTelemetry SDK's `_logs` namespace, which is the documented Python API surface for logs but remains less stable-looking than the tracing API because of the leading underscore. The examples remain intentionally minimal and do not include shutdown/flush handling for short-lived processes.
