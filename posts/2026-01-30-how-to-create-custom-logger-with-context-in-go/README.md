# How to Create Custom Logger with Context in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Logging, Context, Observability

Description: Learn how to build a custom logger in Go that propagates context values like request IDs and trace information for better observability.

---

Effective logging is crucial for debugging and monitoring production applications. In Go, combining the `context.Context` package with structured logging creates a powerful pattern for tracking requests across your system. This guide walks you through building a custom logger that automatically includes contextual information like request IDs and trace data.

## Understanding context.Context Basics

The `context.Context` type in Go carries deadlines, cancellation signals, and request-scoped values across API boundaries. It is the standard way to pass request-specific data through your application.

```go
// context.Context provides four main capabilities:
// 1. Deadlines - context.WithDeadline, context.WithTimeout
// 2. Cancellation - context.WithCancel
// 3. Values - context.WithValue (what we use for logging)
// 4. Done channel - for cancellation signaling
```

## Defining Context Keys and Logger Types

First, create a custom type for context keys to avoid collisions with other packages.

```go
package logger

import (
    "context"
    "log/slog"
    "os"
)

// contextKey is a custom type for context keys to prevent collisions.
type contextKey string

const (
    // loggerKey stores the logger instance in context.
    loggerKey contextKey = "logger"
    // requestIDKey stores the request ID for tracing.
    requestIDKey contextKey = "request_id"
    // traceIDKey stores distributed trace information.
    traceIDKey contextKey = "trace_id"
)

// Logger wraps slog.Logger with context awareness.
type Logger struct {
    *slog.Logger
}

// New creates a new Logger with JSON output.
func New() *Logger {
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
    })
    return &Logger{
        Logger: slog.New(handler),
    }
}
```

## Storing and Retrieving Logger from Context

The next step is creating functions to store the logger in context and retrieve it later.

```go
// WithLogger adds a logger to the context.
func WithLogger(ctx context.Context, l *Logger) context.Context {
    return context.WithValue(ctx, loggerKey, l)
}

// FromContext retrieves the logger from context.
// Returns a default logger if none exists.
func FromContext(ctx context.Context) *Logger {
    if l, ok := ctx.Value(loggerKey).(*Logger); ok {
        return l
    }
    // Return a default logger if none found in context.
    return New()
}

// WithRequestID adds a request ID to the context.
func WithRequestID(ctx context.Context, requestID string) context.Context {
    return context.WithValue(ctx, requestIDKey, requestID)
}

// WithTraceID adds a trace ID to the context.
func WithTraceID(ctx context.Context, traceID string) context.Context {
    return context.WithValue(ctx, traceIDKey, traceID)
}
```

## Context-Aware Logging Methods

Now create logging methods that automatically include context values.

```go
// Info logs at info level with context values.
func (l *Logger) InfoCtx(ctx context.Context, msg string, args ...any) {
    args = l.appendContextFields(ctx, args)
    l.Logger.Info(msg, args...)
}

// Error logs at error level with context values.
func (l *Logger) ErrorCtx(ctx context.Context, msg string, args ...any) {
    args = l.appendContextFields(ctx, args)
    l.Logger.Error(msg, args...)
}

// Debug logs at debug level with context values.
func (l *Logger) DebugCtx(ctx context.Context, msg string, args ...any) {
    args = l.appendContextFields(ctx, args)
    l.Logger.Debug(msg, args...)
}

// appendContextFields extracts values from context and adds them to log args.
func (l *Logger) appendContextFields(ctx context.Context, args []any) []any {
    // Extract request ID if present.
    if requestID, ok := ctx.Value(requestIDKey).(string); ok && requestID != "" {
        args = append(args, "request_id", requestID)
    }
    // Extract trace ID if present.
    if traceID, ok := ctx.Value(traceIDKey).(string); ok && traceID != "" {
        args = append(args, "trace_id", traceID)
    }
    return args
}
```

## HTTP Middleware Integration

Middleware automatically injects request IDs and the logger into each request context.

```go
package middleware

import (
    "net/http"

    "github.com/google/uuid"
    "yourproject/logger"
)

// RequestIDHeader is the header name for request ID propagation.
const RequestIDHeader = "X-Request-ID"

// LoggingMiddleware adds request ID and logger to the request context.
func LoggingMiddleware(log *logger.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Get or generate request ID.
            requestID := r.Header.Get(RequestIDHeader)
            if requestID == "" {
                requestID = uuid.New().String()
            }

            // Build context with logger and request ID.
            ctx := r.Context()
            ctx = logger.WithLogger(ctx, log)
            ctx = logger.WithRequestID(ctx, requestID)

            // Check for trace ID from distributed tracing systems.
            if traceID := r.Header.Get("X-Trace-ID"); traceID != "" {
                ctx = logger.WithTraceID(ctx, traceID)
            }

            // Add request ID to response headers for client correlation.
            w.Header().Set(RequestIDHeader, requestID)

            // Log incoming request.
            log.InfoCtx(ctx, "request started",
                "method", r.Method,
                "path", r.URL.Path,
            )

            // Continue with the request.
            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}
```

## Using the Logger in Handlers

With the middleware in place, handlers can access the logger from context.

```go
package handlers

import (
    "encoding/json"
    "net/http"

    "yourproject/logger"
)

func UserHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    log := logger.FromContext(ctx)

    // All logs automatically include request_id and trace_id.
    log.InfoCtx(ctx, "fetching user data", "user_id", "123")

    // Simulate some work.
    user := map[string]string{"id": "123", "name": "Alice"}

    log.InfoCtx(ctx, "user data retrieved", "user_id", user["id"])

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}
```

## Putting It All Together

Here is how to wire everything in your main function.

```go
package main

import (
    "net/http"

    "yourproject/handlers"
    "yourproject/logger"
    "yourproject/middleware"
)

func main() {
    // Create the base logger.
    log := logger.New()

    // Create router and apply middleware.
    mux := http.NewServeMux()
    mux.HandleFunc("/users", handlers.UserHandler)

    // Wrap with logging middleware.
    handler := middleware.LoggingMiddleware(log)(mux)

    log.Info("server starting", "port", 8080)
    http.ListenAndServe(":8080", handler)
}
```

When you make a request, the logs will include consistent request IDs across all log entries:

```json
{"time":"2026-01-30T10:00:00Z","level":"INFO","msg":"request started","method":"GET","path":"/users","request_id":"abc-123"}
{"time":"2026-01-30T10:00:00Z","level":"INFO","msg":"fetching user data","user_id":"123","request_id":"abc-123"}
{"time":"2026-01-30T10:00:00Z","level":"INFO","msg":"user data retrieved","user_id":"123","request_id":"abc-123"}
```

## Conclusion

Context-aware logging in Go provides consistent tracing across your application. The pattern shown here uses Go's standard library `log/slog` package and `context.Context` to create a clean, maintainable logging solution. This approach makes debugging distributed systems much easier since you can correlate all logs for a single request using the request ID.

Key takeaways:
- Use custom types for context keys to avoid collisions
- Store loggers and trace IDs in context for automatic propagation
- Implement middleware to inject logging context for every request
- Use structured logging with slog for machine-readable output
