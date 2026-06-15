# Validation Summary: How to Implement Log Sampling for High-Volume Systems

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TypeScript
- Node.js AsyncLocalStorage
- Express middleware
- JavaScript bitwise operators
- Log sampling strategies
- OpenTelemetry sampling concepts

## Sources Consulted
- Node.js AsyncLocalStorage documentation: https://nodejs.org/api/async_context.html
- Node.js HTTP ServerResponse events documentation: https://nodejs.org/api/http.html
- Express API reference: https://expressjs.com/en/api/
- MDN JavaScript unsigned right shift operator reference: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Unsigned_right_shift
- OpenTelemetry sampling concepts: https://opentelemetry.io/docs/concepts/sampling/

## Issues Found
- The consistent hashing example used signed JavaScript bitwise output in `shouldSampleByKey`, which could over-sample keys whose hash had the high bit set. Changed the hash comparison to use `>>> 0` and compare against the full unsigned 32-bit range.
- The basic `SampledLogger` accepted one sampler but emitted hard-coded debug and info sample rates. Split it into debug and info samplers so the `_sample_rate` metadata matches the actual sampling rate used.
- The head-based logger could write error logs twice when the request was sampled because it logged sampled levels first and then logged errors again. Moved the error path before the sampled path and returned after writing the error.
- The tail-based sampler only retained logs when `hasError` was true, so a buffered `error` log could still be dropped if the HTTP status did not become 5xx. Updated `finalize` to also retain buffers containing `error` or `fatal` log entries.

## Review Notes
The examples still assume application-provided types and helpers such as `Logger`, `RequestLogger`, `LogEntry`, `MetricsClient`, and `generateTraceId`. That is acceptable for illustrative blog snippets, but a future runnable sample should define those interfaces explicitly.
