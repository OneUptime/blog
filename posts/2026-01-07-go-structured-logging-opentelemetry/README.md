# How to Set Up Structured Logging in Go with OpenTelemetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Logging, OpenTelemetry, Observability, Structured Logging, Tracing

Description: A complete guide to setting up structured logging in Go with OpenTelemetry, covering slog, zerolog, and zap with trace correlation for better observability.

---

## Introduction

Structured logging is a cornerstone of modern observability. Unlike traditional plaintext logs, structured logs emit data in a consistent, machine-parseable format (typically JSON), making them easier to query, filter, and analyze. When combined with distributed tracing through OpenTelemetry, structured logs become even more powerful-allowing you to correlate log entries with specific traces and spans across your microservices architecture.

In this comprehensive guide, we will explore three popular Go logging libraries-slog (Go's standard library logger), zerolog, and zap-and demonstrate how to integrate each with OpenTelemetry for trace correlation. By the end, you will have production-ready logging configurations that automatically inject trace and span IDs into your log entries.

## Prerequisites

Before we begin, ensure you have:

- Go 1.21 or later installed (required for slog)
- Basic understanding of Go programming
- Familiarity with OpenTelemetry concepts (traces, spans, context propagation)
- A running OpenTelemetry Collector (optional, for exporting traces)

## Why Trace Correlation Matters

When debugging distributed systems, you often need to answer questions like:

- "What happened during this specific request?"
- "Which service caused this error?"
- "What was the sequence of events that led to this failure?"

Without trace correlation, you would need to manually piece together log entries using timestamps and other contextual information. With trace correlation, every log entry includes a `traceId` and `spanId`, allowing you to:

1. **Filter logs by trace**: See all log entries related to a specific request
2. **Navigate from traces to logs**: Jump from a trace visualization to the corresponding logs
3. **Understand causality**: Follow the exact sequence of events across services

## Setting Up OpenTelemetry Tracing

Before integrating logging libraries, we need to set up OpenTelemetry tracing. This foundation will provide the trace context that our loggers will use.

The following code initializes an OpenTelemetry tracer provider with an OTLP exporter. This setup creates a tracer that will generate trace and span IDs we can inject into our logs.

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// initTracer initializes the OpenTelemetry tracer provider
// and returns a shutdown function for graceful cleanup
func initTracer(ctx context.Context, serviceName string) (func(context.Context) error, error) {
    // Create the OTLP exporter that sends traces to the collector
    exporter, err := otlptracegrpc.New(ctx,
        otlptracegrpc.WithEndpoint("localhost:4317"),
        otlptracegrpc.WithInsecure(), // Use WithTLSCredentials in production
    )
    if err != nil {
        return nil, err
    }

    // Create a resource describing this service
    res, err := resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create the tracer provider with the exporter and resource
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()), // Sample all traces for demo
    )

    // Set the global tracer provider and propagator
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    return tp.Shutdown, nil
}
```

## Part 1: Structured Logging with slog

Go 1.21 introduced `slog`, a structured logging package in the standard library. It provides a clean API for structured logging without requiring external dependencies.

### Basic slog Setup

The slog package provides built-in JSON and text handlers. Here is a basic setup with JSON output, which is ideal for production environments where logs are processed by log aggregation systems.

```go
package main

import (
    "log/slog"
    "os"
)

func setupBasicSlog() *slog.Logger {
    // Create a JSON handler that writes to stdout
    // This format is ideal for log aggregation systems
    handler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level: slog.LevelInfo,
        // AddSource adds file:line information to each log entry
        AddSource: true,
    })

    return slog.New(handler)
}

func main() {
    logger := setupBasicSlog()

    // Basic structured logging with key-value pairs
    logger.Info("application started",
        "version", "1.0.0",
        "environment", "production",
    )

    // Using slog.String, slog.Int for type safety
    logger.Info("user logged in",
        slog.String("userId", "user-123"),
        slog.Int("loginAttempts", 1),
    )
}
```

### slog with OpenTelemetry Trace Correlation

To correlate slog entries with OpenTelemetry traces, we create a custom handler that extracts trace context and injects it into log records. This approach wraps the standard JSON handler with additional trace correlation logic.

```go
package main

