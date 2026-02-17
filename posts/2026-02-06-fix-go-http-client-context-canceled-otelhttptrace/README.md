# How to Fix Go HTTP Client Spans Showing 'context canceled' Due to otelhttptrace Timeout Race Conditions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, HTTP Client, Race Conditions

Description: Resolve race conditions in Go HTTP client instrumentation where otelhttptrace causes context canceled errors on timeouts.

If you are using `otelhttptrace` to instrument your Go HTTP client and you have timeouts configured, you might see spans with a "context canceled" status even though the HTTP request completed successfully. This is a race condition between the HTTP client timeout mechanism and the trace instrumentation.

## The Problem Setup

A typical instrumented HTTP client looks like this:

```go
import (
    "net/http"
    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/contrib/instrumentation/net/http/httptrace/otelhttptrace"
)

func newHTTPClient() *http.Client {
    return &http.Client{
        Timeout: 5 * time.Second,
        Transport: otelhttp.NewTransport(
            http.DefaultTransport,
            otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
                return otelhttptrace.NewClientTrace(ctx)
            }),
        ),
    }
}
```

When a request takes close to the 5-second timeout, you may see the span recorded with an error status of "context canceled" even though the response body was fully read and processed.

## Why the Race Condition Occurs

The `http.Client.Timeout` works by creating a context with a deadline internally. When the deadline hits, Go cancels the context. The `otelhttptrace` hooks listen for context cancellation to record span events. Here is what happens in the race window:

1. The HTTP response headers arrive just before the timeout
2. The response body starts being read
3. The timeout fires and cancels the context
4. `otelhttptrace` sees the cancellation and marks the span as errored
5. Meanwhile, the body read actually completed successfully

The span ends up with both a successful HTTP status code and a "context canceled" error, which is confusing.

## Fix Option 1: Use Transport-Level Timeouts Instead

Replace the `http.Client.Timeout` with per-connection timeouts on the transport:

```go
func newHTTPClient() *http.Client {
    transport := &http.Transport{
        // Set timeouts at the transport level instead of client level
        DialContext: (&net.Dialer{
            Timeout:   3 * time.Second, // connection timeout
            KeepAlive: 30 * time.Second,
        }).DialContext,
        TLSHandshakeTimeout:   3 * time.Second,
        ResponseHeaderTimeout:  5 * time.Second,
        // This avoids the client-level context cancellation race
    }

    return &http.Client{
        // Do NOT set Timeout here
        Transport: otelhttp.NewTransport(
            transport,
            otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
                return otelhttptrace.NewClientTrace(ctx)
            }),
        ),
    }
}
```

This way, timeouts are enforced at specific stages (dial, TLS, headers) rather than canceling the entire context.

## Fix Option 2: Use Request-Level Context Timeouts

Instead of client-level timeout, set the timeout on each request's context. This gives you more control:

```go
func fetchData(ctx context.Context, client *http.Client, url string) ([]byte, error) {
    // Create a timeout context for this specific request
    reqCtx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    req, err := http.NewRequestWithContext(reqCtx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    // Read the body before the context can be canceled
    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    return body, nil
}
```

## Fix Option 3: Filter Out Context Canceled Errors in a Custom Span Handler

If you cannot change the timeout mechanism, you can filter the false positives by wrapping the transport:

```go
// filterTransport wraps otelhttp transport and filters out
// false context canceled errors when the response was actually received.
type filterTransport struct {
    base http.RoundTripper
}

func (t *filterTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    resp, err := t.base.RoundTrip(req)

    // If we got a response but also a context error,
    // the response is what matters
    if resp != nil && err != nil && req.Context().Err() == context.Canceled {
        // Clear the error since the response was received
        // The span should reflect success, not cancellation
        return resp, nil
    }

    return resp, err
}
```

## Validating the Fix

After applying one of these fixes, you can verify the behavior with a test:

```go
func TestHTTPClientTimeout_NoFalseCancel(t *testing.T) {
    // Create a slow server that responds just before timeout
    srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(4500 * time.Millisecond) // 4.5s, just under 5s timeout
        w.Write([]byte("ok"))
    }))
    defer srv.Close()

    exporter := tracetest.NewInMemoryExporter()
    tp := sdktrace.NewTracerProvider(sdktrace.WithSyncer(exporter))
    otel.SetTracerProvider(tp)

    client := newHTTPClient()

    ctx := context.Background()
    resp, err := client.Get(srv.URL)
    if err != nil {
        t.Fatalf("request failed: %v", err)
    }
    resp.Body.Close()

    tp.ForceFlush(ctx)

    // Check that no span has "context canceled" error
    for _, span := range exporter.GetSpans() {
        if span.Status.Code == codes.Error {
            t.Errorf("span %q has error status: %s", span.Name, span.Status.Description)
        }
    }
}
```

## Summary

The race condition between `http.Client.Timeout` and `otelhttptrace` is a known issue in the Go OpenTelemetry ecosystem. The cleanest fix is to avoid client-level timeouts and use transport-level or request-level timeouts instead. This eliminates the window where context cancellation races with successful response handling.
