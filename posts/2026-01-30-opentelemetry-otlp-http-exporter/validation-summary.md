# Validation Summary: How to Build OpenTelemetry OTLP HTTP Exporter

## Status
validated

## Post Type
Tutorial / step-by-step implementation guide (TypeScript / Node.js).

## Technologies Covered
- OpenTelemetry Protocol (OTLP) — HTTP/JSON transport
- OTLP signal endpoints (traces, metrics, logs)
- TypeScript / Node.js (`http`, `https`, `zlib`, `URL`)
- OpenTelemetry Collector (used as a local test backend)
- Production patterns: batching, exponential backoff retry, circuit breaker, gzip compression, graceful shutdown
- OneUptime as the example OTLP backend (`https://oneuptime.com/otlp`, `x-oneuptime-token` header)

## Sources Consulted
- OTLP specification: https://opentelemetry.io/docs/specs/otlp/ (ports, default URL paths, retryable status codes, JSON encoding rules)
- OpenTelemetry proto definitions: https://github.com/open-telemetry/opentelemetry-proto (`trace.proto`, `metrics.proto`, `logs.proto`, `common.proto` — enum values for SpanKind, StatusCode, SeverityNumber, AggregationTemporality)
- OTLP JSON Protobuf encoding rules (hex-encoded `traceId`/`spanId`, decimal-string-encoded int64 fields)
- OpenTelemetry Collector documentation for the local-testing example (`otel/opentelemetry-collector` image, `otlp` receiver, `debug` exporter)
- Node.js `http`/`https`/`URL`/`zlib` API docs (for verifying the request and compression code)

## Issues Found
Two technical issues were found and fixed:

1. **Retryable HTTP status codes too broad.** The original code (in both `OTLPHttpExporter.sendRequest` and `RetryableExporter.isRetryable`) treated *any* 5xx as retryable. The OTLP/HTTP spec is more specific: only `429`, `502`, `503`, and `504` are retryable; "All other 4xx or 5xx response status codes MUST NOT be retried." I updated both code paths to check the specific status codes (`429 || 502 || 503 || 504`) and updated the inline comments to reflect the spec.

2. **URL construction dropped base-URL path prefixes.** The original `sendRequest` used `new URL(path, this.endpoint)` with `path = '/v1/traces'`. Because `/v1/traces` is an absolute path, `new URL()` replaces the base URL's pathname — so a configured endpoint of `https://oneuptime.com/otlp` would resolve to `https://oneuptime.com/v1/traces`, silently dropping the `/otlp` prefix and breaking the OneUptime example shown later in the post. Fixed by stripping any trailing slash from the configured endpoint and concatenating the signal path, so `https://oneuptime.com/otlp` + `/v1/traces` correctly resolves to `https://oneuptime.com/otlp/v1/traces`. This also continues to work for endpoints with no path (e.g. `http://localhost:4318`).

## Review Notes
The following items are technically valid and were verified against the spec, but are worth noting:

- **OTLP JSON int64 encoding.** Per proto3 JSON / the OTLP spec, 64-bit integer fields (`AnyValue.int_value`, `*UnixNano` timestamps) SHOULD be emitted as decimal strings. Receivers MUST accept both numbers and strings, so the post's `{ intValue: 200 }` (number) examples will work in practice with any conformant receiver, but emitting strings would be strictly more spec-compliant. The post already does this correctly for timestamps (`String(Date.now() * 1_000_000)`).
- **Enum values verified.** SpanKind (`SERVER = 2`, `INTERNAL = 1`), StatusCode (`OK = 1`), SeverityNumber (`INFO = 9`, `DEBUG = 5`, `WARN = 13`, `ERROR = 17`, `FATAL = 21`, `TRACE = 1`), and AggregationTemporality (`CUMULATIVE = 2`) all match the OTLP proto definitions.
- **Histogram invariants.** The example histogram has `bucketCounts.length === explicitBounds.length + 1` (5 vs 4) and the bucket counts sum to the reported `count` (100). Both match the OTLP spec.
- **OTLP/JSON hex encoding for IDs.** The post correctly notes that `traceId` (32 hex chars) and `spanId` (16 hex chars) are hex-encoded — this is an explicit deviation from standard proto3 JSON (which would use base64) and is correctly handled here.
- **Ports and paths.** gRPC `4317`, HTTP `4318`, and the `/v1/traces`, `/v1/metrics`, `/v1/logs` paths are correct.
- **`setInterval` keeps the event loop alive.** `BatchProcessor.startFlushTimer` uses `setInterval` without `.unref()`, which would prevent a Node.js process from exiting naturally. Not a correctness bug for a long-running service, but worth knowing for short-lived scripts. Left unchanged because it doesn't affect the tutorial's correctness.
- **Concurrent flushes possible.** The `setInterval` callback fires `this.flush()` without awaiting it, so a long-running export could overlap with the next tick. Acceptable for a teaching example.
- **`retry-after` header.** Only the integer-seconds form is parsed; HTTP-date form is ignored. Acceptable for a teaching example; most servers emit seconds.
