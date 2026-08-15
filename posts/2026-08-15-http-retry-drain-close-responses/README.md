# Drain and Close HTTP Responses Before Retrying

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, HTTP, Retry, Connections, Backoff, Resource Management

Description: Prevent retry loops from leaking response bodies and exhausting connections by cleaning up every HTTP attempt before waiting.

---

An HTTP retry loop owns every response it receives, including error responses. If it waits and retries without consuming or closing the previous body, it can strand connections and file descriptors until the client stalls.

In Go, close each attempt inside the loop. Do not defer all closes until the retry function returns.

## Why the Leak Appears Under Failure

Go's `http.Client.Do` returns a response for HTTP statuses such as `429` and `503`; those statuses are not transport errors. When `err` is `nil`, the response has a non-nil body that the caller must close.

The Go documentation also states that the default transport might not reuse an HTTP/1.x keep-alive connection unless the response body is read to EOF and closed. A retry storm magnifies this mistake because every attempt leaves another resource unavailable.

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
	// Small bodies reach EOF and can allow HTTP/1.x connection reuse.
	// Large or endless bodies are bounded; Close then abandons reuse safely.
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
			resp.StatusCode >= 500
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

`io.CopyN` returns `io.EOF` when a body ends before the limit, which is harmless here. If the body exceeds the bound, closing it may prevent reuse of that connection, but it avoids downloading an attacker-controlled or enormous error body merely to save a socket.

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

`http.NewRequest` populates `GetBody` for common in-memory reader types, which helps the standard client replay bodies during some redirects. A custom application retry loop should still create a fresh request explicitly.

Only replay a mutating request when its semantics are idempotent, an idempotency key protects it, or the application can prove the first attempt was not applied.

## Protocol Distinctions

Reading to EOF is specifically relevant to reuse of HTTP/1.x keep-alive connections. HTTP/2 multiplexes streams differently, but the caller must still close every response body. Cleanup also releases flow-control and client resources.

Reuse one `http.Client` and its transport across attempts. Creating a new client for every retry defeats connection pooling and can create a different resource problem.

## Official Documentation

- [Go `net/http` package](https://pkg.go.dev/net/http)
- [Go `http.Client.Do`](https://pkg.go.dev/net/http#Client.Do)
- [Go `http.Response.Body`](https://pkg.go.dev/net/http#Response)
- [Go `io.CopyN`](https://pkg.go.dev/io#CopyN)
- [RFC 9110: Idempotent methods](https://www.rfc-editor.org/rfc/rfc9110.html#section-9.2.2)

## Conclusion

Every HTTP attempt has its own response lifecycle. Fully drain small error bodies, bound large drains, close before sleeping, recreate request bodies, and reuse the client. Backoff cannot protect a service if the retry loop exhausts its own connection pool first.
