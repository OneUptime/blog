# Replay an HTTP Request Body Safely on Every Retry

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: HTTP, Go, Request Body, Retries, Streaming, Idempotency

Description: Rebuild consumed HTTP bodies for each retry with bounded buffers or fresh streams while preserving operation identity, cleanup, and payload integrity.

---

An HTTP request body is usually a stream, not an immutable value. The first transport attempt reads it until EOF. Reusing the same stream object for attempt two often sends zero bytes, sends only the unread suffix, or fails because the transport already closed it.

Safe retry code separates the logical payload from the per-attempt reader. Every attempt gets a fresh body positioned at byte zero, while the operation's idempotency key and content remain stable.

## Understand the One-Shot Boundary

In Go, <code>http.Request.Body</code> is an <code>io.ReadCloser</code>. The transport reads and closes an outgoing body, including on many error paths. <code>Request.Clone</code> makes only a shallow copy of the <code>Body</code> field, so cloning a request does not rewind it.

<code>http.NewRequest</code> can populate <code>GetBody</code> automatically when the supplied reader is a <code>*bytes.Buffer</code>, <code>*bytes.Reader</code>, or <code>*strings.Reader</code>. The standard client uses <code>GetBody</code> for redirects that preserve a body, and the transport uses replayability when deciding whether certain network errors are safe to retry. A custom retry loop must still request a fresh body itself.

This distinction matters:

~~~text
logical request: method, URL, headers, idempotency identity, payload
attempt request: fresh context, fresh body reader, fresh transport execution
~~~

Do not reuse a request after calling <code>Client.Do</code> unless the library explicitly documents that use.

## Use a Body Factory

For a small, bounded payload, retain immutable bytes and create a reader per attempt:

~~~go
package retryhttp

import (
	"bytes"
	"context"
	"fmt"
	"io"
	"net/http"
)

type BodyFactory func() (io.ReadCloser, int64, error)

func BytesBody(payload []byte) BodyFactory {
	snapshot := bytes.Clone(payload)
	return func() (io.ReadCloser, int64, error) {
		return io.NopCloser(bytes.NewReader(snapshot)), int64(len(snapshot)), nil
	}
}

func newAttempt(
	ctx context.Context,
	method string,
	url string,
	idempotencyKey string,
	bodyFactory BodyFactory,
) (*http.Request, error) {
	body, length, err := bodyFactory()
	if err != nil {
		return nil, err
	}

	req, err := http.NewRequestWithContext(ctx, method, url, body)
	if err != nil {
		body.Close()
		return nil, err
	}

	req.ContentLength = length
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Idempotency-Key", idempotencyKey)
	req.GetBody = func() (io.ReadCloser, error) {
		fresh, _, err := bodyFactory()
		return fresh, err
	}
	return req, nil
}

func doAttempt(client *http.Client, req *http.Request) (*http.Response, error) {
	resp, err := client.Do(req)
	if err != nil {
		return nil, fmt.Errorf("send request: %w", err)
	}
	return resp, nil
}
~~~

The payload snapshot prevents a caller from mutating the byte slice between attempts. Set the correct content length only when it is known. Let the request use an unknown length and normal transfer framing when a fresh stream does not have a cheap, reliable size.

The retry loop should create a new attempt context and call <code>newAttempt</code> each time. It must not modify the idempotency key or logical payload after the first send.

## Reopen Large or Streaming Sources

Buffering a multi-gigabyte upload in memory is not a safe replay strategy. Choose a source that can produce independent readers:

- reopen a stable file by path and verify its identity has not changed;
- open a new object-store reader for an immutable object version;
- spool a bounded stream to durable temporary storage before the first send;
- use the API's resumable or multipart upload protocol;
- declare the operation non-retryable when no replayable source exists.

A file factory can open a new descriptor on every attempt:

~~~go
func FileBody(path string, expectedSize int64) BodyFactory {
	return func() (io.ReadCloser, int64, error) {
		f, err := os.Open(path)
		if err != nil {
			return nil, 0, err
		}
		info, err := f.Stat()
		if err != nil {
			f.Close()
			return nil, 0, err
		}
		if info.Size() != expectedSize {
			f.Close()
			return nil, 0, fmt.Errorf("body changed: size is %d", info.Size())
		}
		return f, info.Size(), nil
	}
}
~~~

Size alone does not prove immutability. For sensitive operations, hold a stable file descriptor, use an immutable source version, or verify a content digest. If the source can change while retries run, copying it once to controlled storage is safer than reopening a mutable path.

For a truly live stream, bytes already consumed may be impossible to reproduce. A resumable protocol should assign chunks or offsets durable identities so the server can acknowledge progress. Retrying the entire stream without that contract can duplicate accepted data.

## Preserve Payload Semantics

The second attempt must represent the same operation, but not every wire header must be frozen:

- keep the content type, content encoding, conditional headers, and logical body consistent;
- keep the same API-defined idempotency key;
- regenerate expiring authorization, dates, nonces, and signatures when the protocol requires it;
- recalculate a signature over exactly the bytes and headers sent by that attempt;
- do not silently recompress or reserialize a logical object differently if the server deduplicates by payload bytes.

If an API validates a digest such as <code>Content-MD5</code> or a vendor checksum, calculate it from the retained immutable source. A digest detects accidental variation; it does not create idempotency on its own.

## Close Every Response Before Backoff

When <code>Client.Do</code> returns a response, the caller owns its body and must close it. In Go, failing to both read as appropriate and close the response body can prevent connection reuse. Do not defer every close inside a long retry loop because all closes would wait until the function returns.

~~~go
resp, err := client.Do(req)
if err == nil {
	preview, readErr := io.ReadAll(io.LimitReader(resp.Body, 64<<10))
	closeErr := resp.Body.Close()

	// Classify resp.StatusCode and the bounded preview here.
	_ = preview
	_ = readErr
	_ = closeErr
}
~~~

Whether to drain a response fully is a protocol and size decision. Never read an unbounded error body merely to reuse a connection. A bounded read plus close is safe for memory, though the connection might not be reusable when unread data remains. Do not start the backoff sleep while retaining a response body or connection-bound resource unnecessarily.

## Test Actual Bytes Across Attempts

Use a test server that records the body of every attempt, returns a transient failure, then succeeds. Assert:

- every recorded body equals the original byte sequence;
- content length and digest match each attempt;
- the same idempotency key is present;
- a mutable caller buffer cannot alter later attempts;
- a body-factory failure stops before sending;
- cancellation while opening or sending releases the source.

Also test a transport failure, not only an HTTP error response. HTTP libraries can close the request body on paths that a simple mock does not model.

## Official Documentation

- [Go net/http package documentation](https://pkg.go.dev/net/http)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)

## Conclusion

Treat request bodies as consumed after each send. Retain a bounded immutable payload, reopen an immutable source, or use a resumable protocol, then construct a fresh request for every attempt. Replay safety also requires stable operation identity, correct response cleanup, and a server contract that makes repeating the side effect safe.
