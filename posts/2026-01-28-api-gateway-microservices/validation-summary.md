# Validation Summary: How to Use API Gateway for Microservices

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Node.js / Express
- `http-proxy-middleware`
- `express-rate-limit`
- `jsonwebtoken` (JWT)
- Kong (declarative configuration, plugins)
- Docker / Docker Compose
- `axios`
- OpenTelemetry JS (`@opentelemetry/sdk-node`, `@opentelemetry/api`, `@opentelemetry/auto-instrumentations-node`, `@opentelemetry/exporter-trace-otlp-http`, `@opentelemetry/resources`, `@opentelemetry/semantic-conventions`)
- `prom-client` (Prometheus)
- Mermaid diagrams

## Sources Consulted
- `http-proxy-middleware` v3 migration guide: https://github.com/chimurai/http-proxy-middleware/blob/master/MIGRATION_V3.md
- Kong `request-transformer` plugin docs: https://developer.konghq.com/plugins/request-transformer/
- Kong `request-transformer-advanced` docs: https://docs.konghq.com/hub/kong-inc/request-transformer-advanced/
- Kong `correlation-id` plugin docs: https://developer.konghq.com/plugins/correlation-id/
- Kong declarative configuration / `_format_version` reference (Kong 3.x)
- `@opentelemetry/api` source / exports (SpanStatusCode + trace both exported from top-level)
- `express-rate-limit` docs (option naming: `max` still accepted alongside `limit` in v7)
- `prom-client` API reference (Histogram / Gauge / Counter signatures)
- `jsonwebtoken` API reference (`jwt.verify`, `TokenExpiredError` name)

## Issues Found

1. **`http-proxy-middleware` event handler API was outdated.**
   - Original code used the top-level `onError: (err, req, res) => { ... }` callback option.
   - In `http-proxy-middleware` v3 this was a breaking change: top-level `onError`, `onProxyReq`, etc. were removed and moved into an `on: { error: ..., proxyReq: ..., proxyRes: ... }` object. v4 (current stable on npm) continues that pattern.
   - **Fix:** wrapped the handler in `on: { error: (err, req, res) => { ... } }` so the code works against the current major version.

2. **Kong `request-transformer` used a template (`$(uuid)`) not supported in OSS Kong.**
   - Original Kong YAML used `request-transformer` with `add.headers: ["X-Request-ID:$(uuid)"]`.
   - The community OSS `request-transformer` template syntax only supports `$(headers.X)`, `$(query_params.X)`, `$(uri_captures.X)`, `$(shared.X)`. `$(uuid)` is only available in `request-transformer-advanced` (Enterprise / Konnect).
   - The idiomatic OSS way to add a UUID-based request/correlation header is the built-in `correlation-id` plugin.
   - **Fix:** replaced the snippet with a `correlation-id` plugin block using `header_name: X-Request-ID`, `generator: uuid`, and `echo_downstream: true`.

3. **`SpanStatusCode` was referenced but not imported in the OpenTelemetry custom-span example.**
   - The "Custom span for authentication" snippet only imported `trace` from `@opentelemetry/api` but then called `SpanStatusCode.OK` and `SpanStatusCode.ERROR`, which would throw `ReferenceError: SpanStatusCode is not defined`.
   - **Fix:** added `SpanStatusCode` to the destructured import from `@opentelemetry/api` (both symbols are exported from the same top-level module).

## Review Notes
- The `express-rate-limit` snippet uses `max:` which is the legacy option name; v7+ prefers `limit:` but still accepts `max:` as an alias and only emits a deprecation warning. Left as-is since the code still works correctly.
- The Kong Docker Compose snippet uses `version: '3.8'`. Modern Docker Compose treats `version` as obsolete (ignored with a warning) but it is still valid and does not break anything. Left as-is.
- `SemanticResourceAttributes` from `@opentelemetry/semantic-conventions` is deprecated in newer (1.27+) versions in favor of the `ATTR_*` constants (e.g. `ATTR_SERVICE_NAME`), but the old form still works. Left as-is; could be modernized in a future pass.
- The custom-spans snippet is intentionally a fragment — it references `jwt` without re-importing it, which is fine as a "wire it into the existing auth middleware" illustration. Not changed.
- The basic gateway example registers the rate limiter and proxy routes but does not actually wire in `authMiddleware` or the circuit breaker shown later — that is by design (each section illustrates a pattern in isolation), not an error.