import (
    "context"
    "log/slog"
    "os"

    "go.opentelemetry.io/otel/trace"
)

// OtelHandler wraps a slog.Handler and adds OpenTelemetry trace context
type OtelHandler struct {
    slog.Handler
}

// NewOtelHandler creates a new handler with OpenTelemetry integration
func NewOtelHandler(h slog.Handler) *OtelHandler {
    return &OtelHandler{Handler: h}
}

// Handle adds trace context to each log record before delegating
// to the wrapped handler
func (h *OtelHandler) Handle(ctx context.Context, r slog.Record) error {
    // Extract the current span from context
    spanCtx := trace.SpanContextFromContext(ctx)

    // Only add trace information if we have a valid trace
    if spanCtx.IsValid() {
        // Add trace_id and span_id as structured attributes
        r.AddAttrs(
            slog.String("trace_id", spanCtx.TraceID().String()),
            slog.String("span_id", spanCtx.SpanID().String()),
        )

        // Include trace flags for sampling information
        if spanCtx.IsSampled() {
            r.AddAttrs(slog.Bool("trace_sampled", true))
        }
    }

    return h.Handler.Handle(ctx, r)
}

// WithAttrs returns a new handler with the given attributes
func (h *OtelHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
    return NewOtelHandler(h.Handler.WithAttrs(attrs))
}

// WithGroup returns a new handler with the given group name
func (h *OtelHandler) WithGroup(name string) slog.Handler {
    return NewOtelHandler(h.Handler.WithGroup(name))
}

func setupSlogWithOtel() *slog.Logger {
    // Create the base JSON handler
    jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
        Level:     slog.LevelInfo,
        AddSource: true,
    })

    // Wrap it with our OpenTelemetry handler
    otelHandler := NewOtelHandler(jsonHandler)

    return slog.New(otelHandler)
}
```

### Complete slog Example with Tracing

This example demonstrates a complete application using slog with OpenTelemetry. Notice how we pass context through the application and use InfoContext to ensure trace correlation.

```go
package main

import (
    "context"
    "log/slog"
    "os"
    "time"

    "go.opentelemetry.io/otel"
)

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry
    shutdown, err := initTracer(ctx, "slog-demo-service")
    if err != nil {
        panic(err)
    }
    defer shutdown(ctx)

    // Set up slog with OpenTelemetry integration
    logger := setupSlogWithOtel()
    slog.SetDefault(logger)

    // Simulate a request with tracing
    tracer := otel.Tracer("slog-demo")

    ctx, span := tracer.Start(ctx, "processRequest")
    defer span.End()

    // Log with context - trace_id and span_id are automatically added
    logger.InfoContext(ctx, "processing request",
        slog.String("requestId", "req-456"),
        slog.String("method", "POST"),
        slog.String("path", "/api/users"),
    )

    // Simulate some work
    processUserRequest(ctx, logger)

    logger.InfoContext(ctx, "request completed",
        slog.Duration("duration", 150*time.Millisecond),
    )
}

func processUserRequest(ctx context.Context, logger *slog.Logger) {
    tracer := otel.Tracer("slog-demo")

    // Create a child span for the database operation
    ctx, span := tracer.Start(ctx, "database.query")
    defer span.End()

    logger.InfoContext(ctx, "querying database",
        slog.String("query", "SELECT * FROM users"),
        slog.String("table", "users"),
    )

    // Simulate database latency
    time.Sleep(50 * time.Millisecond)

    logger.InfoContext(ctx, "database query completed",
        slog.Int("rowCount", 42),
    )
}
```

## Part 2: Structured Logging with zerolog

Zerolog is a zero-allocation JSON logger that prioritizes performance. It is particularly well-suited for high-throughput applications where logging overhead must be minimized.

### Installing zerolog

First, add zerolog to your project. The package provides both the core logger and convenient helpers for common use cases.

```bash
go get github.com/rs/zerolog
```

### Basic zerolog Setup

Zerolog uses a chainable API for building log entries. This approach is both ergonomic and efficient, as it avoids allocations until the log entry is actually written.

```go
package main

