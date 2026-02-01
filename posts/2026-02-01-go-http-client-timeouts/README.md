# How to Handle HTTP Client Timeouts Properly in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, HTTP, Timeouts, Networking, Best Practices

Description: A practical guide to configuring HTTP client timeouts in Go to prevent resource leaks and hanging requests.

---

If you've ever had a Go service hang because an upstream API stopped responding, you know how painful missing timeout configuration can be. The default `http.Client` in Go has no timeout - it will wait forever. This is a footgun that catches many developers off guard.

In this post, we'll walk through the different timeout options available in Go's HTTP client, when to use each one, and how to avoid common mistakes that lead to resource leaks and unresponsive services.

## The Problem with Default http.Client

Let's start with what most developers write when they first use Go's HTTP client:

```go
// This code has no timeout - it will block forever if the server doesn't respond
resp, err := http.Get("https://api.example.com/data")
if err != nil {
    log.Fatal(err)
}
defer resp.Body.Close()
```

The `http.DefaultClient` used by `http.Get()` has a zero timeout, which means "wait indefinitely." In production, this is almost never what you want. A slow or unresponsive upstream service will cause your goroutines to pile up, consuming memory and file descriptors until your service crashes.

## Understanding the Different Timeout Layers

Go's HTTP client has multiple timeout settings that operate at different layers. Understanding these layers is crucial for proper configuration.

### 1. Client Timeout (End-to-End)

The simplest timeout to configure is the overall client timeout. This covers the entire request lifecycle - from connection establishment to reading the complete response body.

```go
// Create an HTTP client with a 30-second overall timeout
// This timeout covers: DNS lookup, TCP connection, TLS handshake,
// sending the request, and reading the entire response body
client := &http.Client{
    Timeout: 30 * time.Second,
}

resp, err := client.Get("https://api.example.com/data")
if err != nil {
    // This will be a timeout error if the request takes longer than 30s
    if os.IsTimeout(err) {
        log.Println("Request timed out")
    }
    return err
}
defer resp.Body.Close()
```

This is the easiest timeout to set and works well for most cases. However, it has a limitation - the timer starts when the request begins and includes the time spent reading the response body. For large downloads or streaming responses, this might not be appropriate.

### 2. Transport-Level Timeouts

For more granular control, you can configure timeouts on the `http.Transport`. This gives you control over connection-level timing separate from the request itself.

```go
// Create a custom transport with fine-grained timeout control
transport := &http.Transport{
    // Maximum time to wait for a TCP connection to be established
    DialContext: (&net.Dialer{
        Timeout:   10 * time.Second,  // Connection timeout
        KeepAlive: 30 * time.Second,  // TCP keepalive interval
    }).DialContext,
    
    // Maximum time to wait for TLS handshake to complete
    TLSHandshakeTimeout: 10 * time.Second,
    
    // Maximum time to wait for response headers after sending request
    ResponseHeaderTimeout: 20 * time.Second,
    
    // Maximum time an idle connection sits in the pool
    IdleConnTimeout: 90 * time.Second,
    
    // Connection pool settings
    MaxIdleConns:        100,
    MaxIdleConnsPerHost: 10,
    MaxConnsPerHost:     100,
}

client := &http.Client{
    Transport: transport,
    Timeout:   60 * time.Second,  // Overall request timeout
}
```

Here's what each timeout controls:

- **Dial Timeout**: How long to wait for the TCP connection to be established. Set this lower for services that should respond quickly.
- **TLS Handshake Timeout**: Time limit for the TLS negotiation. Useful when connecting to services with slow or overloaded TLS termination.
- **Response Header Timeout**: How long to wait for the server to send response headers after the request is sent. This catches slow backends that accept connections but take too long to process.
- **Idle Connection Timeout**: How long unused connections stay in the pool before being closed.

### 3. Context-Based Cancellation

For the most flexibility, use `context.Context` to control request cancellation. This approach lets you implement dynamic timeouts, tie request lifecycle to user actions, or cancel requests based on external signals.

```go
// Create a context with a 15-second timeout
// The context approach is more flexible than client.Timeout because
// you can cancel the request at any time, not just on timeout
ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
defer cancel()  // Always call cancel to release resources

// Create the request with context
req, err := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/data", nil)
if err != nil {
    return err
}

// Execute the request - it will be cancelled if context expires
resp, err := client.Do(req)
if err != nil {
    // Check if error was due to context cancellation or timeout
    if ctx.Err() == context.DeadlineExceeded {
        log.Println("Request timed out")
    } else if ctx.Err() == context.Canceled {
        log.Println("Request was cancelled")
    }
    return err
}
defer resp.Body.Close()
```

