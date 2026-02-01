# How to Use Logging with Zap and Zerolog in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Logging, Zap, Zerolog, Observability, Structured Logging

Description: A practical guide to structured logging in Go using Zap and Zerolog for high-performance application observability.

---

If you have ever tried debugging a production issue with nothing but `fmt.Println` statements scattered through your code, you know the pain. Unstructured logs are nearly impossible to search, filter, or correlate when things go wrong at 3 AM. Structured logging solves this problem by treating logs as data - key-value pairs that machines can parse and humans can query.

Go developers have two exceptional choices for structured logging: Uber's Zap and Zerolog. Both are blazingly fast, produce JSON output by default, and integrate well with log aggregation tools. This guide will walk you through setting up both libraries, configuring them for production use, and choosing the right one for your project.

## Why Structured Logging Matters

Traditional logging produces output like this:

```
2026-02-01 10:15:32 ERROR: Failed to process order 12345 for user john@example.com
```

Structured logging produces this instead:

```json
{"level":"error","ts":"2026-02-01T10:15:32.000Z","msg":"Failed to process order","order_id":12345,"user_email":"john@example.com","error":"payment gateway timeout"}
```

The difference is significant. With structured logs, you can:

- Query all errors for a specific user across millions of log lines
- Filter by any field without complex regex patterns
- Aggregate metrics like error rates per order type
- Correlate logs with distributed traces using request IDs
- Feed logs directly into monitoring tools without parsing

Both Zap and Zerolog produce structured JSON logs with minimal performance overhead. Let's start with Zap.

## Getting Started with Zap

Zap was built by Uber to handle their massive logging volume. It achieves high performance through careful memory allocation and a two-tier API - a fast but less flexible `Logger` and a more convenient `SugaredLogger`.

### Installation

Install Zap using Go modules:

```bash
go get -u go.uber.org/zap
```

### Basic Zap Setup

The following example shows how to create a production-ready Zap logger with sensible defaults:

```go
package main

import (
    "go.uber.org/zap"
)

func main() {
    // NewProduction creates a logger optimized for production use.
    // It writes JSON to stderr, includes timestamps, and samples
    // repeated messages to avoid flooding logs.
    logger, err := zap.NewProduction()
    if err != nil {
        panic(err)
    }
    // Sync flushes any buffered log entries. Call this before your
    // application exits to ensure all logs are written.
    defer logger.Sync()

    // Structured logging with strongly-typed fields.
    // Each field is a key-value pair that appears in the JSON output.
    logger.Info("User logged in",
        zap.String("user_id", "usr_12345"),
        zap.String("ip_address", "192.168.1.100"),
        zap.Int("login_count", 42),
    )
}
```

This produces output like:

```json
{"level":"info","ts":1706782532.123,"caller":"main.go:18","msg":"User logged in","user_id":"usr_12345","ip_address":"192.168.1.100","login_count":42}
```

### Using the Sugared Logger

For less performance-critical code, the SugaredLogger provides a more ergonomic API with printf-style formatting:

```go
package main

import (
    "go.uber.org/zap"
)

func main() {
    logger, _ := zap.NewProduction()
    defer logger.Sync()

    // Sugar wraps the Logger to provide a more convenient API.
    // It is slightly slower due to interface{} usage but still
    // faster than most logging libraries.
    sugar := logger.Sugar()

    // Infow logs a message with loosely-typed key-value pairs.
    // The 'w' suffix stands for 'with' - as in 'with fields'.
    sugar.Infow("Order processed",
        "order_id", "ord_98765",
        "amount", 149.99,
        "currency", "USD",
    )

    // Infof provides familiar printf-style formatting.
    // Use this when you need formatted strings in the message.
    sugar.Infof("Processing %d items for customer %s", 5, "cust_001")
}
```

### Custom Zap Configuration

Production applications often need custom log formatting. Here is how to configure Zap with custom settings:

```go
package main

import (
    "os"
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func createLogger() *zap.Logger {
    // EncoderConfig controls how log entries are formatted.
    // These settings create human-readable timestamps and
    // lowercase level names for easier parsing.
    encoderConfig := zapcore.EncoderConfig{
        TimeKey:        "timestamp",
        LevelKey:       "level",
        NameKey:        "logger",
        CallerKey:      "caller",
        MessageKey:     "message",
        StacktraceKey:  "stacktrace",
        LineEnding:     zapcore.DefaultLineEnding,
        EncodeLevel:    zapcore.LowercaseLevelEncoder,
        EncodeTime:     zapcore.ISO8601TimeEncoder,
        EncodeDuration: zapcore.MillisDurationEncoder,
        EncodeCaller:   zapcore.ShortCallerEncoder,
    }

    // Create a JSON encoder with our custom config.
    // For development, you might use NewConsoleEncoder instead.
    encoder := zapcore.NewJSONEncoder(encoderConfig)

    // Write logs to stdout. In production, you might write to
    // a file or use a multi-writer for both.
    writer := zapcore.AddSync(os.Stdout)

    // Set the minimum log level. InfoLevel filters out debug messages.
    // Use environment variables to change this at runtime.
    level := zapcore.InfoLevel

    // Core ties together the encoder, output, and level filter.
    core := zapcore.NewCore(encoder, writer, level)

    // Build the logger with caller information included.
    // AddCaller adds the file and line number to each log entry.
    logger := zap.New(core, zap.AddCaller(), zap.AddStacktrace(zapcore.ErrorLevel))

    return logger
}

func main() {
    logger := createLogger()
    defer logger.Sync()

    logger.Info("Application started",
        zap.String("version", "1.2.3"),
        zap.String("environment", "production"),
    )
}
```