import (
    "os"
    "time"

    "github.com/rs/zerolog"
    "github.com/rs/zerolog/log"
)

func setupBasicZerolog() zerolog.Logger {
    // Configure zerolog defaults
    zerolog.TimeFieldFormat = time.RFC3339Nano
    zerolog.DurationFieldUnit = time.Millisecond

    // Create a logger that writes JSON to stdout
    logger := zerolog.New(os.Stdout).
        With().
        Timestamp().           // Add timestamp to every log
        Caller().              // Add file:line to every log
        Str("service", "my-service").
        Logger()

    return logger
}

func main() {
    logger := setupBasicZerolog()

    // Basic logging with zerolog's chainable API
    logger.Info().
        Str("userId", "user-123").
        Int("loginAttempts", 1).
        Msg("user logged in")

    // Logging with nested objects
    logger.Info().
        Str("requestId", "req-789").
        Dict("user", zerolog.Dict().
            Str("id", "user-123").
            Str("email", "user@example.com")).
        Msg("processing request")
}
```

### zerolog with OpenTelemetry Trace Correlation

For zerolog, we create a helper function that extracts trace context and adds it to log entries. The hook-based approach allows automatic injection of trace information.

```go
package main

import (
    "context"
    "os"
    "time"

    "github.com/rs/zerolog"
    "go.opentelemetry.io/otel/trace"
)

// TraceHook is a zerolog hook that adds OpenTelemetry trace context
type TraceHook struct{}

// Run is called for every log event and adds trace information if available
func (h TraceHook) Run(e *zerolog.Event, level zerolog.Level, msg string) {
    // Note: zerolog hooks don't have access to context directly
    // We'll use a different approach with context-aware logging
}

// ContextLogger creates a logger with trace context from the given context
func ContextLogger(ctx context.Context, logger zerolog.Logger) zerolog.Logger {
    spanCtx := trace.SpanContextFromContext(ctx)

    if spanCtx.IsValid() {
        return logger.With().
            Str("trace_id", spanCtx.TraceID().String()).
            Str("span_id", spanCtx.SpanID().String()).
            Bool("trace_sampled", spanCtx.IsSampled()).
            Logger()
    }

    return logger
}

// LogEvent creates a log event with trace context
func LogEvent(ctx context.Context, logger *zerolog.Logger) *zerolog.Event {
    event := logger.Info()

    spanCtx := trace.SpanContextFromContext(ctx)
    if spanCtx.IsValid() {
        event = event.
            Str("trace_id", spanCtx.TraceID().String()).
            Str("span_id", spanCtx.SpanID().String()).
            Bool("trace_sampled", spanCtx.IsSampled())
    }

    return event
}

func setupZerologWithOtel() zerolog.Logger {
    zerolog.TimeFieldFormat = time.RFC3339Nano

    logger := zerolog.New(os.Stdout).
        With().
        Timestamp().
        Caller().
        Str("service", "zerolog-demo-service").
        Logger()

    return logger
}
```

### Advanced zerolog Context Pattern

This pattern provides a more ergonomic way to use zerolog with trace correlation by wrapping the logger with context-aware methods.

```go
package main

import (
    "context"
    "os"
    "time"

    "github.com/rs/zerolog"
    "go.opentelemetry.io/otel/trace"
)

// TracedLogger wraps zerolog.Logger with context-aware methods
type TracedLogger struct {
    zerolog.Logger
}

// NewTracedLogger creates a new traced logger
func NewTracedLogger() *TracedLogger {
    zerolog.TimeFieldFormat = time.RFC3339Nano

    logger := zerolog.New(os.Stdout).
        With().
        Timestamp().
        Caller().
        Logger()

    return &TracedLogger{Logger: logger}
}

// InfoCtx logs an info message with trace context
func (l *TracedLogger) InfoCtx(ctx context.Context) *zerolog.Event {
    return l.addTraceContext(ctx, l.Info())
}

// WarnCtx logs a warning message with trace context
func (l *TracedLogger) WarnCtx(ctx context.Context) *zerolog.Event {
    return l.addTraceContext(ctx, l.Warn())
}

