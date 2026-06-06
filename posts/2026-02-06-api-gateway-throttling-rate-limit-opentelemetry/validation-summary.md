# Validation Summary: How to Monitor API Gateway Throttling and Rate Limit Responses

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- OpenTelemetry JavaScript API
- Express middleware
- Redis sorted sets
- ioredis
- HTTP 429 and Retry-After
- Prometheus / PromQL
- API gateway rate limiting

## Sources Consulted
- OpenTelemetry Metrics API: https://opentelemetry.io/docs/specs/otel/metrics/api/
- OpenTelemetry Tracing API: https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry JavaScript semantic conventions deprecation notes: https://open-telemetry.github.io/opentelemetry-js/modules/_opentelemetry_semantic-conventions.html
- OpenTelemetry HTTP semantic conventions: https://opentelemetry.io/docs/specs/semconv/http/
- MDN HTTP 429 status documentation: https://developer.mozilla.org/en-US/docs/Web/HTTP/Reference/Status/429
- RFC 9110 Retry-After definition: https://www.rfc-editor.org/rfc/rfc9110.html#name-retry-after
- Redis sorted sets documentation: https://redis.io/docs/latest/develop/data-types/sorted-sets/
- ioredis pipeline documentation: https://github.com/redis/ioredis
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/

## Issues Found
- The first TypeScript snippet referenced a `RateLimiter` type that was not declared. Added a minimal `RateLimiter` interface so the middleware snippet is self-contained.
- The `RateLimitState` type was used by the Redis limiter but not declared in that snippet. Added the interface to the limiter snippet.
- The original limiter inferred rejection from `remaining <= 0`, while the Redis implementation inserted every request into the sorted set before returning. This meant rejected requests still consumed quota and extended the window. Added an explicit `allowed` field, changed the middleware to check `!result.allowed`, and updated the Redis limiter so it does not add rejected requests.
- The Redis limiter returned remaining quota before consuming the allowed request. Updated it to return remaining quota after the accepted request is recorded, and adjusted the metric description accordingly.
- The Redis limiter ended spans only on the success path. Wrapped the span body in `try/finally` so `span.end()` runs if Redis throws.
- The `Retry-After` retry example only handled delay-seconds values with `parseInt`, but RFC 9110 allows either delay-seconds or an HTTP-date. Added `parseRetryAfter()` to support both formats and clamp negative values to zero.
- The client-side metric used `http.url`, which is deprecated in the current OpenTelemetry JavaScript semantic convention constants in favor of `url.full`. Updated the custom metric attribute to `url.full`.
- Removed an unused `SpanStatusCode` import from the client-side 429 detector snippet.

## Review Notes
The snippets were compiled in an isolated temporary TypeScript project against current `@opentelemetry/api` and `ioredis` packages with `tsc --noEmit`. The Redis limiter remains an illustrative implementation; production systems with high concurrency should consider a Lua script or another atomic Redis strategy for the full check-and-increment sequence.
