# How to Implement Structured Logging in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Logging, Structured Logging, Observability, JSON, slog

Description: Learn how to implement structured logging in Go using the standard slog package and popular libraries like zerolog and zap for better observability.

---

Structured logging outputs logs in a machine-parseable format (usually JSON) with key-value pairs. This makes logs easier to search, filter, and analyze. Go 1.21 introduced the `log/slog` package for structured logging.

---

## Standard Library: log/slog (Go 1.21+)

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    // Default text handler
    slog.Info("user logged in", 
        "user_id", 123,
        "ip", "192.168.1.1",
    )
    
    // JSON handler
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    logger.Info("user logged in",
        "user_id", 123,
        "ip", "192.168.1.1",
    )
}
```

**Text output:**
```
2024/01/15 10:30:00 INFO user logged in user_id=123 ip=192.168.1.1
```

**JSON output:**
```json
{"time":"2024-01-15T10:30:00Z","level":"INFO","msg":"user logged in","user_id":123,"ip":"192.168.1.1"}
```

---

## Log Levels

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelDebug,  // Set minimum level
    }))
    
    logger.Debug("debug message", "key", "value")
    logger.Info("info message", "key", "value")
    logger.Warn("warning message", "key", "value")
    logger.Error("error message", "key", "value", "error", err)
}
```

Log levels:
- `slog.LevelDebug` (-4)
- `slog.LevelInfo` (0) - default
- `slog.LevelWarn` (4)
- `slog.LevelError` (8)

---

## Creating Child Loggers

Add context that persists across log calls:

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    
    // Child logger with persistent attributes
    requestLogger := logger.With(
        "request_id", "abc-123",
        "user_id", 456,
    )
    
    // All logs from this logger include request_id and user_id
    requestLogger.Info("processing request")
    requestLogger.Info("request completed", "duration_ms", 150)
}
```

**Output:**
```json
{"time":"...","level":"INFO","msg":"processing request","request_id":"abc-123","user_id":456}
{"time":"...","level":"INFO","msg":"request completed","request_id":"abc-123","user_id":456,"duration_ms":150}
```

---

## Grouping Attributes

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
    
    // Group related attributes
    logger.Info("http request",
        slog.Group("request",
            slog.String("method", "POST"),
            slog.String("path", "/api/users"),
            slog.Int("status", 201),
        ),
        slog.Group("user",
            slog.Int("id", 123),
            slog.String("name", "Alice"),
        ),
    )
}
```

**Output:**
```json
{
    "time": "...",
    "level": "INFO",
    "msg": "http request",
    "request": {
        "method": "POST",
        "path": "/api/users",
        "status": 201
    },
    "user": {
        "id": 123,
        "name": "Alice"
    }
}
```

---

## Typed Attributes

Use typed helpers for better performance and type safety:

```go
package main

import (
    "log/slog"
    "time"
)

func main() {
    logger := slog.Default()
    
    logger.Info("typed attributes",
        slog.String("name", "Alice"),
        slog.Int("age", 30),
        slog.Int64("count", 1000000),
        slog.Float64("score", 98.5),
        slog.Bool("active", true),
        slog.Time("timestamp", time.Now()),
        slog.Duration("elapsed", 5*time.Second),
        slog.Any("data", map[string]int{"a": 1}),
    )
}
```

---

## Custom Handler

Create a custom handler for special formatting:

```go
package main

import (
    "context"
    "fmt"
    "log/slog"
    "os"
    "time"
)

type PrettyHandler struct {
    slog.Handler
    output *os.File
}

func NewPrettyHandler(output *os.File) *PrettyHandler {
    return &PrettyHandler{
        output: output,
    }
}

func (h *PrettyHandler) Handle(ctx context.Context, r slog.Record) error {
    // Custom format
    level := r.Level.String()
    timestamp := r.Time.Format(time.RFC3339)
    
    fmt.Fprintf(h.output, "[%s] %s %s", timestamp, level, r.Message)
    
    r.Attrs(func(a slog.Attr) bool {
        fmt.Fprintf(h.output, " %s=%v", a.Key, a.Value)
        return true
    })
    
    fmt.Fprintln(h.output)
    return nil
}

func (h *PrettyHandler) Enabled(ctx context.Context, level slog.Level) bool {
    return true
}

func (h *PrettyHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return h  // Simplified - should handle attrs
}

func (h *PrettyHandler) WithGroup(name string) slog.Handler {
    return h  // Simplified - should handle groups
}
```

---

## Context Integration

Pass logger through context:

```go
package main

import (
    "context"
    "log/slog"
    "os"
)

type contextKey string

const loggerKey contextKey = "logger"

func ContextWithLogger(ctx context.Context, logger *slog.Logger) context.Context {
    return context.WithValue(ctx, loggerKey, logger)
}

func LoggerFromContext(ctx context.Context) *slog.Logger {
    if logger, ok := ctx.Value(loggerKey).(*slog.Logger); ok {
        return logger
    }
    return slog.Default()
}

func handleRequest(ctx context.Context) {
    logger := LoggerFromContext(ctx)
    logger.Info("handling request")
    
    // Pass to nested functions
    processData(ctx)
}

func processData(ctx context.Context) {
    logger := LoggerFromContext(ctx)
    logger.Info("processing data")
}

func main() {
    logger := slog.New(slog.NewJSONHandler(os.Stdout, nil)).
        With("service", "api")
    
    ctx := ContextWithLogger(context.Background(), logger.With("request_id", "123"))
    handleRequest(ctx)
}
```