// ErrorCtx logs an error message with trace context
func (l *TracedLogger) ErrorCtx(ctx context.Context) *zerolog.Event {
    return l.addTraceContext(ctx, l.Error())
}

// DebugCtx logs a debug message with trace context
func (l *TracedLogger) DebugCtx(ctx context.Context) *zerolog.Event {
    return l.addTraceContext(ctx, l.Debug())
}

// addTraceContext adds trace information to a log event
func (l *TracedLogger) addTraceContext(ctx context.Context, event *zerolog.Event) *zerolog.Event {
    spanCtx := trace.SpanContextFromContext(ctx)

    if spanCtx.IsValid() {
        event = event.
            Str("trace_id", spanCtx.TraceID().String()).
            Str("span_id", spanCtx.SpanID().String()).
            Bool("trace_sampled", spanCtx.IsSampled())
    }

    return event
}

// With creates a child logger with additional fields
func (l *TracedLogger) With() zerolog.Context {
    return l.Logger.With()
}
```

### Complete zerolog Example with Tracing

This example shows zerolog in action with full OpenTelemetry integration, including nested spans and proper context propagation.

```go
package main

import (
    "context"
    "errors"
    "time"

    "go.opentelemetry.io/otel"
)

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry
    shutdown, err := initTracer(ctx, "zerolog-demo-service")
    if err != nil {
        panic(err)
    }
    defer shutdown(ctx)

    // Set up zerolog with tracing
    logger := NewTracedLogger()

    // Simulate an HTTP request handler
    tracer := otel.Tracer("zerolog-demo")

    ctx, span := tracer.Start(ctx, "handleRequest")
    defer span.End()

    logger.InfoCtx(ctx).
        Str("method", "GET").
        Str("path", "/api/orders").
        Str("clientIp", "192.168.1.100").
        Msg("incoming request")

    // Process the order
    if err := processOrder(ctx, logger, "order-12345"); err != nil {
        logger.ErrorCtx(ctx).
            Err(err).
            Str("orderId", "order-12345").
            Msg("failed to process order")
    }

    logger.InfoCtx(ctx).
        Int("statusCode", 200).
        Dur("latency", 250*time.Millisecond).
        Msg("request completed")
}

func processOrder(ctx context.Context, logger *TracedLogger, orderId string) error {
    tracer := otel.Tracer("zerolog-demo")

    ctx, span := tracer.Start(ctx, "processOrder")
    defer span.End()

    logger.InfoCtx(ctx).
        Str("orderId", orderId).
        Msg("starting order processing")

    // Simulate inventory check
    ctx, inventorySpan := tracer.Start(ctx, "checkInventory")
    logger.DebugCtx(ctx).
        Str("orderId", orderId).
        Msg("checking inventory")
    time.Sleep(30 * time.Millisecond)
    inventorySpan.End()

    // Simulate payment processing
    ctx, paymentSpan := tracer.Start(ctx, "processPayment")
    logger.DebugCtx(ctx).
        Str("orderId", orderId).
        Float64("amount", 99.99).
        Msg("processing payment")
    time.Sleep(100 * time.Millisecond)
    paymentSpan.End()

    logger.InfoCtx(ctx).
        Str("orderId", orderId).
        Msg("order processed successfully")

    return nil
}
```

## Part 3: Structured Logging with zap

Uber's zap is one of the most popular logging libraries in the Go ecosystem. It offers an excellent balance of performance and features, with first-class support for structured logging.

### Installing zap

Install zap and its OpenTelemetry integration package. The otelzap package provides seamless integration with OpenTelemetry.

```bash
go get go.uber.org/zap
go get github.com/uptrace/opentelemetry-go-extra/otelzap
```

### Basic zap Setup

Zap provides two APIs: the blazing-fast but less ergonomic Logger, and the slightly slower but more convenient SugaredLogger. For production use with structured logging, the standard Logger is recommended.

```go
package main

