# How to Fix Go HTTP Client Spans Showing 'context canceled' Due to otelhttptrace

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, HTTP Client, Race Condition

Description: Resolve race conditions in Go HTTP client instrumentation where otelhttptrace causes context canceled errors on timeouts.

If you are using `otelhttp` with `otelhttptrace` to instrument your Go HTTP client and you have timeouts configured, you might see spans with a "context canceled" or "context deadline exceeded" status when the timeout interrupts the response body read. This is a race between the HTTP client timeout mechanism and response processing.

## The Problem Setup

A typical instrumented HTTP client looks like this:

```go
import (
    "context"
    "net/http"
    "net/http/httptrace"
    "time"

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

When a request takes close to the 5-second timeout, you may see the span recorded with an error status if the timeout fires while the response body is still being read.

## Why the Race Condition Occurs

The `http.Client.Timeout` covers the whole request, including connection setup, redirects, and reading the response body. The timer keeps running after `Get`, `Post`, or `Do` returns and can interrupt later reads from `Response.Body`. `otelhttp` ends the client span when the response body is closed or a read returns `io.EOF`, and it records read errors on that span. Here is what happens in the race window:

1. The HTTP response headers arrive just before the timeout
2. The response body starts being read
3. The timeout fires and cancels the context
4. A response body read returns a context cancellation or deadline error
5. `otelhttp` records that read error on the client span

The span can end up with an HTTP status code from the response headers and an error from the failed body read, which is confusing if you only look at the status code.

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

This way, timeouts are enforced at specific stages (dial, TLS, headers) rather than canceling the request while the response body is being read. If you still need a maximum time for reading the body, enforce that separately and treat a body read timeout as a real failed request.

## Fix Option 2: Use Request-Level Context Timeouts

Instead of client-level timeout, set the timeout on each request's context with a client that does not also set `Timeout`. This gives you more control over each request's budget, but the request context still covers the entire lifetime of the request and response, including reading the body. Make sure the deadline includes enough time to read the body:

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

    body, err := io.ReadAll(resp.Body)
    if err != nil {
        return nil, err
    }

    return body, nil
}
```

## Fix Option 3: Avoid Per-Phase Sub-Spans

If the confusing error is on an `otelhttptrace` per-phase sub-span rather than the main `otelhttp` client span, you can configure `otelhttptrace` to record HTTP trace data as events and attributes on the parent span instead of separate sub-spans:

```go
Transport: otelhttp.NewTransport(
    transport,
    otelhttp.WithClientTrace(func(ctx context.Context) *httptrace.ClientTrace {
        return otelhttptrace.NewClientTrace(ctx, otelhttptrace.WithoutSubSpans())
    }),
),
```

Do not clear context cancellation errors in a `RoundTripper` wrapper. In Go's HTTP client, a non-nil response with a non-nil error is not the normal shape for a context timeout, and the OpenTelemetry span may already have recorded the error by the time the wrapper returns.

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
    _, err = io.ReadAll(resp.Body)
    resp.Body.Close()
    if err != nil {
        t.Fatalf("read response body: %v", err)
    }

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

The confusing interaction between `http.Client.Timeout` and OpenTelemetry HTTP client spans comes from the fact that the client timeout includes response body reads. The cleanest fix is to avoid client-level timeouts when you only need dial, TLS, or response-header limits, and use transport-level timeouts instead. Request-level context timeouts are still useful, but they must include enough time for the full response body because they also cancel body reads.
