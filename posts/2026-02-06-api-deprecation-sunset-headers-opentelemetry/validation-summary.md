# Validation Summary: How to Monitor API Deprecation Warnings and Sunset Headers

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- OpenTelemetry JavaScript tracing API
- OpenTelemetry JavaScript metrics API
- HTTP Deprecation response header
- HTTP Sunset response header
- HTTP Link response header relation types
- Prometheus / PromQL dashboard queries
- TypeScript / Express-style middleware

## Sources Consulted
- RFC 9745: The Deprecation HTTP Response Header Field - https://www.rfc-editor.org/rfc/rfc9745
- RFC 8594: The Sunset HTTP Header Field - https://www.rfc-editor.org/rfc/rfc8594
- RFC 9110: HTTP Semantics, including 410 Gone - https://www.rfc-editor.org/rfc/rfc9110
- IANA Link Relation Types registry - https://www.iana.org/assignments/link-relations/link-relations.xhtml
- OpenTelemetry Trace API specification - https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry Metrics API specification - https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry JavaScript API reference for Tracer, Span, and Meter - https://open-telemetry.github.io/opentelemetry-js/
- OpenTelemetry Prometheus exporter specification - https://opentelemetry.io/docs/specs/otel/metrics/sdk_exporters/prometheus/
- Prometheus PromQL operators documentation - https://prometheus.io/docs/prometheus/latest/querying/operators/

## Issues Found
- The server snippet originally set the `Deprecation` header to an ISO date string. RFC 9745 defines `Deprecation` as a Structured Field date, for example `@1705276800`, so the snippet now converts the internal ISO date to the required `@<unix-seconds>` form before setting the header.
- The client snippet originally treated the `Deprecation` header as a plain date string. It now parses the Structured Field date format and records/logs a readable timestamp while still tolerating unexpected values.
- The metrics snippet referenced `DeprecationConfig` from another file without importing it. The middleware snippet now exports the type, and the metrics snippet imports it.
- The automated sunset enforcement snippet referenced `trace` and `deprecatedEndpoints` without imports. The snippet now imports both.
- The days-until-sunset metric was originally a histogram, but the dashboard queried it like a current-value gauge. The snippet now uses `createGauge`, and the PromQL query uses `min(...) by (api_route)` instead of invalid bare `by` syntax.
- The client span was ended only on the successful path. It now uses `try/finally` so the span is ended if `fetch` or header processing throws.

## Review Notes
The `Sunset` header example uses an HTTP-date value, which matches RFC 8594. The `successor-version` link relation is registered with IANA and is plausible for a replacement endpoint. The Prometheus metric and label names assume the common OpenTelemetry-to-Prometheus underscore translation strategy.