import (
    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func setupBasicZap() (*zap.Logger, error) {
    // Production configuration with JSON output
    config := zap.Config{
        Level:       zap.NewAtomicLevelAt(zap.InfoLevel),
        Development: false,
        Encoding:    "json",
        EncoderConfig: zapcore.EncoderConfig{
            TimeKey:        "timestamp",
            LevelKey:       "level",
            NameKey:        "logger",
            CallerKey:      "caller",
            FunctionKey:    zapcore.OmitKey,
            MessageKey:     "message",
            StacktraceKey:  "stacktrace",
            LineEnding:     zapcore.DefaultLineEnding,
            EncodeLevel:    zapcore.LowercaseLevelEncoder,
            EncodeTime:     zapcore.ISO8601TimeEncoder,
            EncodeDuration: zapcore.MillisDurationEncoder,
            EncodeCaller:   zapcore.ShortCallerEncoder,
        },
        OutputPaths:      []string{"stdout"},
        ErrorOutputPaths: []string{"stderr"},
        // Add initial fields that appear in every log entry
        InitialFields: map[string]interface{}{
            "service": "my-service",
            "version": "1.0.0",
        },
    }

    return config.Build()
}

func main() {
    logger, err := setupBasicZap()
    if err != nil {
        panic(err)
    }
    defer logger.Sync()

    // Structured logging with strongly-typed fields
    logger.Info("application started",
        zap.String("environment", "production"),
        zap.Int("port", 8080),
    )

    // Logging with nested objects
    logger.Info("user action",
        zap.String("action", "login"),
        zap.Object("user", zapcore.ObjectMarshalerFunc(func(enc zapcore.ObjectEncoder) error {
            enc.AddString("id", "user-123")
            enc.AddString("email", "user@example.com")
            return nil
        })),
    )
}
```

### zap with OpenTelemetry Using otelzap

The otelzap package provides automatic trace correlation. It wraps your zap logger and automatically injects trace context into log entries.

```go
package main

import (
    "context"

    "github.com/uptrace/opentelemetry-go-extra/otelzap"
    "go.uber.org/zap"
)

func setupZapWithOtel() (*otelzap.Logger, error) {
    // Create the base zap logger
    zapLogger, err := zap.NewProduction()
    if err != nil {
        return nil, err
    }

    // Wrap with otelzap for automatic trace correlation
    // The WithTraceIDField and WithMinLevel options customize behavior
    otelLogger := otelzap.New(zapLogger,
        otelzap.WithTraceIDField(true),    // Add trace_id to logs
        otelzap.WithMinLevel(zap.InfoLevel), // Minimum level for trace correlation
        otelzap.WithStackTrace(true),        // Include stack traces for errors
    )

    return otelLogger, nil
}

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry
    shutdown, err := initTracer(ctx, "zap-demo-service")
    if err != nil {
        panic(err)
    }
    defer shutdown(ctx)

    // Set up zap with OpenTelemetry
    logger, err := setupZapWithOtel()
    if err != nil {
        panic(err)
    }
    defer logger.Sync()

    // Use Ctx method to log with trace context
    logger.Ctx(ctx).Info("request received",
        zap.String("method", "POST"),
        zap.String("path", "/api/users"),
    )
}
```

### Manual zap Trace Correlation

If you prefer not to use otelzap, you can manually add trace context to your logs. This approach gives you full control over the trace fields.

```go
package main

