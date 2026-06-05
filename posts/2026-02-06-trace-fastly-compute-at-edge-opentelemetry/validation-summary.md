# Validation Summary: How to Trace Fastly Compute@Edge with OpenTelemetry

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Fastly Compute@Edge / Fastly Compute
- OpenTelemetry tracing
- OTLP/HTTP JSON
- W3C Trace Context
- Rust
- JavaScript
- WebAssembly / WASI

## Sources Consulted
- Fastly `fastly.toml` package manifest reference: https://www.fastly.com/documentation/reference/compute/fastly-toml/
- Fastly getting started with Compute and resource limits: https://www.fastly.com/documentation/guides/compute/getting-started-with-compute/
- Fastly Rust SDK `Request` reference: https://docs.rs/fastly/latest/fastly/struct.Request.html
- Fastly JavaScript on Compute guide: https://www.fastly.com/documentation/guides/compute/developer-guides/javascript/
- Fastly JavaScript `fetch()` reference: https://js-compute-reference-docs.edgecompute.app/docs/globals/fetch
- Fastly JavaScript `crypto.getRandomValues()` reference: https://js-compute-reference-docs.edgecompute.app/docs/globals/crypto/getRandomValues
- Fastly Compute environment variables reference: https://www.fastly.com/documentation/reference/compute/ecp-env/
- OpenTelemetry OTLP specification: https://opentelemetry.io/docs/specs/otlp/
- OpenTelemetry Trace API specification: https://opentelemetry.io/docs/specs/otel/trace/api/
- W3C Trace Context Recommendation: https://www.w3.org/TR/trace-context/

## Issues Found
1. The post described Rust and JavaScript as "the two primary languages supported by Compute@Edge." Fastly currently documents Rust, JavaScript, Go, and C++ SDK support. Changed the wording to "two commonly used languages supported by Compute@Edge."

2. The Compute constraints were too absolute about per-request isolation and persistent state. Fastly documents default per-request sandbox execution and opt-in reusable sandboxes. Updated the wording to say each request runs in an isolated execution context and that reusable sandboxes are opt-in, with no guaranteed persistent in-memory state.

3. The resource-limit wording said execution time is typically under 50ms. Fastly documents 50ms as the default maximum CPU time for a single request execution, with a separate runtime limit. Updated the claim to CPU time.

4. The Rust OTLP JSON example serialized span fields as snake_case (`trace_id`, `span_id`, `start_time_unix_nano`) instead of OTLP JSON field names (`traceId`, `spanId`, `startTimeUnixNano`). Added `#[serde(rename_all = "camelCase")]`.

5. The Rust timestamp fields were serialized as JSON numbers. OTLP JSON/protobuf encoding uses string form for 64-bit integer fields such as nanosecond timestamps. Changed the timestamp fields to `String`.

6. The Rust `OtelValue` emitted unused oneof alternatives as `null`, which is not the intended OTLP JSON shape. Added `skip_serializing_if` to optional value fields.

7. The Rust random ID generation used an invalid Fastly dictionary call and could produce zero bytes on failure. Replaced it with `rand::random::<u8>()` byte generation.

8. The Rust request handler accessed `collector.trace_id`, but the field was private. Made `trace_id` public in the example collector.

9. The traceparent parsing accepted any four hyphen-separated fields without validating the version or trace ID. Added basic W3C Trace Context validation for version `00`, 32 hex characters, and non-zero trace IDs in both Rust and JavaScript.

10. The Rust export comment said the request was sent asynchronously, but the code uses `Request::send()`, which is blocking until response headers are received. Updated the comment.

11. The JavaScript example described export as "fire and forget" but used `await collector.export()`. Updated the comment to match the actual behavior.

12. The JavaScript ID generation used `Math.random()`. Replaced it with `crypto.getRandomValues()`, which Fastly documents as providing cryptographically strong random values.

13. The summary claimed the export kept response-latency impact "as low as possible," but the examples export before returning the response. Updated the statement to clarify that export adds one outbound request before the response is returned.

## Review Notes
The examples are still intentionally lightweight and do not implement the complete OpenTelemetry SDK behavior, sampling decisions, full traceparent/tracestate handling, span events, links, or semantic convention coverage. For production use, a Fastly-compatible OpenTelemetry library or log-streaming-based export path may be preferable when response latency is critical.
