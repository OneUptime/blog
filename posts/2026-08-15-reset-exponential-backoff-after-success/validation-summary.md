# Validation Summary: Reset Exponential Backoff After a Successful Request

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- TypeScript
- Fetch `Response` and `AbortSignal`
- Exponential backoff and full jitter
- HTTP retries and idempotency
- gRPC connection backoff and HTTP/2
- RxJS `retry` and `RetryConfig.resetOnSuccess`
- Concurrent retry-state coordination and retry observability

## Sources Consulted

- [AWS SDKs and Tools: Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [RFC 9110 Section 9.2.2: Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [WHATWG Fetch Standard: `Response.ok`](https://fetch.spec.whatwg.org/#dom-response-ok)
- [WHATWG Fetch Standard: Fetch and abort behavior](https://fetch.spec.whatwg.org/#dom-global-fetch)
- [WHATWG DOM Standard: `AbortSignal.throwIfAborted()`](https://dom.spec.whatwg.org/#dom-abortsignal-throwifaborted)
- [gRPC Connection Backoff Protocol](https://grpc.github.io/grpc/core/md_doc_connection-backoff.html)
- [RFC 9113 Section 3.4: HTTP/2 Connection Preface](https://www.rfc-editor.org/rfc/rfc9113.html#section-3.4)
- [RxJS `RetryConfig`](https://rxjs.dev/api/operators/RetryConfig)
- [RxJS `retry` operator](https://rxjs.dev/api/index/function/retry)
- [RxJS 7.8.2 `retry` implementation](https://github.com/ReactiveX/rxjs/blob/7.8.2/src/internal/operators/retry.ts)
- [ECMAScript Language Specification: `Math.random()`](https://tc39.es/ecma262/multipage/numbers-and-dates.html#sec-math.random)

## Issues Found

- The HTTP example constructed a `RetryableHttpError` for every response outside the 200–299 range even though `Response.ok === false` does not establish retryability. Renamed it to the policy-neutral `HttpStatusError` and clarified that `isRetryable` must reject permanent failures.
- The generic loop did not state that an automatically retried operation must be safe to repeat. Added the RFC 9110 requirement that the operation be idempotent, protected by application-level deduplication, or known not to have been applied on the previous attempt.
- An abort occurring during the request could reach the retry classifier, whose error-only input cannot reliably distinguish every possible custom abort reason. Added `signal.throwIfAborted()` before retry classification so cancellation terminates the loop.
- The concurrent generation example advanced its generation only on success. A failure from the old generation that completed after that success was then discarded, contradicting the stated goal. Replaced it with a monotonic `failureVersion` that advances on every failure; a success resets the streak only when no failure completed while its operation was in flight. The revised example also accepts an operation callback whose promise resolves at the application-defined success boundary instead of treating an unvalidated HTTP response as success.

## Review Notes

- The full-jitter formula and retry-index convention are correct. The configured limit permits six retries after the initial request, with retry windows from 250 ms through 8,000 ms. The 30,000 ms delay cap is therefore not reached with the shown retry limit, but remains a valid upper bound.
- The gRPC `SETTINGS` reset boundary and RxJS `resetOnSuccess` emission semantics are accurate.
- The TypeScript snippets compile under strict settings when the intentionally application-specific helpers and error class are declared.
- The current AWS page marks its documented 2026 cross-SDK retry behavior as opt-in; the post relies only on the general full-jitter model and does not claim AWS-specific defaults.