Context-based cancellation is particularly useful in HTTP handlers where you want to tie the outgoing request to the incoming request's context:

```go
// Handler that forwards requests to an upstream service
// The upstream request is automatically cancelled if the client disconnects
func handler(w http.ResponseWriter, r *http.Request) {
    // Use the incoming request's context - if the client disconnects,
    // this context gets cancelled and so does our upstream request
    ctx, cancel := context.WithTimeout(r.Context(), 10*time.Second)
    defer cancel()
    
    req, err := http.NewRequestWithContext(ctx, "GET", "https://upstream.example.com/api", nil)
    if err != nil {
        http.Error(w, "Failed to create request", http.StatusInternalServerError)
        return
    }
    
    resp, err := client.Do(req)
    if err != nil {
        if ctx.Err() != nil {
            // Client disconnected or timeout - don't bother responding
            return
        }
        http.Error(w, "Upstream request failed", http.StatusBadGateway)
        return
    }
    defer resp.Body.Close()
    
    // Copy response to client
    io.Copy(w, resp.Body)
}
```

## Reading Response Bodies with Timeouts

One subtle issue is that the `client.Timeout` stops the timer when response headers are received, not when the body is fully read. If you're downloading large files or dealing with streaming responses, you need additional protection.

```go
// Read response body with a separate timeout to prevent slow-loris style attacks
// where the server sends data very slowly to keep the connection open
func readBodyWithTimeout(resp *http.Response, timeout time.Duration) ([]byte, error) {
    // Create a channel to receive the result
    done := make(chan struct{})
    var body []byte
    var readErr error
    
    go func() {
        body, readErr = io.ReadAll(resp.Body)
        close(done)
    }()
    
    select {
    case <-done:
        return body, readErr
    case <-time.After(timeout):
        return nil, fmt.Errorf("body read timed out after %v", timeout)
    }
}

// Alternative approach using io.LimitReader to prevent memory exhaustion
func readBodySafely(resp *http.Response, maxBytes int64) ([]byte, error) {
    // Limit the amount of data we'll read to prevent memory exhaustion
    limitedReader := io.LimitReader(resp.Body, maxBytes)
    return io.ReadAll(limitedReader)
}
```

For streaming scenarios, consider using a deadline on the underlying connection:

```go
// Set a read deadline on the connection for streaming scenarios
// This requires accessing the underlying connection through Hijacker
func readWithDeadline(resp *http.Response, timeout time.Duration) error {
    // Use ResponseController for per-request deadline control (Go 1.20+)
    rc := http.NewResponseController(resp)
    if err := rc.SetReadDeadline(time.Now().Add(timeout)); err != nil {
        return fmt.Errorf("failed to set read deadline: %w", err)
    }
    
    // Now read operations will fail if they exceed the deadline
    _, err := io.Copy(io.Discard, resp.Body)
    return err
}
```

## Common Pitfalls and How to Avoid Them

### Pitfall 1: Not Closing Response Bodies

Even if a request times out, you must close the response body to prevent connection leaks:

```go
// Always close the response body, even on error paths
resp, err := client.Do(req)
if err != nil {
    return err
}
// This defer is crucial - without it, the connection leaks
defer resp.Body.Close()

// Even if you don't need the body, drain it to allow connection reuse
io.Copy(io.Discard, resp.Body)
```

### Pitfall 2: Forgetting to Cancel Contexts

When using `context.WithTimeout` or `context.WithCancel`, always call the cancel function:

```go
// BAD - cancel is never called, leaking resources
ctx, _ := context.WithTimeout(context.Background(), 10*time.Second)

// GOOD - cancel is deferred immediately
ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
defer cancel()
```

### Pitfall 3: Sharing Transport Incorrectly

The `http.Transport` maintains a connection pool and should be reused across requests. Creating a new transport for each request defeats connection pooling:

```go
// BAD - creates a new transport for each request, no connection reuse
func makeRequest() (*http.Response, error) {
    client := &http.Client{
        Transport: &http.Transport{
            TLSHandshakeTimeout: 10 * time.Second,
        },
    }
    return client.Get("https://api.example.com")
}

// GOOD - reuse a single client with configured transport
var client = &http.Client{
    Transport: &http.Transport{
        TLSHandshakeTimeout: 10 * time.Second,
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
    },
    Timeout: 30 * time.Second,
}

func makeRequest() (*http.Response, error) {
    return client.Get("https://api.example.com")
}
```

### Pitfall 4: ExpectContinueTimeout Confusion

If you're sending large request bodies, be aware of `ExpectContinueTimeout`:

```go
// When sending POST/PUT requests with bodies, the client can send
// "Expect: 100-continue" header and wait for server confirmation
// before sending the body. This timeout controls how long to wait.
transport := &http.Transport{
    ExpectContinueTimeout: 1 * time.Second,
}
```

