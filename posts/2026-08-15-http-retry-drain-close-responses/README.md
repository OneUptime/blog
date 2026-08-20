# Drain and Close HTTP Responses Before Retrying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, HTTP, Retry, Connection, Backoff, Resource Management

Description: Prevent retry loops from leaking response bodies and exhausting connections by cleaning up every HTTP attempt before waiting.

---

An HTTP retry loop owns every response it receives with a nil error, including responses with error status codes. If it waits and retries without consuming or closing the previous body, it can strand connections and file descriptors until the client stalls.

In Go, close each attempt inside the loop. Do not defer all closes until the retry function returns.

## Why the Leak Appears Under Failure

Go's `http.Client.Do` returns a response for HTTP statuses such as `429` and `503`; those statuses are not transport errors. When `err` is `nil`, the response has a non-nil body that the caller must close.

The Go documentation also states that the default transport might not reuse an HTTP/1.x keep-alive connection unless the response body is read to EOF and closed. Starting with Go 1.27, closing an unread HTTP/1 response body also causes the transport to drain it asynchronously up to a conservative limit. Explicit bounded draining remains useful for earlier Go releases and when small-body cleanup should finish before backoff. A retry storm magnifies delayed cleanup because every attempt leaves another resource unavailable.

This pattern delays cleanup:

```go
for attempt := 0; attempt < maxAttempts; attempt++ {
	resp, err := client.Do(req)
	if err == nil {
		defer resp.Body.Close() // Runs only when the whole function returns.
	}
	// retry...
}
```

## Clean Up Before Backoff

Recreate the request for every attempt, classify the response, and clean it up before sleeping:

```go
package retryhttp

import (
	"context"
	"fmt"
	"io"
	"net/http"
	"time"
)

const maxErrorDrain = 64 << 10 // 64 KiB

func drainAndClose(resp *http.Response) {
	// Bodies smaller than the limit reach EOF synchronously and can allow
	// HTTP/1.x connection reuse. Close is required whether or not they do.
	_, _ = io.CopyN(io.Discard, resp.Body, maxErrorDrain)
	_ = resp.Body.Close()
}

func GetWithRetry(ctx context.Context, client *http.Client, url string) ([]byte, error) {
	for attempt := 0; attempt < 5; attempt++ {
		req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
		if err != nil {
			return nil, err
		}

		resp, err := client.Do(req)
		if err != nil {
			if attempt == 4 {
				return nil, err
			}
			if err := wait(ctx, backoff(attempt)); err != nil {
				return nil, err
			}
			continue
		}

		if resp.StatusCode >= 200 && resp.StatusCode < 300 {
			body, readErr := io.ReadAll(resp.Body)
			closeErr := resp.Body.Close()
			if readErr != nil {
				return nil, readErr
			}
			if closeErr != nil {
				return nil, closeErr
			}
			return body, nil
		}

		retryable := resp.StatusCode == http.StatusTooManyRequests ||
			(resp.StatusCode >= 500 && resp.StatusCode < 600)
		status := resp.StatusCode
		drainAndClose(resp) // Cleanup happens before any wait or next attempt.

		if !retryable || attempt == 4 {
			return nil, fmt.Errorf("request failed with HTTP %d", status)
		}
		if err := wait(ctx, backoff(attempt)); err != nil {
			return nil, err
		}
	}
	panic("unreachable")
}

func backoff(attempt int) time.Duration {
	return time.Duration(1<<attempt) * 100 * time.Millisecond
}

func wait(ctx context.Context, delay time.Duration) error {
	timer := time.NewTimer(delay)
	defer timer.Stop()
	select {
	case <-timer.C:
		return nil
	case <-ctx.Done():
		return ctx.Err()
	}
}
```

`io.CopyN` returns an error-normally `io.EOF` for a cleanly terminated body-when it cannot copy the requested number of bytes. That error is harmless for cleanup because the body is closed next. The 64 KiB cap bounds bytes, not elapsed time; use a context deadline or `Client.Timeout` if a peer can stall the response. In Go 1.27 and later, `Close` can also trigger the HTTP/1 transport's own bounded asynchronous drain. If cleanup stops before EOF, the connection might not be reused, but the bounded drains prevent an enormous or endless error body from being downloaded in full merely to save a socket.

## Rebuild Replayable Request Bodies

GET has no request body in the example. A POST body is normally consumed by the first attempt. Build each request from immutable bytes or a factory rather than reusing a disturbed reader:

```go
import "bytes"

func newRequest(ctx context.Context, endpoint string, payload []byte) (*http.Request, error) {
	return http.NewRequestWithContext(
		ctx,
		http.MethodPost,
		endpoint,
		bytes.NewReader(payload),
	)
}
```

`http.NewRequestWithContext` and `http.NewRequest` populate `GetBody` for common in-memory reader types, which helps the standard client replay bodies during some redirects. A custom application retry loop should still create a fresh request explicitly.

Only replay a mutating request when its semantics are idempotent, a server-enforced idempotency key protects it, or the application can prove the first attempt was not applied.

## Protocol Distinctions

Reading to EOF is specifically relevant to reuse of HTTP/1.x keep-alive connections. HTTP/2 multiplexes streams differently, but the caller must still close every response body. Cleanup also releases flow-control and client resources.

Reuse one `http.Client` and its transport across attempts. Creating a new transport, or a new client with its own transport, for every retry defeats connection pooling and can create a different resource problem.

## Official Documentation

- [Go `net/http` package](https://pkg.go.dev/net/http)
- [Go `http.Client.Do`](https://pkg.go.dev/net/http#Client.Do)
- [Go `http.Response.Body`](https://pkg.go.dev/net/http#Response)
- [Go `io.CopyN`](https://pkg.go.dev/io#CopyN)
- [Go 1.27 release notes](https://go.dev/doc/go1.27)
- [RFC 9110: Idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Conclusion

Every HTTP attempt has its own response lifecycle. Close before sleeping; when explicit draining is needed, fully drain small error bodies and bound large drains. Recreate request bodies and reuse the client. Backoff cannot protect a service if the retry loop exhausts its own connection pool first.
