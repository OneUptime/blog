# Validation Summary: How to Test `ETag` and `If-Match` Handling for Concurrent API Updates

## Status

validated

## Post Type

Technical guide / API testing tutorial

## Technologies Covered

- HTTP entity tags, validators, and conditional requests
- `ETag`, `If-Match`, `If-None-Match`, `412 Precondition Failed`, and `428 Precondition Required`
- Optimistic concurrency control and lost-update prevention
- TypeScript and Node.js `crypto.randomUUID()`
- Playwright Test, `APIRequestContext`, and `APIResponse`
- Atomic SQL updates, audit records, version rows, and outbox records

## Sources Consulted

- [RFC 9110, Section 8.8: Validator Fields](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8) — strong-validator requirements and entity-tag semantics.
- [RFC 9110, Section 8.8.3: ETag](https://www.rfc-editor.org/rfc/rfc9110.html#section-8.8.3) — entity-tag grammar, opacity, generation, strong comparison, and content-negotiated variants.
- [RFC 9110, Section 13.1.1: If-Match](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.1) — strong comparison, wildcard/list behavior, failed-precondition handling, and the already-applied `2xx` allowance.
- [RFC 9110, Section 13.1.2: If-None-Match](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.1.2) — create-only behavior with `If-None-Match: *`.
- [RFC 9110, Section 13.2: Evaluation of Preconditions](https://www.rfc-editor.org/rfc/rfc9110.html#section-13.2) — timing, precedence, and the rule that normal errors such as `404` can precede conditional evaluation.
- [RFC 9110, Section 15.3.5: 204 No Content](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.3.5) — response metadata and `ETag` on a successful response without content.
- [RFC 9110, Section 15.5.13: 412 Precondition Failed](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.13) — status-code semantics.
- [RFC 6585, Section 3: 428 Precondition Required](https://www.rfc-editor.org/rfc/rfc6585.html#section-3) and [Section 7.1](https://www.rfc-editor.org/rfc/rfc6585.html#section-7.1) — required conditional requests, lost-update avoidance, and optional deployment of `428`.
- [Playwright API testing guide](https://playwright.dev/docs/api-testing#configuration) — configuring `use.baseURL` for relative API URLs and using the built-in request fixture.
- [Playwright APIRequestContext](https://playwright.dev/docs/api/class-apirequestcontext) — `get`, `post`, and `patch`; JSON `data`; request headers; and `failOnStatusCode`.
- [Playwright APIResponse](https://playwright.dev/docs/api/class-apiresponse) — `status()`, `headers()`, `json()`, and response lifetime.
- [Playwright built-in fixtures](https://playwright.dev/docs/test-fixtures#built-in-fixtures) — the isolated per-test `request` fixture.
- [Node.js Crypto documentation](https://nodejs.org/api/crypto.html#cryptorandomuuidoptions) — `crypto.randomUUID()`.

## Issues Found

1. **The Playwright examples omitted the prerequisite for relative URLs.** Requests such as `request.get('/v1/documents/...')` need Playwright's `use.baseURL` to target the API. Added that assumption before the first example.
2. **The concurrency gate was never released.** Requests carrying `X-Test-Gate` could remain paused while the test waited on `Promise.all()`. Added out-of-band arrival waiting and gate release before awaiting the responses, plus test-only access and bounded auto-release guidance.
3. **The stale-request side-effect claim was too absolute.** RFC 9110 prohibits performing the requested method when an evaluated `If-Match` condition is false, but rejection logging or audit records are still legitimate. Limited the claim to mutations and mutation-related records, and distinguished a valid rejection audit entry.
4. **Absent-resource wildcard behavior omitted precondition precedence.** `If-Match: *` is false when there is no current representation, but RFC 9110 requires an independently determined error such as `404 Not Found` to take precedence. Clarified that an API can return `404` rather than `412` while still not performing the method, and updated the validator matrix.

## Review Notes

- The entity-tag regular expression matches RFC 9110's strong `opaque-tag` grammar, including the allowed `obs-text` octets and exclusion of double quotes.
- The post correctly describes strong comparison, weak-tag non-matches, comma-separated tag lists, wildcard syntax, the already-applied `2xx` allowance, and strong-validator changes.
- The Playwright request and response APIs used are current and non-deprecated. `failOnStatusCode: false` is valid but redundant because `false` is the default.
- The `gate` and API endpoints are application-specific test collaborators rather than Playwright APIs; their required behavior is now explicit enough for the illustrative snippet.
- The SQL statement is an intentionally driver-neutral shape; named placeholder syntax varies by database driver.
- All external links in the post resolve to the intended official documentation or author profile.
