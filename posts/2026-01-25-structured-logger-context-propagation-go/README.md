# How to Build a Structured Logger with Context Propagation in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Logging, Structured Logging, Context, Observability

Description: Learn how to build a structured logger in Go that automatically propagates request context through your application. This guide covers context values, middleware integration, and trace correlation.

---

> Good logs tell a story. Great logs tell you exactly which request failed, who made it, and what happened along the way. This guide walks you through building a logger that captures all of this automatically.

If you have ever tried debugging a production issue with logs that just say "error occurred," you know how frustrating it can be. Structured logging with context propagation solves this by ensuring every log line carries the information you need - request IDs, user identifiers, trace data - without cluttering your business logic.

---

## Why Context Propagation Matters

Consider a typical HTTP request flowing through multiple service layers:

```
HTTP Handler -> Service Layer -> Repository -> External API
```

Without context propagation, you need to pass logger instances or fields through every function call. With context propagation, the logger automatically picks up relevant data from the request context.

Here is what we are building:

```go
// Without context propagation - verbose and error-prone
func (s *Service) ProcessOrder(logger *Logger, requestID, userID string, orderID int) error {
    logger.Info("processing order", "request_id", requestID, "user_id", userID, "order_id", orderID)
    // Every function needs these parameters
    return s.repo.Save(logger, requestID, userID, order)
}

// With context propagation - clean and automatic
func (s *Service) ProcessOrder(ctx context.Context, orderID int) error {
    log.FromContext(ctx).Info("processing order", "order_id", orderID)
    // request_id and user_id are automatically included
    return s.repo.Save(ctx, order)
}
```

---

## Building the Core Logger

Let's start with a structured logger that outputs JSON and supports log levels.

```go
// logger/logger.go
package logger

import (
    "encoding/json"
    "io"
    "os"
    "runtime"
    "sync"
    "time"
)

// Level represents log severity
type Level int

const (
    LevelDebug Level = iota
    LevelInfo
    LevelWarn
    LevelError
)

// String returns the level name for JSON output
func (l Level) String() string {
    switch l {
    case LevelDebug:
        return "debug"
    case LevelInfo:
        return "info"
    case LevelWarn:
        return "warn"
    case LevelError:
        return "error"
    default:
        return "unknown"
    }
}

// Logger handles structured logging with fields
type Logger struct {
    mu       sync.Mutex
    out      io.Writer
    minLevel Level
    fields   map[string]any // persistent fields attached to this logger
}

// LogEntry represents a single log record
type LogEntry struct {
    Timestamp string         `json:"timestamp"`
    Level     string         `json:"level"`
    Message   string         `json:"message"`
    Caller    string         `json:"caller,omitempty"`
    Fields    map[string]any `json:"fields,omitempty"`
}

// New creates a logger with default settings
func New() *Logger {
    return &Logger{
        out:      os.Stdout,
        minLevel: LevelInfo,
        fields:   make(map[string]any),
    }
}

// WithOutput sets the output destination
func (l *Logger) WithOutput(w io.Writer) *Logger {
    clone := l.clone()
    clone.out = w
    return clone
}

// WithLevel sets the minimum log level
func (l *Logger) WithLevel(level Level) *Logger {
    clone := l.clone()
    clone.minLevel = level
    return clone
}

// With adds fields that persist across all log calls
func (l *Logger) With(fields ...any) *Logger {
    clone := l.clone()
    clone.addFields(fields)
    return clone
}

// clone creates a copy of the logger for safe modification
func (l *Logger) clone() *Logger {
    l.mu.Lock()
    defer l.mu.Unlock()

    newFields := make(map[string]any, len(l.fields))
    for k, v := range l.fields {
        newFields[k] = v
    }

    return &Logger{
        out:      l.out,
        minLevel: l.minLevel,
        fields:   newFields,
    }
}

// addFields parses key-value pairs into the fields map
func (l *Logger) addFields(args []any) {
    for i := 0; i < len(args)-1; i += 2 {
        if key, ok := args[i].(string); ok {
            l.fields[key] = args[i+1]
        }
    }
}

// log handles the actual logging logic
func (l *Logger) log(level Level, msg string, args ...any) {
    if level < l.minLevel {
        return
    }

    l.mu.Lock()
    defer l.mu.Unlock()

    // Merge persistent fields with call-specific fields
    allFields := make(map[string]any, len(l.fields)+len(args)/2)
    for k, v := range l.fields {
        allFields[k] = v
    }

    // Parse additional fields from args
    for i := 0; i < len(args)-1; i += 2 {
        if key, ok := args[i].(string); ok {
            allFields[key] = args[i+1]
        }
    }

    // Capture caller information
    _, file, line, _ := runtime.Caller(2)
    caller := ""
    if file != "" {
        // Extract just filename, not full path
        for i := len(file) - 1; i >= 0; i-- {
            if file[i] == '/' {
                file = file[i+1:]
                break
            }
        }
        caller = file + ":" + itoa(line)
    }

    entry := LogEntry{
        Timestamp: time.Now().UTC().Format(time.RFC3339Nano),
        Level:     level.String(),
        Message:   msg,
        Caller:    caller,
    }

    if len(allFields) > 0 {
        entry.Fields = allFields
    }

    // Write JSON to output
    data, _ := json.Marshal(entry)
    l.out.Write(append(data, '\n'))
}

// Simple int to string conversion without importing strconv
func itoa(i int) string {
    if i == 0 {
        return "0"
    }
    var b [20]byte
    pos := len(b)
    for i > 0 {
        pos--
        b[pos] = byte('0' + i%10)
        i /= 10
    }
    return string(b[pos:])
}

// Debug logs at debug level
func (l *Logger) Debug(msg string, args ...any) { l.log(LevelDebug, msg, args...) }

// Info logs at info level
func (l *Logger) Info(msg string, args ...any) { l.log(LevelInfo, msg, args...) }

// Warn logs at warn level
func (l *Logger) Warn(msg string, args ...any) { l.log(LevelWarn, msg, args...) }

// Error logs at error level
func (l *Logger) Error(msg string, args ...any) { l.log(LevelError, msg, args...) }
```

