# Validation Summary: How to Create Log Batching

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TypeScript
- Node.js timers and process signal handling
- Fetch API
- HTTP log shipping
- Log batching, retries, backpressure, and graceful shutdown
- OpenTelemetry batching and OTLP concepts

## Sources Consulted
- Node.js Process documentation: https://nodejs.org/api/process.html
- Node.js Globals documentation for Fetch API availability: https://nodejs.org/api/globals.html
- Node.js Fetch with Undici guide: https://nodejs.org/learn/getting-started/fetch
- OpenTelemetry Collector batch processor documentation: https://github.com/open-telemetry/opentelemetry-collector/blob/main/processor/batchprocessor/README.md
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Logs specification: https://opentelemetry.io/docs/specs/otel/logs/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry
- OneUptime Serilog OTLP documentation: https://oneuptime.com/docs/en/telemetry/serilog

## Issues Found
- The introductory text and comparison table implied every unbatched log necessarily creates a new connection/TCP handshake. Modern HTTP clients can reuse connections, so this was changed to describe connection/request overhead more accurately.
- The core `sendBatch` example said client errors should not be retried, but the thrown client error was caught by the surrounding `catch` block and retried. The retry logic was rewritten so network errors and 5xx responses are retried, while 4xx responses fail immediately.
- The examples posted a custom `{ logs: [...] }` JSON payload to `https://oneuptime.com/otlp/v1/logs`. OneUptime documents OTLP ingestion through the base `/otlp` endpoint with standard OTLP exporters, and the signal-specific `/v1/logs` path expects OTLP semantics rather than this custom payload. The sample endpoint and headers were changed to a generic batch ingestion API.
- The production `sendWithRetry` implementation did not throw for repeated 5xx responses after exhausting retries, which could count a failed flush as successful. It now records the last 5xx error, backs off between attempts, and throws when retries are exhausted.
- The production example dropped the oldest log without incrementing the dropped counter. The dropped count now increments for both overflow strategies.
- The production signal handler installed `SIGTERM` and `SIGINT` listeners but did not explicitly exit after flushing. Node.js removes the default exit behavior when a listener is installed, so the handler now exits after the final flush attempt.
- The TypeScript snippets now use `Awaited<ReturnType<typeof fetch>>` for fetch responses instead of a direct `Response` annotation, which avoids requiring a DOM lib type in Node-only TypeScript projects.

## Review Notes
- Syntax-level validation was run against all five TypeScript code blocks with the TypeScript compiler API, and all blocks parsed successfully.
- The examples are educational and intentionally simplified. A production logger would also typically add request timeouts, jittered backoff, queue limits during retry, explicit service/resource metadata, and tests around shutdown and failed flush behavior.
