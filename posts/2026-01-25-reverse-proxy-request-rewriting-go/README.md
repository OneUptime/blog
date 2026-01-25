# How to Build a Reverse Proxy with Request Rewriting in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Reverse Proxy, HTTP, Request Rewriting, Networking

Description: Learn how to build a production-ready reverse proxy in Go that rewrites requests on the fly, including path manipulation, header injection, and body transformation.

---

A reverse proxy sits between clients and your backend servers, forwarding requests while optionally modifying them. This is useful for routing traffic, adding authentication headers, rewriting URLs, or transforming request bodies before they reach your services.

Go's standard library makes this surprisingly straightforward. The `net/http/httputil` package provides `ReverseProxy`, which handles most of the heavy lifting. But the real power comes from customizing the request before it gets forwarded.

## The Basic Reverse Proxy

Let's start with the simplest possible reverse proxy that forwards all traffic to a backend server.

```go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
)

func main() {
    // Parse the backend URL where requests will be forwarded
    backend, err := url.Parse("http://localhost:8080")
    if err != nil {
        log.Fatal(err)
    }

    // Create the reverse proxy pointing to our backend
    proxy := httputil.NewSingleHostReverseProxy(backend)

    // Start the proxy server on port 3000
    log.Println("Reverse proxy listening on :3000")
    log.Fatal(http.ListenAndServe(":3000", proxy))
}
```

This works, but it just blindly forwards requests. The interesting part is what happens when you need to modify requests before they reach the backend.

## Rewriting Request Paths

One common use case is path rewriting. Maybe your proxy receives requests at `/api/v2/users` but needs to forward them to `/users` on the backend. The `Director` function is where this magic happens.

```go
package main

import (
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "strings"
)

func main() {
    backend, _ := url.Parse("http://localhost:8080")

    proxy := &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            // Set the target host and scheme
            req.URL.Scheme = backend.Scheme
            req.URL.Host = backend.Host
            req.Host = backend.Host

            // Strip the /api/v2 prefix from the path
            // "/api/v2/users" becomes "/users"
            if strings.HasPrefix(req.URL.Path, "/api/v2") {
                req.URL.Path = strings.TrimPrefix(req.URL.Path, "/api/v2")
                if req.URL.Path == "" {
                    req.URL.Path = "/"
                }
            }

            log.Printf("Forwarding: %s -> %s%s",
                req.RemoteAddr, backend.Host, req.URL.Path)
        },
    }

    log.Fatal(http.ListenAndServe(":3000", proxy))
}
```

The `Director` function receives the incoming request and modifies it in place before forwarding. You have full control over the URL, headers, and other request properties.

## Adding and Modifying Headers

Headers are where reverse proxies really shine. You can inject authentication tokens, add tracing IDs, or strip sensitive headers before forwarding.

```go
func createProxy(backend *url.URL, apiKey string) *httputil.ReverseProxy {
    return &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            req.URL.Scheme = backend.Scheme
            req.URL.Host = backend.Host
            req.Host = backend.Host

            // Add authentication header for the backend
            req.Header.Set("Authorization", "Bearer "+apiKey)

            // Add X-Forwarded headers so the backend knows the original client
            req.Header.Set("X-Forwarded-Host", req.Host)
            req.Header.Set("X-Forwarded-Proto", "https")

            // Generate or propagate a request ID for tracing
            requestID := req.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = generateRequestID()
            }
            req.Header.Set("X-Request-ID", requestID)

            // Remove headers that should not reach the backend
            req.Header.Del("X-Internal-Secret")
            req.Header.Del("Cookie") // Strip cookies if backend handles auth differently
        },
    }
}
```

This pattern is useful when your backend services expect certain headers but clients should not have to provide them directly.

## Rewriting the Request Body

Sometimes you need to modify the request body itself. Maybe you need to inject additional fields, transform the data format, or validate the payload before forwarding. This requires reading the body, modifying it, and replacing it with a new reader.

```go
package main

import (
    "bytes"
    "encoding/json"
    "io"
    "log"
    "net/http"
    "net/http/httputil"
    "net/url"
    "time"
)

func createBodyRewritingProxy(backend *url.URL) *httputil.ReverseProxy {
    return &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            req.URL.Scheme = backend.Scheme
            req.URL.Host = backend.Host
            req.Host = backend.Host

            // Only modify JSON POST/PUT requests
            if req.Method != http.MethodPost && req.Method != http.MethodPut {
                return
            }
            if req.Header.Get("Content-Type") != "application/json" {
                return
            }

            // Read the original body
            body, err := io.ReadAll(req.Body)
            if err != nil {
                log.Printf("Error reading body: %v", err)
                return
            }
            req.Body.Close()

            // Parse as JSON
            var data map[string]interface{}
            if err := json.Unmarshal(body, &data); err != nil {
                // Not valid JSON, forward as-is
                req.Body = io.NopCloser(bytes.NewReader(body))
                return
            }

            // Inject additional fields
            data["proxy_timestamp"] = time.Now().UTC().Format(time.RFC3339)
            data["proxy_version"] = "1.0"

            // Re-encode the modified body
            modified, _ := json.Marshal(data)
            req.Body = io.NopCloser(bytes.NewReader(modified))
            req.ContentLength = int64(len(modified))
            req.Header.Set("Content-Length", string(rune(len(modified))))
        },
    }
}
```