---

## Adding Context Support

The key to context propagation is storing and retrieving the logger from Go's `context.Context`. This requires a context key type to avoid collisions.

```go
// logger/context.go
package logger

import "context"

// contextKey is unexported to prevent collisions with other packages
type contextKey struct{}

// loggerKey is the key used to store the logger in context
var loggerKey = contextKey{}

// defaultLogger is used when no logger exists in context
var defaultLogger = New()

// SetDefault configures the fallback logger
func SetDefault(l *Logger) {
    defaultLogger = l
}

// NewContext returns a context with the logger attached
func NewContext(ctx context.Context, l *Logger) context.Context {
    return context.WithValue(ctx, loggerKey, l)
}

// FromContext retrieves the logger from context
// Returns the default logger if none is found
func FromContext(ctx context.Context) *Logger {
    if l, ok := ctx.Value(loggerKey).(*Logger); ok {
        return l
    }
    return defaultLogger
}

// WithFields returns a new context with additional fields added to the logger
func WithFields(ctx context.Context, fields ...any) context.Context {
    l := FromContext(ctx).With(fields...)
    return NewContext(ctx, l)
}
```

Now any function with access to the context can log with the full request context:

```go
func ProcessPayment(ctx context.Context, amount float64) error {
    log := logger.FromContext(ctx)

    log.Info("processing payment", "amount", amount)

    // All fields from context are automatically included
    if err := chargeCard(ctx, amount); err != nil {
        log.Error("payment failed", "error", err.Error(), "amount", amount)
        return err
    }

    log.Info("payment successful", "amount", amount)
    return nil
}
```

---

## HTTP Middleware Integration

Middleware sets up the logging context at the start of each request. This is where you attach request IDs, user information, and other metadata.

```go
// middleware/logging.go
package middleware

import (
    "net/http"
    "time"

    "yourapp/logger"
    "github.com/google/uuid"
)

// RequestLogger is middleware that adds logging context to requests
func RequestLogger(base *logger.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()

            // Generate or extract request ID
            requestID := r.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = uuid.New().String()
            }

            // Create logger with request context fields
            reqLogger := base.With(
                "request_id", requestID,
                "method", r.Method,
                "path", r.URL.Path,
                "remote_addr", r.RemoteAddr,
                "user_agent", r.UserAgent(),
            )

            // Attach logger to context
            ctx := logger.NewContext(r.Context(), reqLogger)
            r = r.WithContext(ctx)

            // Add request ID to response headers for client correlation
            w.Header().Set("X-Request-ID", requestID)

            // Wrap response writer to capture status code
            wrapped := &statusWriter{ResponseWriter: w, status: 200}

            reqLogger.Info("request started")

            // Process request
            next.ServeHTTP(wrapped, r)

            // Log completion with duration
            duration := time.Since(start)
            reqLogger.Info("request completed",
                "status", wrapped.status,
                "duration_ms", duration.Milliseconds(),
            )
        })
    }
}

// statusWriter wraps ResponseWriter to capture the status code
type statusWriter struct {
    http.ResponseWriter
    status int
}

func (w *statusWriter) WriteHeader(status int) {
    w.status = status
    w.ResponseWriter.WriteHeader(status)
}
```

---

## Adding Trace Correlation

For distributed systems, connecting logs to OpenTelemetry traces makes debugging significantly easier. Here is how to extract trace context and include it in logs.

```go
// logger/trace.go
package logger

import (
    "context"

    "go.opentelemetry.io/otel/trace"
)

// WithTraceContext extracts OpenTelemetry trace info and adds it to the logger
func WithTraceContext(ctx context.Context) context.Context {
    span := trace.SpanFromContext(ctx)
    if !span.SpanContext().IsValid() {
        return ctx
    }

    sc := span.SpanContext()
    return WithFields(ctx,
        "trace_id", sc.TraceID().String(),
        "span_id", sc.SpanID().String(),
    )
}
```

Add this to your middleware chain after the tracing middleware:

