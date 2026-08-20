# Validation Summary: Drain and Close HTTP Responses Before Retrying

## Status

validated

## Post Type

Technical guide with Go implementation examples

## Technologies Covered

- Go and the `net/http` client API
- HTTP retry loops and exponential backoff
- Response-body draining and resource cleanup
- HTTP/1.x keep-alive connection reuse and pooling
- HTTP/2 streams and flow control
- Context cancellation and client timeouts
- Replayable request bodies and idempotency

## Sources Consulted

- [Go `net/http` package documentation](https://pkg.go.dev/net/http)
- [Go `http.Client.Do` documentation](https://pkg.go.dev/net/http#Client.Do)
- [Go `http.Response.Body` documentation](https://pkg.go.dev/net/http#Response)
- [Go `http.NewRequestWithContext` documentation](https://pkg.go.dev/net/http#NewRequestWithContext)
- [Go `http.Client` documentation](https://pkg.go.dev/net/http#Client)
- [Go `http.Transport` documentation](https://pkg.go.dev/net/http#Transport)
- [Go `io.CopyN` documentation](https://pkg.go.dev/io#CopyN)
- [Go 1.27 release notes](https://go.dev/doc/go1.27)
- [Official Go HTTP/2 transport source](https://go.googlesource.com/net/+/master/http2/transport.go)
- [RFC 9110 Section 9.2.2: Idempotent Methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)
- [RFC 9110 Section 10.2.3: Retry-After](https://www.rfc-editor.org/rfc/rfc9110.html#section-10.2.3)
- [RFC 9110 Section 15.6: Server Error Responses](https://www.rfc-editor.org/rfc/rfc9110.html#section-15.6)
- [RFC 9113 Section 5.2: Flow Control](https://www.rfc-editor.org/rfc/rfc9113.html#section-5.2)
- [RFC 9113 Section 6.4: RST_STREAM](https://www.rfc-editor.org/rfc/rfc9113.html#section-6.4)

## Issues Found

- The primary example called an undefined `backoff` function and therefore did not compile. Added a simple exponential backoff implementation using 100 milliseconds as the base delay.
- The pooling explanation said that creating any new client defeats pooling. Connection pools belong to the transport, and clients with a nil transport share `http.DefaultTransport`; the text now identifies a fresh transport, or a client with its own fresh transport, as the operation that defeats pooling.
- The post did not account for Go 1.27, which added a bounded asynchronous drain when an unread HTTP/1 response body is closed. Added the version-specific behavior and clarified when an explicit bounded drain remains useful.
- The `io.CopyN` explanation implied that every short read ends with `io.EOF`. It now allows for other read errors, including truncated-body and network errors, and explains that the body is still closed.
- The drain limit was described as bounded without distinguishing bytes from time. Added guidance to use a context deadline or `Client.Timeout` because a slow or stalled peer can otherwise delay the bounded-byte drain.
- The opening ownership statement covered every response returned by `Client.Do`, even though a response returned with a non-nil error can be ignored and its body is already closed. It now scopes caller ownership to responses returned with a nil error.
- The retry predicate used `StatusCode >= 500`, which also matched nonstandard three-digit codes above 599. It is now limited to the 5xx range.
- The request-replay wording now names `http.NewRequestWithContext`, the constructor used by the example, and clarifies that an idempotency key must be enforced by the server.

## Review Notes

- Treating every 5xx response as retryable is a broad application policy, not an HTTP guarantee; unchanged retries for statuses such as 501 and 505 are usually not productive.
- Production retry code should consider `Retry-After` on 429 and 503 responses and add jitter to exponential backoff when many clients can retry together.
- `io.ReadAll` leaves successful response size unbounded. That is consistent with this function's `[]byte` return type, but callers handling untrusted large responses might need a size limit or streaming API.
- The corrected combined snippets passed `gofmt`, `go test`, and `go vet` with Go 1.25.3. The APIs used are current and not deprecated.
- All external links in the post resolved to the intended Go documentation, RFC section, release notes, or author profile during validation.