---

## HTTP Middleware Logging

```go
package main

import (
    "log/slog"
    "net/http"
    "os"
    "time"
)

func loggingMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()
            
            // Wrap response writer to capture status
            wrapped := &responseWriter{ResponseWriter: w, status: 200}
            
            // Create request-scoped logger
            reqLogger := logger.With(
                "method", r.Method,
                "path", r.URL.Path,
                "remote_addr", r.RemoteAddr,
            )
            
            // Add logger to context
            ctx := ContextWithLogger(r.Context(), reqLogger)
            r = r.WithContext(ctx)
            
            next.ServeHTTP(wrapped, r)
            
            // Log after request
            reqLogger.Info("request completed",
                "status", wrapped.status,
                "duration_ms", time.Since(start).Milliseconds(),
                "bytes", wrapped.bytes,
            )
        })
    }
}

type responseWriter struct {
    http.ResponseWriter
    status int
    bytes  int
}

func (w *responseWriter) WriteHeader(status int) {
    w.status = status
    w.ResponseWriter.WriteHeader(status)
}

func (w *responseWriter) Write(b []byte) (int, error) {
    n, err := w.ResponseWriter.Write(b)
    w.bytes += n
    return n, err
}
```

---

## Error Logging Best Practices

```go
package main

import (
    "errors"
    "log/slog"
)

func processItem(id int) error {
    return errors.New("database connection failed")
}

func main() {
    logger := slog.Default()
    
    id := 123
    err := processItem(id)
    if err != nil {
        // Include error as attribute
        logger.Error("failed to process item",
            "error", err,
            "item_id", id,
        )
        
        // Or use slog.Any for complex errors
        logger.Error("operation failed",
            slog.Any("error", err),
            slog.Int("item_id", id),
        )
    }
}
```

---

## Using zerolog

High-performance JSON logger:

```go
package main

import (
    "os"
    "time"
    
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func main() {
    // Pretty console output for development
    log.Logger = log.Output(zerolog.ConsoleWriter{Out: os.Stderr})
    
    // Or JSON for production
    // log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
    
    log.Info().
        Str("service", "api").
        Int("port", 8080).
        Msg("server starting")
    
    // Child logger
    reqLog := log.With().
        Str("request_id", "abc-123").
        Logger()
    
    reqLog.Info().
        Str("method", "GET").
        Str("path", "/users").
        Dur("duration", 50*time.Millisecond).
        Msg("request completed")
}
```

---

## Using zap

Uber's high-performance logger:

```go
package main

import (
    "go.uber.org/zap"
)

func main() {
    // Production config (JSON)
    logger, _ := zap.NewProduction()
    defer logger.Sync()
    
    // Development config (console)
    // logger, _ := zap.NewDevelopment()
    
    logger.Info("user logged in",
        zap.Int("user_id", 123),
        zap.String("ip", "192.168.1.1"),
    )
    
    // Sugared logger (slower but convenient)
    sugar := logger.Sugar()
    sugar.Infow("user logged in",
        "user_id", 123,
        "ip", "192.168.1.1",
    )
}
```

---

## Log Levels in Production

```go
package main

import (
    "log/slog"
    "os"
)

func main() {
    var level slog.Level
    
    // Set from environment
    switch os.Getenv("LOG_LEVEL") {
    case "debug":
        level = slog.LevelDebug
    case "info":
        level = slog.LevelInfo
    case "warn":
        level = slog.LevelWarn
    case "error":
        level = slog.LevelError
    default:
        level = slog.LevelInfo
    }
    
    opts := &slog.HandlerOptions{Level: level}
    logger := slog.New(slog.NewJSONHandler(os.Stdout, opts))
    slog.SetDefault(logger)
}
```

---

## Summary

| Library | Performance | Features | Go Version |
|---------|-------------|----------|------------|
| `log/slog` | Good | Standard library, groups, levels | 1.21+ |
| `zerolog` | Excellent | Zero allocation, chaining | 1.15+ |
| `zap` | Excellent | Structured, sugared mode | 1.17+ |
| `logrus` | Moderate | Hooks, formatters | 1.13+ |

**Best Practices:**

1. Always use structured logging in production
2. Include request/trace IDs for correlation
3. Log at appropriate levels
4. Don't log sensitive data (passwords, tokens)
5. Use child loggers for context
6. Configure log level from environment
7. Output JSON for log aggregation systems

---

*Need to analyze your Go application logs? [OneUptime](https://oneuptime.com) provides log aggregation, search, and alerting to help you monitor your structured logs effectively.*