## Getting Started with Zerolog

Zerolog takes a different approach. It uses a fluent API with method chaining and achieves even lower allocation overhead than Zap in many benchmarks. If raw performance is your top priority, Zerolog is worth considering.

### Installation

Install Zerolog using Go modules:

```bash
go get -u github.com/rs/zerolog/log
```

### Basic Zerolog Setup

The following example demonstrates Zerolog's chainable API:

```go
package main

import (
    "os"
    "time"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func main() {
    // Configure Zerolog to use RFC3339 timestamps.
    // This format is widely supported by log aggregation tools.
    zerolog.TimeFieldFormat = time.RFC3339

    // Set the global log level. Levels below this threshold
    // are silently discarded.
    zerolog.SetGlobalLevel(zerolog.InfoLevel)

    // Configure the global logger to write JSON to stdout.
    // The With().Timestamp() adds a timestamp to every log entry.
    log.Logger = zerolog.New(os.Stdout).With().Timestamp().Logger()

    // Zerolog uses method chaining to add fields.
    // Each Str(), Int(), etc. method adds a field and returns
    // the event for further chaining. Msg() finalizes and sends the log.
    log.Info().
        Str("user_id", "usr_12345").
        Str("action", "login").
        Int("attempt", 1).
        Msg("User authentication successful")
}
```

Output:

```json
{"level":"info","user_id":"usr_12345","action":"login","attempt":1,"time":"2026-02-01T10:15:32Z","message":"User authentication successful"}
```

### Creating Child Loggers with Context

Zerolog makes it easy to create loggers with pre-set fields. This is useful for adding request-scoped context:

```go
package main

import (
    "os"
    "github.com/rs/zerolog"
)

func main() {
    // Create a base logger that writes to stdout.
    baseLogger := zerolog.New(os.Stdout).With().Timestamp().Logger()

    // Create a child logger with request-specific context.
    // All logs from this logger will include these fields automatically.
    // This is perfect for adding trace IDs and user context.
    requestLogger := baseLogger.With().
        Str("request_id", "req_abc123").
        Str("user_id", "usr_456").
        Str("service", "order-api").
        Logger()

    // These logs automatically include request_id, user_id, and service.
    requestLogger.Info().
        Str("order_id", "ord_789").
        Float64("total", 299.99).
        Msg("Order created")

    requestLogger.Warn().
        Str("order_id", "ord_789").
        Str("reason", "low_inventory").
        Msg("Order may be delayed")
}
```

### Pretty Printing for Development

JSON logs are hard to read during development. Zerolog includes a console writer for human-friendly output:

```go
package main

import (
    "os"
    "github.com/rs/zerolog"
)

func main() {
    // ConsoleWriter formats logs for human readability.
    // Use this only in development - JSON is better for production
    // because it can be parsed by log aggregation tools.
    consoleWriter := zerolog.ConsoleWriter{
        Out:        os.Stdout,
        TimeFormat: "15:04:05",
    }

    logger := zerolog.New(consoleWriter).With().Timestamp().Logger()

    logger.Info().
        Str("component", "database").
        Dur("latency", 45*time.Millisecond).
        Msg("Query executed")
}
```

This produces colorized, readable output:

```
10:15:32 INF Query executed component=database latency=45ms
```

## Log Levels and When to Use Them

Both libraries support standard log levels. Here is a practical guide for when to use each:

```go
// Zerolog example showing appropriate use of each level.

// Trace - extremely detailed information for debugging specific issues.
// Usually disabled in production due to volume.
log.Trace().Str("query", sqlQuery).Msg("Executing database query")

// Debug - information useful during development.
// Enable in production only when investigating issues.
log.Debug().Interface("request_body", req).Msg("Received API request")

// Info - normal operational messages.
// Use for significant events like startup, shutdown, major operations.
log.Info().Str("version", "1.2.3").Msg("Service started")

// Warn - something unexpected but not immediately harmful.
// The application continues but someone should investigate.
log.Warn().Int("queue_depth", 9500).Msg("Message queue nearing capacity")

// Error - something failed but the application continues.
// These should trigger alerts in your monitoring system.
log.Error().Err(err).Str("order_id", orderID).Msg("Failed to process payment")

// Fatal - unrecoverable error, application will exit.
// Use sparingly - only for situations where continuing is impossible.
log.Fatal().Err(err).Msg("Database connection failed on startup")

// Panic - logs and then panics.
// Useful when you want both a log entry and a stack trace.
log.Panic().Err(err).Msg("Unexpected nil pointer")
```

