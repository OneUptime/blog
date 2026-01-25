# How to Chain HTTP Middleware for Auth, Logging, and CORS in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Middleware, HTTP, Authentication, CORS, Logging

Description: A practical guide to building and chaining HTTP middleware in Go for authentication, request logging, and CORS handling - with reusable patterns you can drop into any project.

---

Middleware is one of those things that sounds fancy but is really just "code that runs before your handler." In Go, the standard library gives you everything you need to build powerful middleware chains without pulling in external packages. This guide walks through building auth, logging, and CORS middleware from scratch, then shows you how to chain them together cleanly.

## The Middleware Pattern in Go

Go's `http.Handler` interface is dead simple - it has one method: `ServeHTTP(ResponseWriter, *Request)`. Middleware wraps a handler and returns a new handler. That's it.

Here's the basic signature you'll see everywhere:

```go
// Middleware takes a handler and returns a new handler
func Middleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Do something before
        next.ServeHTTP(w, r)
        // Do something after
    })
}
```

## Building the Logging Middleware

Let's start with logging since it's the most straightforward. We want to capture the request method, path, duration, and response status.

The tricky part is capturing the status code - Go's `ResponseWriter` doesn't expose it after writing. We need a wrapper.

```go
package middleware

import (
    "log"
    "net/http"
    "time"
)

// responseWriter wraps http.ResponseWriter to capture the status code
type responseWriter struct {
    http.ResponseWriter
    status      int
    wroteHeader bool
}

func wrapResponseWriter(w http.ResponseWriter) *responseWriter {
    return &responseWriter{ResponseWriter: w, status: http.StatusOK}
}

func (rw *responseWriter) WriteHeader(code int) {
    if rw.wroteHeader {
        return
    }
    rw.status = code
    rw.wroteHeader = true
    rw.ResponseWriter.WriteHeader(code)
}

// Logging middleware logs request details and duration
func Logging(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        start := time.Now()

        // Wrap the response writer to capture status
        wrapped := wrapResponseWriter(w)

        // Call the next handler
        next.ServeHTTP(wrapped, r)

        // Log after the request completes
        log.Printf(
            "%s %s %d %s",
            r.Method,
            r.URL.Path,
            wrapped.status,
            time.Since(start),
        )
    })
}
```

## Building the CORS Middleware

CORS trips people up constantly. The key things to remember: preflight requests use OPTIONS, and you need to handle them before your actual handler runs.

```go
package middleware

import "net/http"

// CORSConfig holds CORS configuration
type CORSConfig struct {
    AllowedOrigins   []string
    AllowedMethods   []string
    AllowedHeaders   []string
    AllowCredentials bool
    MaxAge           int
}

// DefaultCORSConfig returns sensible defaults
func DefaultCORSConfig() CORSConfig {
    return CORSConfig{
        AllowedOrigins:   []string{"*"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE", "OPTIONS"},
        AllowedHeaders:   []string{"Content-Type", "Authorization"},
        AllowCredentials: false,
        MaxAge:           86400,
    }
}

// CORS middleware handles Cross-Origin Resource Sharing
func CORS(config CORSConfig) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            origin := r.Header.Get("Origin")

            // Check if origin is allowed
            allowed := false
            for _, o := range config.AllowedOrigins {
                if o == "*" || o == origin {
                    allowed = true
                    break
                }
            }

            if allowed && origin != "" {
                w.Header().Set("Access-Control-Allow-Origin", origin)

                if config.AllowCredentials {
                    w.Header().Set("Access-Control-Allow-Credentials", "true")
                }
            }

            // Handle preflight requests
            if r.Method == http.MethodOptions {
                w.Header().Set("Access-Control-Allow-Methods",
                    joinStrings(config.AllowedMethods, ", "))
                w.Header().Set("Access-Control-Allow-Headers",
                    joinStrings(config.AllowedHeaders, ", "))
                w.Header().Set("Access-Control-Max-Age",
                    fmt.Sprintf("%d", config.MaxAge))
                w.WriteHeader(http.StatusNoContent)
                return
            }

            next.ServeHTTP(w, r)
        })
    }
}

func joinStrings(strs []string, sep string) string {
    result := ""
    for i, s := range strs {
        if i > 0 {
            result += sep
        }
        result += s
    }
    return result
}
```

A common mistake is setting `Access-Control-Allow-Origin: *` when you also want credentials. Browsers reject this - you need to echo back the specific origin.

## Building the Auth Middleware

Auth middleware validates tokens and injects user info into the request context. This example uses JWT, but the pattern works for any auth scheme.

```go
package middleware

import (
    "context"
    "net/http"
    "strings"
)

// contextKey is a custom type to avoid context key collisions
type contextKey string

const UserContextKey contextKey = "user"

// User represents the authenticated user
type User struct {
    ID    string
    Email string
    Role  string
}

// TokenValidator is a function that validates tokens and returns user info
type TokenValidator func(token string) (*User, error)

// Auth middleware validates the Authorization header
func Auth(validate TokenValidator) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Extract token from Authorization header
            authHeader := r.Header.Get("Authorization")
            if authHeader == "" {
                http.Error(w, "missing authorization header", http.StatusUnauthorized)
                return
            }

            // Expect "Bearer <token>" format
            parts := strings.SplitN(authHeader, " ", 2)
            if len(parts) != 2 || parts[0] != "Bearer" {
                http.Error(w, "invalid authorization format", http.StatusUnauthorized)
                return
            }

            token := parts[1]

            // Validate the token
            user, err := validate(token)
            if err != nil {
                http.Error(w, "invalid token", http.StatusUnauthorized)
                return
            }

            // Add user to request context
            ctx := context.WithValue(r.Context(), UserContextKey, user)
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// GetUser extracts the user from the request context
func GetUser(r *http.Request) *User {
    user, ok := r.Context().Value(UserContextKey).(*User)
    if !ok {
        return nil
    }
    return user
}
```

