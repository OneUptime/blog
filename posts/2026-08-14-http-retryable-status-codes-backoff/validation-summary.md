# Validation Summary: Which HTTP Errors Should Your Client Retry with Backoff?

## Status

validated

## Post Type

Technical guide / reference

## Technologies Covered

- HTTP status codes and method semantics
- HTTP retries and replay safety
- Exponential backoff and jitter
- `Retry-After` and rate limiting
- Idempotency and conditional requests
- TypeScript

## Sources Consulted

- RFC 9110, HTTP Semantics (method properties, automatic retries, `Retry-After`, HTTP-date, 408, 409, and 5xx responses): https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 6585, Section 4, 429 Too Many Requests: https://www.rfc-editor.org/rfc/rfc6585.html#section-4
- RFC 9113, Section 8.2.2, HTTP/2 connection-specific header fields: https://www.rfc-editor.org/rfc/rfc9113.html#section-8.2.2
- Google Cloud Storage retry strategy: https://docs.cloud.google.com/storage/docs/retry-strategy
- Google SRE, Addressing Cascading Failures: https://sre.google/sre-book/addressing-cascading-failures/
- TypeScript Handbook, Object Types: https://www.typescriptlang.org/docs/handbook/2/objects.html

## Issues Found

- The 408 row repeated obsolete RFC 7231 guidance that a server should send `Connection: close` and implied every retry needs a new connection. Updated it to RFC 9110 semantics: retry an outstanding request only when it is replayable, and use a new connection only when the current connection is unusable. This also avoids prescribing a connection-specific header that HTTP/2 forbids.
- The 429 wording attributed a rate limit only to the client, and the 502 and 504 descriptions omitted proxies. Aligned all three descriptions with the RFC language about the requester and servers acting as gateways or proxies.
- The 429, 500, and 503 rows used HTTP's formal term "safe" where the intended test was broader replay safety. Changed these references to "replay-safe" so they correctly include idempotent or contractually deduplicated writes when appropriate.
- The post described 501 as permanently unsupported. RFC 9110 specifies a current capability mismatch, not that support can never be added. Changed the wording to say that immediately retrying the unchanged request will not normally fix it.
- The method discussion said a response was repeated and omitted POST operations whose documented application semantics are idempotent. Corrected "response" to "request" and added documented idempotent semantics as a valid reason to retry POST.
- The transport guidance allowed library retries and operation-level retries without explicitly coordinating them. Updated it to prevent multiplicative retry layers and require every physical attempt to share the overall deadline, attempt cap, and retry budget.
- The `Retry-After` guidance treated overflowing integers as invalid, which could cause fallback to a shorter delay even though RFC 9110 sets no fixed digit-count limit for `delay-seconds`. Updated it to detect overflow without wrapping and treat an otherwise valid unrepresentable delay as exceeding the local deadline or maximum-wait policy.
- Strict HTTP-date parsing was underspecified. Clarified that RFC 9110 requires recipients to accept IMF-fixdate and both obsolete HTTP-date formats.
- Jitter was previously limited to the absence of `Retry-After`, so identical valid server delays could synchronize a fleet. Updated the policy to preserve server guidance as a lower bound while adding bounded caller-specific jitter.

## Review Notes

- The TypeScript classifier was parsed and transpiled successfully with TypeScript 5.9.3. Its replay-safety gate and conservative status allowlist are internally consistent after the terminology fixes.
- All external links in the post resolve to the intended RFCs, current Google Cloud guidance, and the author's GitHub profile.
- Google Cloud Storage's status guidance is service-specific and broadly describes 408, 429, and 5xx responses as transient. The post appropriately applies a narrower generic HTTP policy by excluding unchanged 501 requests and requiring replay safety and a retry budget.