import (
    "context"

    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

// TraceFields extracts OpenTelemetry trace context and returns zap fields
func TraceFields(ctx context.Context) []zap.Field {
    spanCtx := trace.SpanContextFromContext(ctx)

    if !spanCtx.IsValid() {
        return nil
    }

    return []zap.Field{
        zap.String("trace_id", spanCtx.TraceID().String()),
        zap.String("span_id", spanCtx.SpanID().String()),
        zap.Bool("trace_sampled", spanCtx.IsSampled()),
    }
}

// LogWithTrace logs a message with trace context
func LogWithTrace(ctx context.Context, logger *zap.Logger, msg string, fields ...zap.Field) {
    // Append trace fields to the provided fields
    allFields := append(TraceFields(ctx), fields...)
    logger.Info(msg, allFields...)
}

// TracedLogger wraps zap.Logger with context-aware methods
type TracedZapLogger struct {
    *zap.Logger
}

// NewTracedZapLogger creates a new traced zap logger
func NewTracedZapLogger() (*TracedZapLogger, error) {
    logger, err := zap.NewProduction()
    if err != nil {
        return nil, err
    }
    return &TracedZapLogger{Logger: logger}, nil
}

// InfoCtx logs an info message with trace context
func (l *TracedZapLogger) InfoCtx(ctx context.Context, msg string, fields ...zap.Field) {
    allFields := append(TraceFields(ctx), fields...)
    l.Info(msg, allFields...)
}

// WarnCtx logs a warning message with trace context
func (l *TracedZapLogger) WarnCtx(ctx context.Context, msg string, fields ...zap.Field) {
    allFields := append(TraceFields(ctx), fields...)
    l.Warn(msg, allFields...)
}

// ErrorCtx logs an error message with trace context
func (l *TracedZapLogger) ErrorCtx(ctx context.Context, msg string, fields ...zap.Field) {
    allFields := append(TraceFields(ctx), fields...)
    l.Error(msg, allFields...)
}
```

### Complete zap Example with Tracing

This comprehensive example demonstrates zap with OpenTelemetry in a realistic service scenario with multiple nested operations.

```go
package main

import (
    "context"
    "time"

    "github.com/uptrace/opentelemetry-go-extra/otelzap"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.uber.org/zap"
)

func main() {
    ctx := context.Background()

    // Initialize OpenTelemetry
    shutdown, err := initTracer(ctx, "zap-demo-service")
    if err != nil {
        panic(err)
    }
    defer shutdown(ctx)

    // Set up zap with OpenTelemetry
    logger, err := setupZapWithOtel()
    if err != nil {
        panic(err)
    }
    defer logger.Sync()

    // Simulate handling multiple requests
    for i := 0; i < 3; i++ {
        handleUserRequest(ctx, logger, i)
    }
}

func handleUserRequest(ctx context.Context, logger *otelzap.Logger, requestNum int) {
    tracer := otel.Tracer("zap-demo")

    // Start a new trace for each request
    ctx, span := tracer.Start(ctx, "handleUserRequest")
    defer span.End()

    // Add request attributes to the span
    span.SetAttributes(
        attribute.Int("request.number", requestNum),
        attribute.String("request.type", "user_action"),
    )

    logger.Ctx(ctx).Info("handling user request",
        zap.Int("requestNumber", requestNum),
        zap.String("handler", "handleUserRequest"),
    )

    // Simulate user validation
    if err := validateUser(ctx, logger); err != nil {
        logger.Ctx(ctx).Error("user validation failed",
            zap.Error(err),
        )
        return
    }

    // Simulate data processing
    processUserData(ctx, logger)

    logger.Ctx(ctx).Info("user request completed",
        zap.Int("requestNumber", requestNum),
        zap.Duration("totalDuration", 200*time.Millisecond),
    )
}

func validateUser(ctx context.Context, logger *otelzap.Logger) error {
    tracer := otel.Tracer("zap-demo")

    ctx, span := tracer.Start(ctx, "validateUser")
    defer span.End()

    logger.Ctx(ctx).Debug("validating user credentials")

    time.Sleep(20 * time.Millisecond)

    logger.Ctx(ctx).Debug("user credentials validated")

    return nil
}

func processUserData(ctx context.Context, logger *otelzap.Logger) {
    tracer := otel.Tracer("zap-demo")

    ctx, span := tracer.Start(ctx, "processUserData")
    defer span.End()

    logger.Ctx(ctx).Info("processing user data",
        zap.String("operation", "data_transform"),
    )

    // Simulate cache check
    ctx, cacheSpan := tracer.Start(ctx, "checkCache")
    logger.Ctx(ctx).Debug("checking cache")
    time.Sleep(5 * time.Millisecond)
    cacheSpan.End()

    // Simulate database write
    ctx, dbSpan := tracer.Start(ctx, "writeDatabase")
    logger.Ctx(ctx).Debug("writing to database")
    time.Sleep(50 * time.Millisecond)
    dbSpan.End()

    logger.Ctx(ctx).Info("user data processed successfully")
}
```

## Production Best Practices

### 1. Log Level Configuration

Use environment variables to configure log levels dynamically. This allows you to increase verbosity in production without redeploying.

```go
package main

import (
    "log/slog"
    "os"
    "strings"
)

func getLogLevel() slog.Level {
    levelStr := os.Getenv("LOG_LEVEL")

    switch strings.ToUpper(levelStr) {
    case "DEBUG":
        return slog.LevelDebug
    case "INFO":
        return slog.LevelInfo
    case "WARN", "WARNING":
        return slog.LevelWarn
    case "ERROR":
        return slog.LevelError
    default:
        return slog.LevelInfo
    }
}
```

### 2. Sensitive Data Redaction

Never log sensitive information like passwords, API keys, or personal data. Create wrapper types that implement custom marshaling.

```go
package main

import (
    "log/slog"
)

// RedactedString is a string type that redacts its value when logged
type RedactedString string

// LogValue implements slog.LogValuer to redact the value
func (r RedactedString) LogValue() slog.Value {
    return slog.StringValue("[REDACTED]")
}

// Example usage with sensitive data
func logUserAction(logger *slog.Logger, userId string, password RedactedString) {
    logger.Info("user authentication attempt",
        slog.String("userId", userId),
        slog.Any("password", password), // Will log as "[REDACTED]"
    )
}
```

### 3. Error Logging Standards

Establish consistent error logging patterns across your codebase. Include relevant context but avoid excessive nesting.

```go
package main

import (
    "context"
    "errors"
    "log/slog"
)

// LogError logs an error with consistent structure
func LogError(ctx context.Context, logger *slog.Logger, err error, msg string, attrs ...slog.Attr) {
    // Build the base attributes
    baseAttrs := []slog.Attr{
        slog.String("error", err.Error()),
        slog.String("errorType", errors.Unwrap(err).Error()),
    }

    // Combine with provided attributes
    allAttrs := append(baseAttrs, attrs...)

    // Convert to args for ErrorContext
    args := make([]any, 0, len(allAttrs)*2)
    for _, attr := range allAttrs {
        args = append(args, attr.Key, attr.Value)
    }

    logger.ErrorContext(ctx, msg, args...)
}
```

### 4. Request Context Logging

For HTTP services, create middleware that adds request-scoped fields to the logger.

```go
package main

import (
    "context"
    "log/slog"
    "net/http"

    "github.com/google/uuid"
)

type contextKey string

const loggerKey contextKey = "logger"

// LoggingMiddleware adds request context to the logger
func LoggingMiddleware(baseLogger *slog.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Generate or extract request ID
            requestId := r.Header.Get("X-Request-ID")
            if requestId == "" {
                requestId = uuid.New().String()
            }

            // Create request-scoped logger
            requestLogger := baseLogger.With(
                slog.String("requestId", requestId),
                slog.String("method", r.Method),
                slog.String("path", r.URL.Path),
                slog.String("remoteAddr", r.RemoteAddr),
            )

            // Add logger to context
            ctx := context.WithValue(r.Context(), loggerKey, requestLogger)

            next.ServeHTTP(w, r.WithContext(ctx))
        })
    }
}