Here's a simple JWT validator to go with it:

```go
package middleware

import (
    "errors"
    "github.com/golang-jwt/jwt/v5"
)

// NewJWTValidator creates a token validator using the given secret
func NewJWTValidator(secret string) TokenValidator {
    return func(tokenString string) (*User, error) {
        token, err := jwt.Parse(tokenString, func(t *jwt.Token) (interface{}, error) {
            // Validate signing method
            if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
                return nil, errors.New("unexpected signing method")
            }
            return []byte(secret), nil
        })

        if err != nil || !token.Valid {
            return nil, errors.New("invalid token")
        }

        claims, ok := token.Claims.(jwt.MapClaims)
        if !ok {
            return nil, errors.New("invalid claims")
        }

        return &User{
            ID:    claims["sub"].(string),
            Email: claims["email"].(string),
            Role:  claims["role"].(string),
        }, nil
    }
}
```

## Chaining Middleware Together

Now the fun part - combining these middleware. There are two common approaches.

**Manual chaining** works but gets ugly fast:

```go
// This works but nesting gets hard to read
handler := Logging(CORS(config)(Auth(validator)(myHandler)))
```

**A Chain helper** is much cleaner:

```go
package middleware

import "net/http"

// Chain creates a middleware chain that executes in order
func Chain(middlewares ...func(http.Handler) http.Handler) func(http.Handler) http.Handler {
    return func(final http.Handler) http.Handler {
        // Apply middleware in reverse order so they execute in the order provided
        for i := len(middlewares) - 1; i >= 0; i-- {
            final = middlewares[i](final)
        }
        return final
    }
}
```

Now chaining is readable:

```go
// Middleware executes left to right: Logging -> CORS -> Auth
chain := middleware.Chain(
    middleware.Logging,
    middleware.CORS(corsConfig),
    middleware.Auth(jwtValidator),
)

http.Handle("/api/users", chain(usersHandler))
```

## Putting It All Together

Here's a complete example showing everything wired up:

```go
package main

import (
    "encoding/json"
    "log"
    "net/http"

    "yourapp/middleware"
)

func main() {
    // Configure CORS
    corsConfig := middleware.CORSConfig{
        AllowedOrigins:   []string{"https://yourapp.com", "http://localhost:3000"},
        AllowedMethods:   []string{"GET", "POST", "PUT", "DELETE"},
        AllowedHeaders:   []string{"Content-Type", "Authorization"},
        AllowCredentials: true,
        MaxAge:           3600,
    }

    // Create JWT validator
    jwtValidator := middleware.NewJWTValidator("your-secret-key")

    // Build middleware chains for different route groups
    publicChain := middleware.Chain(
        middleware.Logging,
        middleware.CORS(corsConfig),
    )

    protectedChain := middleware.Chain(
        middleware.Logging,
        middleware.CORS(corsConfig),
        middleware.Auth(jwtValidator),
    )

    // Public routes
    http.Handle("/health", publicChain(http.HandlerFunc(healthHandler)))
    http.Handle("/login", publicChain(http.HandlerFunc(loginHandler)))

    // Protected routes
    http.Handle("/api/users", protectedChain(http.HandlerFunc(usersHandler)))
    http.Handle("/api/profile", protectedChain(http.HandlerFunc(profileHandler)))

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    json.NewEncoder(w).Encode(map[string]string{"status": "ok"})
}

func usersHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUser(r)
    if user == nil {
        http.Error(w, "unauthorized", http.StatusUnauthorized)
        return
    }

    json.NewEncoder(w).Encode(map[string]string{
        "message": "Hello, " + user.Email,
    })
}

func profileHandler(w http.ResponseWriter, r *http.Request) {
    user := middleware.GetUser(r)
    json.NewEncoder(w).Encode(user)
}

func loginHandler(w http.ResponseWriter, r *http.Request) {
    // Your login logic here
}
```

## Common Pitfalls to Avoid

**Order matters.** Put logging first so it captures everything. Put auth after CORS so preflight requests don't need tokens.

**Don't forget to call next.ServeHTTP.** If you return early (like in auth failure), that's fine. But forgetting to call the next handler means your actual route never runs.

**Be careful with response writer wrappers.** If you're wrapping the response writer, make sure you implement all the interfaces you need - `http.Flusher`, `http.Hijacker`, etc. The logging wrapper above is minimal and might break streaming responses.

**Context keys should be unexported types.** Using a custom type like `contextKey` prevents collisions with other packages that might use `"user"` as a context key.

**CORS with credentials requires specific origins.** You cannot use `*` for `Access-Control-Allow-Origin` when `Access-Control-Allow-Credentials` is true.

## Best Practices

Keep middleware focused on one thing. Auth middleware should only handle auth - don't mix in logging or CORS.

Make middleware configurable. Pass in validators, allowed origins, and other settings rather than hardcoding them.

Use context for passing data between middleware and handlers. It's the idiomatic way to attach request-scoped values.

Test middleware in isolation. Each middleware function should be testable on its own before you test the chain.

Consider timeouts. A request timeout middleware can prevent slow handlers from tying up connections forever:

```go
func Timeout(duration time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.TimeoutHandler(next, duration, "request timeout")
    }
}
```

## Wrapping Up

Go's middleware pattern is elegant because it uses the same interface throughout - `http.Handler` all the way down. You can build sophisticated request pipelines with just the standard library, no frameworks required.

The key insight is that middleware is just function composition. Once you see that each middleware is a function that takes a handler and returns a handler, chaining becomes obvious. Start with logging (it's the easiest), add CORS (browsers need it), then layer on auth and whatever else your app needs.
