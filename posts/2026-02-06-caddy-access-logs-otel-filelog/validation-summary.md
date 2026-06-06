# Validation Summary: How to Collect Caddy Access Logs as OpenTelemetry Logs via Filelog Receiver

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Caddy Server
- Caddyfile access logging
- Caddy OpenTelemetry tracing directive
- OpenTelemetry Collector Contrib
- Filelog receiver and Stanza operators
- OpenTelemetry transform and resource processors
- Docker Compose

## Sources Consulted
- Caddy `log` directive documentation: https://caddyserver.com/docs/caddyfile/directives/log
- Caddy global options `log` documentation: https://caddyserver.com/docs/caddyfile/options#log
- Caddy `tracing` directive documentation: https://caddyserver.com/docs/caddyfile/directives/tracing
- OpenTelemetry Collector filelog receiver documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/receiver/filelogreceiver/README.md
- OpenTelemetry Stanza operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/pkg/stanza/docs/operators/README.md
- OpenTelemetry Stanza `json_parser`, `severity_parser`, `trace_parser`, `filter`, and `move` operator documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/stanza/docs/operators
- OpenTelemetry Stanza timestamp, severity, trace, field, and expression documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/tree/main/pkg/stanza/docs/types
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- OpenTelemetry transform processor documentation: https://github.com/open-telemetry/opentelemetry-collector-contrib/blob/main/processor/transformprocessor/README.md

## Issues Found
- The post stated that Caddy writes structured JSON access logs by default. Updated this to say Caddy can write structured JSON access logs, because access logging must be enabled and the default encoding depends on the logger/output context.
- The first Caddyfile configured a global logger while describing access log configuration. Moved the `log { ... }` block into the `:80` site block so it directly configures HTTP access logs.
- Multiple `move` operators and multiple `filter` operators omitted unique IDs. Stanza operators default their ID to the operator type, so repeated operators of the same type must be given unique IDs. Added IDs to each repeated operator.
- Several extracted HTTP attributes used older or non-current names such as `http.method`, `http.url`, `net.peer.ip`, `http.host`, and `http.status_code`. Updated the examples to current semantic convention names where applicable, and used `caddy.duration_seconds` for Caddy's custom duration value.
- The tracing example used an invalid global `tracing` block and claimed Caddy emits `tracing_span` and `tracing_trace`. Updated the Caddyfile to use the `tracing` directive inside the site block and corrected the log fields to Caddy's documented `traceID` and `spanID`.
- Updated the transform processor example to reference the corrected `caddy.duration_seconds` attribute.

## Review Notes
- The Caddyfile examples were validated with `caddy:latest caddy validate`. The validation only reported formatting and HTTP-only warnings, not configuration errors.
- The main Collector config and the trace/filter/transform fragments were validated with `otel/opentelemetry-collector-contrib:latest validate`.
- The Docker Compose `version` key is accepted by Docker Compose but is considered legacy in recent Compose implementations; it was left unchanged because it does not make the setup technically incorrect.