Note that you must update `ContentLength` when modifying the body, otherwise the backend may not read the entire payload or may hang waiting for more data.

## Handling Errors and Responses

The `ReverseProxy` also lets you intercept and modify responses from the backend using `ModifyResponse`. This is useful for adding response headers, logging, or transforming response bodies.

```go
proxy := &httputil.ReverseProxy{
    Director: func(req *http.Request) {
        req.URL.Scheme = backend.Scheme
        req.URL.Host = backend.Host
        req.Host = backend.Host
    },
    ModifyResponse: func(resp *http.Response) error {
        // Add security headers to all responses
        resp.Header.Set("X-Content-Type-Options", "nosniff")
        resp.Header.Set("X-Frame-Options", "DENY")

        // Log response status
        log.Printf("Backend responded: %d %s",
            resp.StatusCode, resp.Request.URL.Path)

        return nil
    },
    ErrorHandler: func(w http.ResponseWriter, req *http.Request, err error) {
        // Custom error handling when backend is unreachable
        log.Printf("Proxy error: %v", err)
        w.WriteHeader(http.StatusBadGateway)
        w.Write([]byte("Service temporarily unavailable"))
    },
}
```

The `ErrorHandler` is called when the proxy cannot connect to the backend. Without it, clients would see generic error messages or connection resets.

## Routing to Multiple Backends

Real proxies often need to route different paths to different backends. Here is a pattern that routes based on URL prefix.

```go
package main

import (
    "net/http"
    "net/http/httputil"
    "net/url"
    "strings"
)

type Router struct {
    routes map[string]*httputil.ReverseProxy
}

func NewRouter() *Router {
    return &Router{routes: make(map[string]*httputil.ReverseProxy)}
}

func (r *Router) AddRoute(prefix string, backend *url.URL) {
    proxy := &httputil.ReverseProxy{
        Director: func(req *http.Request) {
            req.URL.Scheme = backend.Scheme
            req.URL.Host = backend.Host
            req.Host = backend.Host
            // Strip the routing prefix
            req.URL.Path = strings.TrimPrefix(req.URL.Path, prefix)
            if req.URL.Path == "" {
                req.URL.Path = "/"
            }
        },
    }
    r.routes[prefix] = proxy
}

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
    // Find the matching route by longest prefix
    for prefix, proxy := range r.routes {
        if strings.HasPrefix(req.URL.Path, prefix) {
            proxy.ServeHTTP(w, req)
            return
        }
    }
    http.NotFound(w, req)
}

func main() {
    router := NewRouter()

    usersBackend, _ := url.Parse("http://users-service:8080")
    ordersBackend, _ := url.Parse("http://orders-service:8080")

    router.AddRoute("/api/users", usersBackend)
    router.AddRoute("/api/orders", ordersBackend)

    http.ListenAndServe(":3000", router)
}
```

## Production Considerations

Before deploying a reverse proxy, consider these operational concerns.

**Timeouts**: Set appropriate timeouts on the transport to avoid hanging connections.

```go
proxy.Transport = &http.Transport{
    DialContext: (&net.Dialer{
        Timeout:   30 * time.Second,
        KeepAlive: 30 * time.Second,
    }).DialContext,
    ResponseHeaderTimeout: 10 * time.Second,
    IdleConnTimeout:       90 * time.Second,
    MaxIdleConns:          100,
    MaxIdleConnsPerHost:   10,
}
```

**Buffering**: By default, responses are buffered. For streaming responses, set `FlushInterval` on the proxy.

**Hop-by-hop headers**: The proxy automatically removes hop-by-hop headers like `Connection` and `Transfer-Encoding`. Do not rely on these being forwarded.

**WebSocket support**: The basic reverse proxy does not handle WebSocket upgrades. You will need additional handling for WebSocket connections.

---

Building a reverse proxy in Go gives you fine-grained control over how requests flow through your infrastructure. The patterns here cover most common use cases, from simple path rewriting to full request body transformation. Start simple with the basic proxy, then add the request rewriting logic your application needs.