// LoggerFromContext retrieves the logger from context
func LoggerFromContext(ctx context.Context) *slog.Logger {
    if logger, ok := ctx.Value(loggerKey).(*slog.Logger); ok {
        return logger
    }
    return slog.Default()
}
```

### 5. Sampling High-Volume Logs

For high-traffic services, consider sampling debug logs to reduce volume while maintaining visibility.

```go
package main

import (
    "context"
    "log/slog"
    "math/rand"
    "sync/atomic"
)

// SampledHandler samples logs based on configured rate
type SampledHandler struct {
    slog.Handler
    sampleRate float64
    counter    atomic.Int64
}

// NewSampledHandler creates a handler that samples logs
func NewSampledHandler(h slog.Handler, sampleRate float64) *SampledHandler {
    return &SampledHandler{
        Handler:    h,
        sampleRate: sampleRate,
    }
}

// Handle decides whether to log based on sampling
func (h *SampledHandler) Handle(ctx context.Context, r slog.Record) error {
    // Always log errors and warnings
    if r.Level >= slog.LevelWarn {
        return h.Handler.Handle(ctx, r)
    }

    // Sample lower-level logs
    if rand.Float64() < h.sampleRate {
        // Add sampling metadata
        r.AddAttrs(slog.Bool("sampled", true))
        return h.Handler.Handle(ctx, r)
    }

    return nil
}
```

### 6. Async Log Writing

For high-performance applications, consider buffering logs and writing them asynchronously.

```go
package main

