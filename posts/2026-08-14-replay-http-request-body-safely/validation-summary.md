# Validation Summary: Replay an HTTP Request Body Safely on Every Retry

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Go
- Go `net/http`, `io`, `bytes`, and `os` packages
- HTTP request-body replay and transfer framing
- HTTP retries, redirects, and idempotency keys
- Streaming and file-backed request bodies
- HTTP integrity digests and response-body lifecycle

## Sources Consulted
- Go `net/http` package documentation: https://pkg.go.dev/net/http
- Go `net/http` request implementation: https://go.dev/src/net/http/request.go
- Go `net/http` client and redirect implementation: https://go.dev/src/net/http/client.go
- Go `net/http` transport implementation: https://go.dev/src/net/http/transport.go
- Go `net/http` header implementation: https://go.dev/src/net/http/header.go
- Go `bytes` package documentation: https://pkg.go.dev/bytes
- Go `io` package documentation: https://pkg.go.dev/io
- Go `os` package documentation: https://pkg.go.dev/os
- RFC 9110, HTTP Semantics: https://www.rfc-editor.org/rfc/rfc9110.html
- RFC 9530, Digest Fields: https://www.rfc-editor.org/rfc/rfc9530.html

## Issues Found
- The introduction said the first transport attempt always reads the request body to EOF. Failures, cancellation, or an early response can leave the body partly consumed. Updated the wording to say an attempt can consume some or all of the stream before the transport closes it.
- The combined Go examples used `os.Open` without importing `os`. Added the missing import so the package examples compile together.
- A known empty payload was represented by a non-nil `io.NopCloser` with `ContentLength == 0`. Go treats that combination as an unknown length. Added normalization to `http.NoBody` for both the initial body and every `GetBody` result, and documented `-1` as the factory's unknown-length sentinel.
- `newAttempt` accepted an empty idempotency key even though Go's transport considers the request idempotent based on the header map entry's presence. Added validation before opening the body so selected automatic transport retries cannot be enabled without a usable operation identity.
- `GetBody` ignored the length reported by a newly opened body. Added a length-consistency check and cleanup on mismatch so a replay cannot silently pair the original `ContentLength` with a differently sized source.
- The file guidance implied that holding a stable descriptor could establish immutability. Clarified that it prevents path replacement but not in-place modification; immutable source versions, digest verification, or controlled copies are still needed.
- The post used the obsolete `Content-MD5` field as its general digest example. Replaced it with RFC 9530's current `Content-Digest` field, clarified that the digest input is field-defined, and added the RFC 9530 documentation link.
- The response-cleanup claim applied to every response returned by `Client.Do`. Qualified it with a nil error because the standard non-nil response plus non-nil error case is a redirect-policy failure whose body is already closed.
- The test guidance called for cancellation while opening a source, but the shown `BodyFactory` has no context and cannot make a blocking opener observe request cancellation. Narrowed the test claim to cancellation while sending.

## Review Notes
- The combined package snippets were format-checked and compiled with Go 1.25.3. Focused tests passed for immutable byte snapshots, normal replay, known-empty body replay, and empty idempotency-key rejection.
- `bytes.Clone` is current and non-deprecated but requires Go 1.20 or newer.
- The shown `BodyFactory` is synchronous and context-free. A potentially blocking remote-source opener should use a context-aware factory design if cancellation during source acquisition is required.
- `Idempotency-Key` remains an API-defined contract rather than a field standardized by RFC 9110. The server must implement the corresponding deduplication semantics.