## Testing Timeout Behavior

Testing timeout handling is often overlooked. Here's how to write tests that verify your timeout configuration works:

```go
// Test helper that creates a slow server for timeout testing
func TestClientTimeout(t *testing.T) {
    // Create a test server that delays its response
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Simulate a slow upstream by sleeping longer than client timeout
        time.Sleep(5 * time.Second)
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()
    
    // Create client with a short timeout
    client := &http.Client{
        Timeout: 1 * time.Second,
    }
    
    // Make request - should timeout
    _, err := client.Get(server.URL)
    
    // Verify we got a timeout error
    if err == nil {
        t.Fatal("expected timeout error, got nil")
    }
    if !os.IsTimeout(err) {
        t.Fatalf("expected timeout error, got: %v", err)
    }
}

// Test context cancellation
func TestContextCancellation(t *testing.T) {
    server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        time.Sleep(5 * time.Second)
        w.WriteHeader(http.StatusOK)
    }))
    defer server.Close()
    
    // Create a context we'll cancel manually
    ctx, cancel := context.WithCancel(context.Background())
    
    // Cancel after 100ms
    go func() {
        time.Sleep(100 * time.Millisecond)
        cancel()
    }()
    
    req, _ := http.NewRequestWithContext(ctx, "GET", server.URL, nil)
    _, err := http.DefaultClient.Do(req)
    
    // Verify request was cancelled
    if !errors.Is(err, context.Canceled) {
        t.Fatalf("expected context.Canceled, got: %v", err)
    }
}
```

## Putting It All Together

Here's a production-ready HTTP client configuration that handles most scenarios:

```go
// NewHTTPClient creates a production-ready HTTP client with sensible timeouts
func NewHTTPClient() *http.Client {
    transport := &http.Transport{
        // Connection settings
        DialContext: (&net.Dialer{
            Timeout:   5 * time.Second,   // TCP connection timeout
            KeepAlive: 30 * time.Second,  // TCP keepalive
        }).DialContext,
        
        // TLS settings
        TLSHandshakeTimeout: 5 * time.Second,
        
        // Response settings
        ResponseHeaderTimeout: 10 * time.Second,
        ExpectContinueTimeout: 1 * time.Second,
        
        // Connection pool settings
        MaxIdleConns:        100,
        MaxIdleConnsPerHost: 10,
        MaxConnsPerHost:     100,
        IdleConnTimeout:     90 * time.Second,
        
        // Disable compression if you want to handle it yourself
        DisableCompression: false,
    }
    
    return &http.Client{
        Transport: transport,
        Timeout:   30 * time.Second,  // Overall request timeout
    }
}

// DoRequestWithRetry wraps a request with timeout and retry logic
func DoRequestWithRetry(ctx context.Context, client *http.Client, req *http.Request, maxRetries int) (*http.Response, error) {
    var lastErr error
    
    for attempt := 0; attempt <= maxRetries; attempt++ {
        if attempt > 0 {
            // Exponential backoff between retries
            backoff := time.Duration(attempt*attempt) * 100 * time.Millisecond
            select {
            case <-ctx.Done():
                return nil, ctx.Err()
            case <-time.After(backoff):
            }
        }
        
        // Clone the request for retry (body needs special handling)
        reqCopy := req.Clone(ctx)
        
        resp, err := client.Do(reqCopy)
        if err != nil {
            lastErr = err
            // Retry on timeout or temporary errors
            if os.IsTimeout(err) || isTemporaryError(err) {
                continue
            }
            return nil, err
        }
        
        // Retry on 5xx errors
        if resp.StatusCode >= 500 {
            resp.Body.Close()
            lastErr = fmt.Errorf("server error: %d", resp.StatusCode)
            continue
        }
        
        return resp, nil
    }
    
    return nil, fmt.Errorf("max retries exceeded: %w", lastErr)
}

func isTemporaryError(err error) bool {
    var netErr net.Error
    return errors.As(err, &netErr) && netErr.Temporary()
}
```

## Summary

Proper timeout configuration in Go HTTP clients requires understanding multiple layers:

1. **Client.Timeout** for overall request duration
2. **Transport settings** for connection-level control
3. **Context** for dynamic cancellation and request-scoped timeouts
4. **Body reading** needs separate consideration for large or streaming responses

Always test your timeout behavior and remember to clean up resources - close response bodies and cancel contexts. A well-configured HTTP client is the difference between a resilient service and one that fails under pressure.

---

*Track HTTP request latencies and timeout rates with [OneUptime](https://oneuptime.com) - monitor your service dependencies in real-time.*
