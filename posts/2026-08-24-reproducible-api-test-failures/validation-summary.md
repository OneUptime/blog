# Validation Summary: How to Reproduce API Test Failures with Correlation IDs and Seeds

## Status
validated

## Post Type
Technical Guide

## Technologies Covered
- TypeScript
- Node.js Crypto and Performance APIs
- Playwright Test, `APIRequestContext`, `APIResponse`, attachments, tracing, and CLI
- HTTP request/response evidence and redaction
- W3C Trace Context and distributed tracing
- SHA-256 digests and keyed HMAC
- fast-check property-based and model-based testing
- CI failure artifacts, fixtures, and environment provenance

## Sources Consulted
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext) - verified `fetch()`, `data`, `headers`, `failOnStatusCode`, `maxRedirects`, `maxRetries`, and request-context tracing.
- [Playwright APIResponse](https://playwright.dev/docs/api/class-apiresponse) - verified `body()`, `headers()`, and response buffering behavior.
- [Playwright TestInfo attachments](https://playwright.dev/docs/api/class-testinfo#test-info-attach) - verified attachment bodies, paths, content types, and asynchronous behavior.
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer) - verified that retained traces can expose network request and response headers and bodies.
- [Playwright Test CLI](https://playwright.dev/docs/test-cli) - verified the test-file filter, `--grep`, and `--workers=1` reproduction command.
- [Playwright request implementation](https://github.com/microsoft/playwright/blob/main/packages/playwright-core/src/server/fetch.ts) - checked redirect handling, retry handling, response buffering, and supported gzip, deflate, and Brotli decoding.
- [Node.js Crypto](https://nodejs.org/api/crypto.html) - verified `createHash()` and `randomUUID()`.
- [Node.js Performance Measurement APIs](https://nodejs.org/api/perf_hooks.html#performancenow) and [W3C High Resolution Time](https://www.w3.org/TR/hr-time-2/) - verified that `performance.now()` is appropriate for monotonic elapsed-time measurement.
- [Node.js WHATWG URL API](https://nodejs.org/api/url.html#new-urlinput-base) - verified relative URL resolution with `new URL(input, base)`.
- [W3C Trace Context](https://www.w3.org/TR/trace-context/) - verified `traceparent` fields, sampling semantics, propagation requirements, and privacy guidance.
- [fast-check Parameters](https://fast-check.dev/docs/api/interfaces/Parameters/), [`assert`](https://fast-check.dev/docs/api/functions/assert/), and [`asyncProperty`](https://fast-check.dev/docs/api/functions/asyncProperty/) - verified seed/path replay, `endOnFailure`, and the need to await an asynchronous assertion.
- [fast-check test reports](https://fast-check.dev/docs/tutorials/quick-start/read-test-reports/) and [model-based replay](https://fast-check.dev/docs/advanced/model-based-testing/#replay-model-based-tests) - verified counterexample paths, minimized counterexamples, and `replayPath` for command sequences.
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html), [RFC 9530: Digest Fields](https://www.rfc-editor.org/rfc/rfc9530.html), and [RFC 2104: HMAC](https://www.rfc-editor.org/rfc/rfc2104.html) - checked HTTP metadata privacy, digest limitations, and keyed message authentication.

## Issues Found
1. **Elapsed duration used a non-monotonic wall clock.** The wrapper calculated `durationMs` with `Date.now()`, which can jump when the system clock is adjusted. Added a UTC `startedAt` value using `Date` and changed elapsed-time calculation to Node's monotonic `performance.now()`.
2. **The response-header allowlist implied that selected names were universally safe.** The original `SAFE_RESPONSE_HEADERS` included the opaque `ETag` field and copied all selected values without a value cap or policy function. Renamed the set to `APPROVED_RESPONSE_HEADERS`, removed `etag` from the generic example, added a bounded policy hook for header values, normalized names before applying it, and clarified that both names and values require service-specific approval.
3. **Blank fast-check replay seeds passed validation.** `Number('')` and `Number('   ')` evaluate to zero, so an empty `FC_SEED` could pass `Number.isInteger()`. The snippet now trims and checks the raw environment values before converting the seed.
4. **The fast-check failure-report claim was too broad.** Counterexample failures include replay seed/path data, but other failure modes such as too many skipped cases need not have a counterexample path. Scoped the statement to predicate counterexample failures.
5. **Body metadata retention was stated as unconditional.** The redaction section told readers to retain a length and digest for every body even though earlier sections correctly explained that this metadata can itself be sensitive. Updated the instruction so length and digest fields are retained only when policy permits them, and added a separate policy decision before storing the decoded response length in the wrapper.

## Review Notes
- The Playwright APIs and CLI flags used are current and non-deprecated. `maxRetries` requires Playwright 1.46 or newer; request-context tracing is available in current Playwright releases and was added in 1.60.
- The HTTP wrapper is intentionally a policy-oriented sketch, not a drop-in implementation. The post correctly requires its redaction, bounding, error-sanitization, and digest-decision helpers to be implemented under the application's data policy.
- The wrapper deliberately fails closed if attachment creation fails after a successful HTTP call. If the HTTP call itself failed, it preserves that original error and records the attachment failure separately.
- The post correctly notes that `APIResponse.body()` buffers the complete decoded response before the evidence cap is applied, and that Playwright traces need separate access and retention controls because wrapper-level redaction does not sanitize trace artifacts.
