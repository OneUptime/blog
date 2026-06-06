# Validation Summary: How to Enable OpenTelemetry Tracing in Caddy Server with the tracing Directive

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Caddy Server
- Caddyfile `tracing` directive
- OpenTelemetry tracing
- OTLP gRPC
- OpenTelemetry Collector
- Docker Compose

## Sources Consulted
- Caddy `tracing` directive documentation: https://caddyserver.com/docs/caddyfile/directives/tracing
- Caddy v2.11.4 tracing implementation: https://github.com/caddyserver/caddy/blob/v2.11.4/modules/caddyhttp/tracing/tracer.go
- Caddy v2.11.4 tracing Caddyfile parser: https://github.com/caddyserver/caddy/blob/v2.11.4/modules/caddyhttp/tracing/module.go
- OpenTelemetry Go autoexport package documentation: https://go.opentelemetry.io/contrib/exporters/autoexport
- OpenTelemetry OTLP exporter environment variable documentation: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry HTTP attribute registry: https://opentelemetry.io/docs/specs/semconv/registry/attributes/http/
- OpenTelemetry Collector configuration documentation: https://opentelemetry.io/docs/collector/configuration/
- Docker Compose Specification documentation for the obsolete `version` field: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The post claimed Caddy sends traces to `localhost:4317` via OTLP gRPC by default. Current Caddy uses OpenTelemetry Go autoexport, so the examples now set `OTEL_EXPORTER_OTLP_PROTOCOL=grpc` explicitly when using port `4317`.
- The span example used deprecated OpenTelemetry HTTP attribute names such as `http.method`, `http.url`, `http.status_code`, `net.host.name`, and `http.user_agent`. These were replaced with current semantic convention names such as `http.request.method`, `url.path`, `http.response.status_code`, `server.address`, and `user_agent.original`.
- The post implied Caddy automatically named spans as `HTTP GET /api/users`. Caddy uses the configured `span` value, or `handler` if none is configured, so the example now shows the configured span name.
- The custom attributes section incorrectly said headers added with `header_up` become span attributes and showed a `header` directive with `{http.request.uuid}`. This was replaced with Caddy's documented `span_attributes` block.
- The verification step depended on Collector logs without configuring a logging exporter. The Collector example now includes the `debug` exporter so `docker logs otel-collector` can show received spans.
- The Docker Compose example used the obsolete top-level `version` field. It was removed to match the current Compose Specification.

## Review Notes
Caddy's public tracing docs state that the tracing directive uses gRPC as the exporter protocol, while current Caddy v2.11.4 source uses OpenTelemetry Go autoexport. The post now explicitly configures gRPC export, which makes the examples align with the article's OTLP gRPC scope regardless of exporter defaults.
