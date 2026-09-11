# Validation Summary: Reuse Correlation IDs Across Retries and Add Fresh Attempt IDs

## Status
validated

## Post Type
Technical guide with JavaScript implementation examples.

## Technologies Covered
- Node.js and JavaScript ES modules
- Fetch, Undici, AbortSignal, and Web Streams
- HTTP retries, Retry-After, correlation IDs, and idempotency
- OpenTelemetry JavaScript and distributed tracing
- W3C Trace Context

## Sources Consulted
- Node.js globals: fetch and AbortSignal.timeout — https://nodejs.org/api/globals.html
- Node.js crypto.randomUUID — https://nodejs.org/api/crypto.html#cryptorandomuuidoptions
- Node.js promise timers and timer scheduling limitations — https://nodejs.org/api/timers.html
- WHATWG Fetch Standard, including aborting response streams — https://fetch.spec.whatwg.org/#abort-fetch
- RFC 9110: HTTP semantics, idempotent methods, status codes, and Retry-After — https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 6585, section 4: 429 Too Many Requests — https://www.rfc-editor.org/rfc/rfc6585.html#section-4
- OpenTelemetry JavaScript instrumentation — https://opentelemetry.io/docs/languages/js/instrumentation/
- OpenTelemetry tracing API: span identity, parents, status, and links — https://opentelemetry.io/docs/specs/otel/trace/api/
- OpenTelemetry HTTP span conventions — https://opentelemetry.io/docs/specs/semconv/http/http-spans/
- OpenTelemetry Undici instrumentation — https://github.com/open-telemetry/opentelemetry-js-contrib/tree/main/packages/instrumentation-undici
- W3C Trace Context: traceparent and parent-id — https://www.w3.org/TR/trace-context/

## Issues Found
- The deadline paragraph did not explain that the final fetch abort signal remains attached to the returned response and can abort the caller's body read. Clarified this behavior without changing the code. A local streaming-response test confirmed that body consumption fails with TimeoutError after the function has returned.
- The same paragraph described the ten-second deadline as an unconditional bound. Clarified that it limits configured timeouts and retry waits, while event-loop delays can postpone timeout handling, consistent with Node.js timer guarantees.

## Review Notes
- Executed the retry example extracted directly from the post as an ES module on Node.js v24.1.0 against a local HTTP server. Verified 503/503/200 recovery, immediate 400 return, final-attempt 503 return, rejection of an over-budget Retry-After, and timeout propagation. Verified stable operation IDs, unique attempt IDs, and recorded server response IDs.
- Separately verified connection-failure propagation, a missing server correlation header returning null, and timeout of a partially delivered response body. An initial harness incorrectly expected a server header on the streaming fixture; the corrected assertion passed. This was a test-fixture issue, not a blog-code defect.
- The selected retry statuses are application policy, not a universal HTTP requirement. Returning the final HTTP error response and propagating transport failures are intentional and accurately described.
- Correlation and attempt headers are application conventions. Server references need not differ unless the test server explicitly generates distinct values. Correlation IDs do not provide idempotency or authorization.
- The OpenTelemetry example requires the initialized SDK and fetch/Undici instrumentation described in the text, with readWithRetries in scope. Reviewed its APIs and trace relationships against official documentation; no configured SDK or trace backend was exercised. The logical span ends when the response is returned, so later body failures are outside its catch block. Returned HTTP error statuses also do not automatically set this logical span to ERROR.
- The code uses current APIs and ES-module syntax. No terminal commands, configuration blocks, or pinned package versions appear in the post. Official documentation links resolve to the intended resources; the inventory.internal URL is an illustrative internal endpoint.
- Date.parse accepts more than HTTP-date syntax; strict rejection of malformed Retry-After values would require additional validation. Valid delay-seconds and HTTP-date inputs follow the documented policy.
