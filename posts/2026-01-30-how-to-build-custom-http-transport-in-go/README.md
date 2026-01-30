# How to Build Custom HTTP Transport in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, HTTP, Networking, Performance

Description: Learn how to build and configure custom HTTP transports in Go for connection pooling, timeouts, and advanced networking scenarios.

---

Go's `net/http` package provides a powerful and flexible HTTP client. At its core lies the `http.Transport`, which handles the low-level details of making HTTP requests. Understanding how to customize it gives you fine-grained control over connection management, timeouts, and request handling.

## Understanding http.Transport and http.RoundTripper

The `http.RoundTripper` interface is the foundation of HTTP transport in Go. It defines a single method:

```go
type RoundTripper interface {
    RoundTrip(*Request) (*Response, error)
}
```

The `http.Transport` struct implements this interface and manages connection pooling, TLS handshakes, and proxies. When you use `http.DefaultClient`, it uses `http.DefaultTransport` under the hood.

## Creating a Custom Transport

Here's how to create a transport with custom settings:

```go
package main

import (
    "crypto/tls"
    "net"
    "net/http"
    "time"
)

func NewCustomTransport() *http.Transport {
    return &http.Transport{
        // Connection pooling settings
        MaxIdleConns:        100,              // Max idle connections across all hosts
        MaxIdleConnsPerHost: 10,               // Max idle connections per host
        MaxConnsPerHost:     100,              // Max total connections per host (0 = unlimited)
        IdleConnTimeout:     90 * time.Second, // How long idle connections stay in pool

        // Timeout settings
        DialContext: (&net.Dialer{
            Timeout:   30 * time.Second, // Time to establish TCP connection
            KeepAlive: 30 * time.Second, // TCP keepalive interval
        }).DialContext,
        TLSHandshakeTimeout:   10 * time.Second, // Time for TLS handshake
        ResponseHeaderTimeout: 10 * time.Second, // Time to wait for response headers
        ExpectContinueTimeout: 1 * time.Second,  // Time to wait for 100-continue

        // Enable HTTP/2 (disabled by setting to true)
        ForceAttemptHTTP2: true,
    }
}

func main() {
    transport := NewCustomTransport()

    client := &http.Client{
        Transport: transport,
        Timeout:   60 * time.Second, // Overall request timeout
    }

    resp, err := client.Get("https://api.example.com/data")
    if err != nil {
        panic(err)
    }
    defer resp.Body.Close()
}
```

## Configuring Proxy Settings

You can route requests through a proxy server:

```go
func NewProxyTransport(proxyURL string) (*http.Transport, error) {
    proxy, err := url.Parse(proxyURL)
    if err != nil {
        return nil, err
    }

    return &http.Transport{
        Proxy: http.ProxyURL(proxy),
        // Or use environment variables:
        // Proxy: http.ProxyFromEnvironment,

        MaxIdleConns:       100,
        IdleConnTimeout:    90 * time.Second,
        DisableCompression: false,
    }, nil
}
```

## Custom TLS Configuration

For scenarios requiring custom certificate verification or specific TLS versions:

```go
func NewSecureTransport() *http.Transport {
    tlsConfig := &tls.Config{
        MinVersion: tls.VersionTLS12,
        MaxVersion: tls.VersionTLS13,

        // Prefer server cipher suites
        PreferServerCipherSuites: true,

        // Custom cipher suites (optional)
        CipherSuites: []uint16{
            tls.TLS_ECDHE_RSA_WITH_AES_256_GCM_SHA384,
            tls.TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256,
        },

        // Skip verification only for testing - never in production
        // InsecureSkipVerify: false,
    }

    return &http.Transport{
        TLSClientConfig:     tlsConfig,
        TLSHandshakeTimeout: 10 * time.Second,
        MaxIdleConns:        100,
        IdleConnTimeout:     90 * time.Second,
    }
}
```

## Implementing a Custom RoundTripper for Logging

One of the most useful patterns is wrapping the transport to add logging or metrics:

```go
// LoggingTransport wraps an http.RoundTripper to log requests
type LoggingTransport struct {
    Transport http.RoundTripper
    Logger    *log.Logger
}

func (t *LoggingTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    start := time.Now()

    // Log the outgoing request
    t.Logger.Printf("Request: %s %s", req.Method, req.URL.String())

    // Call the underlying transport
    resp, err := t.Transport.RoundTrip(req)

    duration := time.Since(start)

    if err != nil {
        t.Logger.Printf("Error: %s %s - %v (took %v)",
            req.Method, req.URL.String(), err, duration)
        return nil, err
    }

    t.Logger.Printf("Response: %s %s - %d (took %v)",
        req.Method, req.URL.String(), resp.StatusCode, duration)

    return resp, nil
}

func NewLoggingClient() *http.Client {
    logger := log.New(os.Stdout, "[HTTP] ", log.LstdFlags)

    return &http.Client{
        Transport: &LoggingTransport{
            Transport: NewCustomTransport(),
            Logger:    logger,
        },
        Timeout: 30 * time.Second,
    }
}
```

## Adding Metrics Collection

Extend the pattern to collect metrics for monitoring:

```go
// MetricsTransport collects request metrics
type MetricsTransport struct {
    Transport    http.RoundTripper
    RequestCount int64
    ErrorCount   int64
    mu           sync.Mutex
}

func (t *MetricsTransport) RoundTrip(req *http.Request) (*http.Response, error) {
    t.mu.Lock()
    t.RequestCount++
    t.mu.Unlock()

    resp, err := t.Transport.RoundTrip(req)

    if err != nil {
        t.mu.Lock()
        t.ErrorCount++
        t.mu.Unlock()
    }

    return resp, err
}

func (t *MetricsTransport) Stats() (requests, errors int64) {
    t.mu.Lock()
    defer t.mu.Unlock()
    return t.RequestCount, t.ErrorCount
}
```

## Transport Reuse Best Practices

Proper transport management prevents resource leaks and improves performance:

```go
// Global transport - create once, reuse everywhere
var globalTransport = NewCustomTransport()

// GetClient returns a client using the shared transport
func GetClient() *http.Client {
    return &http.Client{
        Transport: globalTransport,
        Timeout:   30 * time.Second,
    }
}

// CloseIdleConnections releases unused connections
func CloseIdleConnections() {
    globalTransport.CloseIdleConnections()
}
```

Key practices to follow:

1. **Reuse transports**: Creating a new transport for each request wastes resources and prevents connection reuse.

2. **Set appropriate timeouts**: Always configure timeouts to prevent hanging requests.

3. **Close response bodies**: Always call `resp.Body.Close()` to return connections to the pool.

4. **Read the full response**: Even if you don't need the body, drain it before closing to allow connection reuse.

```go
// Proper response handling
resp, err := client.Get(url)
if err != nil {
    return err
}
defer resp.Body.Close()

// Drain the body to enable connection reuse
io.Copy(io.Discard, resp.Body)
```

## Conclusion

Custom HTTP transports in Go give you control over connection management, security, and observability. By understanding `http.Transport` and the `RoundTripper` interface, you can build HTTP clients tailored to your application's needs. Remember to reuse transports, set appropriate timeouts, and properly handle responses to get the best performance from your HTTP clients.
