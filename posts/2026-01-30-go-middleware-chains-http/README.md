# How to Implement Middleware Chains in Go HTTP Servers

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Middleware, HTTP, Web Development, Design Patterns

Description: Learn how to build composable middleware chains in Go for logging, authentication, rate limiting, and more using the standard library.

---

Middleware is one of those patterns that seems simple on the surface but becomes incredibly powerful once you understand how to chain multiple handlers together. In Go, the standard library gives us everything we need to build clean, composable middleware without relying on external frameworks.

## What is Middleware?

Middleware sits between the incoming HTTP request and your actual handler. It can inspect requests, modify responses, short-circuit the request pipeline, or pass control to the next handler in the chain.

```mermaid
flowchart LR
    A[Request] --> B[Logging Middleware]
    B --> C[Auth Middleware]
    C --> D[Rate Limit Middleware]
    D --> E[Handler]
    E --> F[Response]
```

## The Foundation: http.Handler Interface

Everything in Go's HTTP world revolves around a simple interface:

```go
type Handler interface {
    ServeHTTP(ResponseWriter, *Request)
}
```

Any type that implements this interface can handle HTTP requests. The `http.HandlerFunc` type lets us use regular functions as handlers:

```go
// HandlerFunc is an adapter that lets us use ordinary functions as HTTP handlers
type HandlerFunc func(ResponseWriter, *Request)

func (f HandlerFunc) ServeHTTP(w ResponseWriter, r *Request) {
    f(w, r)
}
```

## Building Your First Middleware

A middleware function takes a handler and returns a new handler. This pattern allows you to wrap any handler with additional behavior.

Here is a basic logging middleware:

```go
package main

import (
    "log"
    "net/http"
    "time"
)

// LoggingMiddleware wraps a handler and logs request details
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Call the next handler in the chain
        next.ServeHTTP(w, r)

        // Log after the request completes
        log.Printf(
            "%s %s %s %v",
            r.Method,
            r.RequestURI,
            r.RemoteAddr,
            time.Since(start),
        )
    })
}
```

## Capturing Response Status Codes

The standard `http.ResponseWriter` does not expose the status code after writing. You need a wrapper to capture it:

```go
// responseWriter wraps http.ResponseWriter to capture the status code
type responseWriter struct {
    http.ResponseWriter
    statusCode int
}

// WriteHeader captures the status code before writing
func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

// EnhancedLoggingMiddleware captures and logs the response status
func EnhancedLoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap the response writer to capture status code
        wrapped := &responseWriter{
            ResponseWriter: w,
            statusCode:     http.StatusOK, // Default status
        }

        next.ServeHTTP(wrapped, r)

        log.Printf(
            "%d %s %s %v",
            wrapped.statusCode,
            r.Method,
            r.RequestURI,
            time.Since(start),
        )
    })
}
```

## Authentication Middleware

Middleware can short-circuit the chain by not calling `next.ServeHTTP`:

```go
// AuthMiddleware checks for a valid API key before proceeding
func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        apiKey := r.Header.Get("X-API-Key")

        // Validate the API key
        if apiKey == "" || !isValidAPIKey(apiKey) {
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return // Stop the chain here
        }

        // API key is valid, proceed to next handler
        next.ServeHTTP(w, r)
    })
}

func isValidAPIKey(key string) bool {
    // In production, check against a database or key store
    validKeys := map[string]bool{
        "secret-key-123": true,
        "another-key-456": true,
    }
    return validKeys[key]
}
```

## Passing Data Through Context

Use `context.Context` to pass data between middleware and handlers:

```go
package main

import (
    "context"
    "net/http"
)

// Define a custom type for context keys to avoid collisions
type contextKey string

const userIDKey contextKey = "userID"

// UserIDMiddleware extracts user ID and stores it in context
func UserIDMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        userID := r.Header.Get("X-User-ID")

        if userID != "" {
            // Create a new context with the user ID
            ctx := context.WithValue(r.Context(), userIDKey, userID)
            // Create a new request with the updated context
            r = r.WithContext(ctx)
        }

        next.ServeHTTP(w, r)
    })
}

// GetUserID retrieves the user ID from context
func GetUserID(ctx context.Context) string {
    if userID, ok := ctx.Value(userIDKey).(string); ok {
        return userID
    }
    return ""
}

// Handler that uses the user ID from context
func profileHandler(w http.ResponseWriter, r *http.Request) {
    userID := GetUserID(r.Context())
    if userID == "" {
        http.Error(w, "User ID required", http.StatusBadRequest)
        return
    }
    w.Write([]byte("Profile for user: " + userID))
}
```