## Context-Aware Logging

Both libraries integrate well with Go's context package for request-scoped logging. Here is a middleware pattern for HTTP services:

```go
package main

import (
    "context"
    "net/http"
    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
    "github.com/google/uuid"
)

// Define a custom type for context keys to avoid collisions.
type contextKey string

const loggerKey contextKey = "logger"

// LoggingMiddleware injects a request-scoped logger into the context.
// Every handler downstream can retrieve this logger and log with
// the request ID automatically included.
func LoggingMiddleware(next http.Handler) http.Handler {
    return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        requestID := uuid.New().String()

        // Create a logger with request context baked in.
        logger := log.With().
            Str("request_id", requestID).
            Str("method", r.Method).
            Str("path", r.URL.Path).
            Logger()

        // Store the logger in the request context.
        ctx := context.WithValue(r.Context(), loggerKey, logger)

        logger.Info().Msg("Request started")
        next.ServeHTTP(w, r.WithContext(ctx))
        logger.Info().Msg("Request completed")
    })
}

// LoggerFromContext retrieves the request-scoped logger.
// Falls back to the global logger if none is found.
func LoggerFromContext(ctx context.Context) zerolog.Logger {
    if logger, ok := ctx.Value(loggerKey).(zerolog.Logger); ok {
        return logger
    }
    return log.Logger
}

// Handler example showing context-aware logging.
func OrderHandler(w http.ResponseWriter, r *http.Request) {
    logger := LoggerFromContext(r.Context())

    // This log entry automatically includes request_id, method, and path.
    logger.Info().
        Str("order_id", "ord_12345").
        Msg("Processing order")
}
```

## Performance Comparison

Both libraries are exceptionally fast, but they have different performance characteristics. Here are some general observations from community benchmarks:

| Operation | Zap | Zerolog |
|-----------|-----|---------|
| Logging with 10 fields | ~800 ns/op | ~700 ns/op |
| Memory allocations | ~1-2 allocs/op | ~0-1 allocs/op |
| JSON encoding | Slightly faster | Slightly slower |
| API style | Strongly-typed fields | Method chaining |

In practice, both are fast enough that logging overhead is negligible compared to I/O operations, database queries, or network calls. Choose based on API preference and ecosystem fit rather than micro-benchmarks.

## Integrating with OpenTelemetry

Modern observability requires connecting logs to traces. Here is how to add trace context to your logs:

```go
package main

import (
    "context"
    "github.com/rs/zerolog"
    "go.opentelemetry.io/otel/trace"
)

// LoggerWithTrace creates a logger that includes OpenTelemetry trace context.
// This allows you to correlate logs with distributed traces in your
// observability platform.
func LoggerWithTrace(ctx context.Context, logger zerolog.Logger) zerolog.Logger {
    span := trace.SpanFromContext(ctx)
    if !span.SpanContext().IsValid() {
        return logger
    }

    // Add trace_id and span_id to all logs from this logger.
    // Most observability platforms use these fields to link
    // logs and traces together.
    return logger.With().
        Str("trace_id", span.SpanContext().TraceID().String()).
        Str("span_id", span.SpanContext().SpanID().String()).
        Logger()
}

func ProcessOrder(ctx context.Context, orderID string) {
    logger := LoggerWithTrace(ctx, log.Logger)

    // This log entry includes trace_id and span_id,
    // making it easy to find in your tracing UI.
    logger.Info().
        Str("order_id", orderID).
        Msg("Starting order processing")
}
```

## Choosing Between Zap and Zerolog

Both libraries are production-ready and widely used. Here is a quick guide:

**Choose Zap if:**
- You prefer strongly-typed field methods like `zap.String()` and `zap.Int()`
- You need sampling to reduce log volume automatically
- You want both a fast Logger and a convenient SugaredLogger
- Your team is already familiar with Uber's Go ecosystem

**Choose Zerolog if:**
- You want the absolute lowest allocation overhead
- You prefer method chaining with a fluent API
- You want a simpler codebase with fewer dependencies
- Pretty-printed development logs are important to you

Both integrate well with log aggregation platforms, support JSON output, and handle high-volume logging without becoming a bottleneck.

## Wrapping Up

Structured logging is not optional for production Go applications. The ability to query, filter, and correlate logs transforms debugging from guesswork into systematic investigation. Both Zap and Zerolog deliver the performance and features you need.

Start with the library whose API feels more natural to your team. Configure it properly from day one - adding request IDs, trace context, and appropriate log levels. Your future self, debugging a production incident at 3 AM, will thank you.

---

*Centralize your Go application logs with [OneUptime](https://oneuptime.com) - search, filter, and correlate logs with traces.*