```go
func TraceLogger(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        // Add trace IDs to logging context
        ctx := logger.WithTraceContext(r.Context())
        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Enriching Context Through the Request Lifecycle

As the request moves through your application, you can add more context. This is useful for adding user information after authentication.

```go
// middleware/auth.go
package middleware

import (
    "net/http"

    "yourapp/logger"
)

func AuthMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        user, err := authenticateRequest(r)
        if err != nil {
            logger.FromContext(r.Context()).Warn("authentication failed", "error", err.Error())
            http.Error(w, "Unauthorized", http.StatusUnauthorized)
            return
        }

        // Add user info to logging context
        ctx := logger.WithFields(r.Context(),
            "user_id", user.ID,
            "user_email", user.Email,
            "user_role", user.Role,
        )

        logger.FromContext(ctx).Info("user authenticated")

        next.ServeHTTP(w, r.WithContext(ctx))
    })
}
```

---

## Complete Example

Here is everything wired together in a working application:

```go
// main.go
package main

import (
    "context"
    "encoding/json"
    "net/http"

    "yourapp/logger"
    "yourapp/middleware"
)

func main() {
    // Configure the base logger
    log := logger.New().
        WithLevel(logger.LevelDebug).
        With("service", "order-api", "version", "1.2.0")

    logger.SetDefault(log)

    // Set up routes
    mux := http.NewServeMux()
    mux.HandleFunc("/api/orders", createOrderHandler)
    mux.HandleFunc("/health", healthHandler)

    // Apply middleware chain
    handler := middleware.RequestLogger(log)(mux)

    log.Info("server starting", "port", 8080)
    http.ListenAndServe(":8080", handler)
}

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()
    log := logger.FromContext(ctx)

    var order struct {
        CustomerID string  `json:"customer_id"`
        Amount     float64 `json:"amount"`
    }

    if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
        log.Warn("invalid request body", "error", err.Error())
        http.Error(w, "Bad Request", http.StatusBadRequest)
        return
    }

    // Add order context for downstream logging
    ctx = logger.WithFields(ctx,
        "customer_id", order.CustomerID,
        "order_amount", order.Amount,
    )

    log = logger.FromContext(ctx)
    log.Info("processing order")

    // Process order - all logs include customer_id and order_amount
    if err := processOrder(ctx, order.CustomerID, order.Amount); err != nil {
        log.Error("order processing failed", "error", err.Error())
        http.Error(w, "Internal Server Error", http.StatusInternalServerError)
        return
    }

    log.Info("order created successfully")
    w.WriteHeader(http.StatusCreated)
    json.NewEncoder(w).Encode(map[string]string{"status": "created"})
}

func processOrder(ctx context.Context, customerID string, amount float64) error {
    log := logger.FromContext(ctx)

    log.Debug("validating order")
    // Validation logic

    log.Debug("charging payment")
    // Payment logic

    log.Debug("updating inventory")
    // Inventory logic

    return nil
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte(`{"status":"healthy"}`))
}
```

Sample output when a request flows through:

```json
{"timestamp":"2026-01-25T10:30:00.123Z","level":"info","message":"request started","fields":{"request_id":"abc-123","method":"POST","path":"/api/orders","service":"order-api"}}
{"timestamp":"2026-01-25T10:30:00.124Z","level":"info","message":"processing order","fields":{"request_id":"abc-123","customer_id":"cust_456","order_amount":99.99}}
{"timestamp":"2026-01-25T10:30:00.125Z","level":"debug","message":"validating order","fields":{"request_id":"abc-123","customer_id":"cust_456","order_amount":99.99}}
{"timestamp":"2026-01-25T10:30:00.130Z","level":"info","message":"order created successfully","fields":{"request_id":"abc-123","customer_id":"cust_456","order_amount":99.99}}
{"timestamp":"2026-01-25T10:30:00.131Z","level":"info","message":"request completed","fields":{"request_id":"abc-123","status":201,"duration_ms":8}}
```

---

## Key Takeaways

1. **Use context.Context for propagation** - It is the standard way to pass request-scoped data in Go
2. **Clone loggers when adding fields** - This prevents race conditions and field leakage between requests
3. **Set up context in middleware** - Capture request metadata once at the entry point
4. **Enrich context as you go** - Add user info after auth, entity IDs in handlers
5. **Include trace IDs** - Connect logs to distributed traces for observability

This pattern scales well. Whether you are building a simple API or a complex microservices system, structured logging with context propagation gives you the visibility you need to debug issues quickly.

---

*Need a place to send your structured logs? [OneUptime](https://oneuptime.com) provides native OpenTelemetry support, powerful log search, and alerting out of the box.*

**Related Reading:**
- [How to Structure Logs Properly in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-28-how-to-structure-logs-properly-in-opentelemetry/view)
- [Three Pillars of Observability: Logs, Metrics, Traces](https://oneuptime.com/blog/post/2025-08-20-three-pillars-of-observability-logs-metrics-traces/view)
- [Traces and Spans in OpenTelemetry](https://oneuptime.com/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/view)