## Chaining Middleware Manually

You can nest middleware by wrapping handlers:

```go
func main() {
    // Create the final handler
    handler := http.HandlerFunc(profileHandler)

    // Wrap with middleware (innermost to outermost)
    wrapped := LoggingMiddleware(
        AuthMiddleware(
            UserIDMiddleware(handler),
        ),
    )

    http.ListenAndServe(":8080", wrapped)
}
```

This works, but it gets messy with many middleware layers.

## Building a Middleware Chain Helper

A chain function makes composition cleaner:

```go
// Middleware represents a function that wraps an http.Handler
type Middleware func(http.Handler) http.Handler

// Chain applies middleware in the order they are passed
// The first middleware wraps the outermost layer
func Chain(handler http.Handler, middlewares ...Middleware) http.Handler {
    // Apply in reverse order so first middleware is outermost
    for i := len(middlewares) - 1; i >= 0; i-- {
        handler = middlewares[i](handler)
    }
    return handler
}

func main() {
    handler := http.HandlerFunc(profileHandler)

    // Much cleaner chaining
    wrapped := Chain(
        handler,
        LoggingMiddleware,    // First (outermost)
        AuthMiddleware,       // Second
        UserIDMiddleware,     // Third (closest to handler)
    )

    http.ListenAndServe(":8080", wrapped)
}
```

## Rate Limiting Middleware

Here is a practical example using Go's `sync` package for simple rate limiting:

```go
package main

import (
    "net/http"
    "sync"
    "time"
)

// RateLimiter tracks request counts per IP
type RateLimiter struct {
    mu       sync.Mutex
    requests map[string][]time.Time
    limit    int
    window   time.Duration
}

// NewRateLimiter creates a rate limiter with the specified limit per time window
func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
    return &RateLimiter{
        requests: make(map[string][]time.Time),
        limit:    limit,
        window:   window,
    }
}

// Allow checks if a request from the given IP should be allowed
func (rl *RateLimiter) Allow(ip string) bool {
    rl.mu.Lock()
    defer rl.mu.Unlock()

    now := time.Now()
    windowStart := now.Add(-rl.window)

    // Filter out old requests
    var recent []time.Time
    for _, t := range rl.requests[ip] {
        if t.After(windowStart) {
            recent = append(recent, t)
        }
    }

    if len(recent) >= rl.limit {
        rl.requests[ip] = recent
        return false
    }

    rl.requests[ip] = append(recent, now)
    return true
}

// RateLimitMiddleware creates middleware that enforces rate limits
func RateLimitMiddleware(limiter *RateLimiter) Middleware {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            ip := r.RemoteAddr

            if !limiter.Allow(ip) {
                http.Error(w, "Rate limit exceeded", http.StatusTooManyRequests)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}
```

## Putting It All Together

Here is a complete example combining everything:

```go
package main

import (
    "log"
    "net/http"
    "time"
)

func main() {
    // Create rate limiter: 100 requests per minute
    limiter := NewRateLimiter(100, time.Minute)

    // Define routes
    mux := http.NewServeMux()

    // Public endpoint with just logging
    mux.Handle("/health", Chain(
        http.HandlerFunc(healthHandler),
        EnhancedLoggingMiddleware,
    ))

    // Protected endpoint with full middleware stack
    mux.Handle("/api/profile", Chain(
        http.HandlerFunc(profileHandler),
        EnhancedLoggingMiddleware,
        RateLimitMiddleware(limiter),
        AuthMiddleware,
        UserIDMiddleware,
    ))

    log.Println("Server starting on :8080")
    http.ListenAndServe(":8080", mux)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.Write([]byte("OK"))
}
```

## Key Takeaways

1. **Keep middleware focused**: Each middleware should do one thing well.

2. **Order matters**: Logging should typically be first (outermost) to capture all requests. Authentication should come before business logic.

3. **Use context for data passing**: Avoid global state by using `context.WithValue` to pass request-scoped data.

4. **Create reusable helpers**: A `Chain` function makes your code more readable and maintainable.

5. **Handle errors gracefully**: Middleware that short-circuits should return appropriate HTTP status codes.

The middleware pattern in Go demonstrates how simple interfaces can enable powerful composition. With just `http.Handler` and a few wrapper functions, you can build a flexible, testable HTTP pipeline that handles cross-cutting concerns cleanly.
