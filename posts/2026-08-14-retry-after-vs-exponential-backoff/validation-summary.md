# Validation Summary: Should Retry-After Override Exponential Backoff?

## Status

validated

## Post Type

Technical guide and reference

## Technologies Covered

- HTTP `Retry-After`
- HTTP status codes 3xx, 429, and 503
- Exponential backoff and jitter
- Rate limiting and throttle-scope partitioning
- Retry safety, idempotency, and replayability
- Deadlines, wall clocks, monotonic clocks, and durable queue scheduling

## Sources Consulted

- [RFC 9110: HTTP Semantics — Retry-After, Section 10.2.3](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 9110: HTTP Semantics — Syntax Notation, Section 2.1](https://www.rfc-editor.org/rfc/rfc9110.html#section-2.1)
- [RFC 9110: HTTP Semantics — Date/Time Formats, Section 5.6.7](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.6.7)
- [RFC 9110: HTTP Semantics — Field Lines, Values, and Whitespace, Sections 5.2–5.6](https://www.rfc-editor.org/rfc/rfc9110.html#section-5.2)
- [RFC 9110: HTTP Semantics — Safe and Idempotent Methods, Sections 9.2.1–9.2.2](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2)
- [RFC 9110: HTTP Semantics — Redirection 3xx, Section 15.4](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.4)
- [RFC 9110: HTTP Semantics — 413 Content Too Large, Section 15.5.14](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.5.14)
- [RFC 9110: HTTP Semantics — 503 Service Unavailable, Section 15.6.4](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6.4)
- [RFC 6585: 429 Too Many Requests, Section 4](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [RFC 9112: HTTP/1.1 Connection Persistence, Section 9.3](https://www.rfc-editor.org/rfc/rfc9112.html#section-9.3)
- [IANA HTTP Field Name Registry](https://www.iana.org/assignments/http-fields/http-fields.xhtml)
- [AWS SDKs and Tools: Retry behavior](https://docs.aws.amazon.com/sdkref/latest/guide/feature-retry-behavior.html)
- [Google Cloud Storage: Retry strategy](https://cloud.google.com/storage/docs/retry-strategy)
- [Amazon Builders' Library: Timeouts, retries, and backoff with jitter](https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/)

## Issues Found

- The delay-seconds description did not state that RFC `DIGIT` is specifically one or more ASCII digits. It now explicitly limits the grammar to ASCII `0`–`9`, preventing Unicode-aware numeric parsing from accepting nonconforming values.
- The HTTP-date guidance understated RFC 9110's recipient requirement and described time in imprecise GMT terms. It now requires IMF-fixdate plus both obsolete forms and identifies HTTP-date as an instant in UTC; the edge-case test list was updated to match.
- The date-derived delay was expressed as a duration captured at response receipt but later slept in full, which could count parsing or response-cleanup time twice and reject a retry that still fits the deadline. It now derives a monotonic eligibility time from paired receipt-time wall and monotonic readings, then computes the remaining delay at wait time.
- The clock-skew explanation implied that moderate skew always falls back to local backoff. It now correctly limits that behavior to dates that appear past according to the client; skew in the other direction can lengthen the delay.
- The retryability paragraph conflated repeat attempts with 3xx redirect handling. It now evaluates redirect method and body semantics separately, which covers cases such as a POST followed by a 303 retrieval request.
- The GET and PUT bullets understated their normative HTTP method properties. They now say that GET is defined as safe and idempotent and PUT is defined as idempotent, while retaining the application and replayability caveats.
- The terminal-error caveat referred only to API documentation even though HTTP itself defines combinations such as a temporary 413 with `Retry-After`. It now recognizes either HTTP semantics or the API contract.
- The queue-worker guidance referred only to the server time and could undercut a longer local backoff. It now persists a time no earlier than both eligibility constraints and includes any selected post-hint spread.
- The conclusion said fallback could never cause an immediate retry. Full-jitter algorithms can select zero, so it now states the intended rule precisely: an invalid or missing hint is not interpreted as a zero delay and remains subject to local backoff and retry limits.

## Review Notes

- The central `max(local, server)` rule is a client policy compatible with RFC 9110; the RFC defines `Retry-After` semantics but does not prescribe this combination algorithm.
- All referenced URLs resolved successfully. The Google Cloud URL redirects to its current official documentation location, and the Amazon Builders' Library URL redirects to the corresponding AWS Builder Center article.
- The current AWS page documents proprietary `x-amz-retry-after` in milliseconds and SDK-specific handling, not the standard `Retry-After` field. The behavior described on that page currently requires `AWS_NEW_RETRIES_2026=true`; availability and minimum versions vary across SDKs. The post correctly tells readers to follow proprietary API documentation and inspect the actual SDK version.
- The pseudocode is language-neutral; there are no language APIs, terminal commands, or configuration snippets requiring compilation or CLI validation.