import (
    "context"
    "log/slog"
    "sync"
)

// BufferedHandler buffers log records and writes them in batches
type BufferedHandler struct {
    slog.Handler
    buffer chan slog.Record
    wg     sync.WaitGroup
}

// NewBufferedHandler creates a buffered handler
func NewBufferedHandler(h slog.Handler, bufferSize int) *BufferedHandler {
    bh := &BufferedHandler{
        Handler: h,
        buffer:  make(chan slog.Record, bufferSize),
    }

    bh.wg.Add(1)
    go bh.processBuffer()

    return bh
}

// Handle adds record to buffer instead of writing immediately
func (h *BufferedHandler) Handle(ctx context.Context, r slog.Record) error {
    // Clone the record to avoid data races
    clone := slog.NewRecord(r.Time, r.Level, r.Message, r.PC)
    r.Attrs(func(a slog.Attr) bool {
        clone.AddAttrs(a)
        return true
    })

    select {
    case h.buffer <- clone:
        return nil
    default:
        // Buffer full, write synchronously
        return h.Handler.Handle(ctx, r)
    }
}

// processBuffer writes buffered records
func (h *BufferedHandler) processBuffer() {
    defer h.wg.Done()

    for record := range h.buffer {
        h.Handler.Handle(context.Background(), record)
    }
}

// Close flushes remaining records and closes the handler
func (h *BufferedHandler) Close() {
    close(h.buffer)
    h.wg.Wait()
}
```

## Comparing the Three Libraries

| Feature | slog | zerolog | zap |
|---------|------|---------|-----|
| Standard Library | Yes | No | No |
| Performance | Good | Excellent | Excellent |
| API Style | Method-based | Chainable | Strongly-typed |
| Zero Allocations | No | Yes | Yes (Logger) |
| OTel Integration | Manual | Manual | otelzap package |
| Learning Curve | Low | Medium | Medium |
| Community | Growing | Large | Very Large |

### When to Use Each

**Choose slog when:**
- You want to minimize dependencies
- You are building a library that others will use
- You need a simple, straightforward logging solution

**Choose zerolog when:**
- Performance is critical and you need zero allocations
- You prefer a chainable API
- You are building high-throughput services

**Choose zap when:**
- You want the best balance of performance and features
- You need strong typing for log fields
- You want first-class OpenTelemetry support via otelzap

## Conclusion

Structured logging with trace correlation is essential for debugging and monitoring distributed systems. By integrating your Go logging library with OpenTelemetry, you gain the ability to correlate logs with traces, making it significantly easier to understand the behavior of your applications in production.

All three libraries covered in this guide-slog, zerolog, and zap-are excellent choices for structured logging in Go. The best choice depends on your specific requirements:

- Use **slog** for simplicity and minimal dependencies
- Use **zerolog** for maximum performance
- Use **zap** for the best balance of features and performance

Regardless of which library you choose, the key principles remain the same:

1. Always use structured logging with consistent field names
2. Inject trace and span IDs into every log entry
3. Pass context through your application for proper correlation
4. Follow production best practices for log levels, sampling, and sensitive data handling

With these practices in place, you will have a robust observability foundation that makes debugging and monitoring your Go applications significantly more effective.

## Additional Resources

- [OpenTelemetry Go Documentation](https://opentelemetry.io/docs/instrumentation/go/)
- [slog Package Documentation](https://pkg.go.dev/log/slog)
- [zerolog GitHub Repository](https://github.com/rs/zerolog)
- [zap GitHub Repository](https://github.com/uber-go/zap)
- [otelzap Package](https://github.com/uptrace/opentelemetry-go-extra/tree/main/otelzap)
- [OpenTelemetry Logs Specification](https://opentelemetry.io/docs/specs/otel/logs/)
