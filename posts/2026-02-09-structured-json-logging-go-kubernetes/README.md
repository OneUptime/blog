# How to Implement Structured JSON Logging for Go Applications Running in Kubernetes

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Kubernetes, Logging

Description: Learn how to implement structured JSON logging in Go applications deployed on Kubernetes using libraries like zap and logrus, enabling efficient log aggregation and querying with Loki and other log management systems.

---

Unstructured log messages work fine for local development, but they become a nightmare in production Kubernetes environments where you need to search, filter, and aggregate across thousands of pods. Structured JSON logging transforms logs from plain text into queryable data, making it trivial to find errors, track requests, and analyze application behavior at scale.

This guide shows you how to implement production-grade structured logging in Go applications running on Kubernetes.

## Why Structured JSON Logging Matters

Traditional log format:

```
2026-02-09 14:23:45 INFO User john logged in from 192.168.1.10
```

Structured JSON format:

```json
{
  "timestamp": "2026-02-09T14:23:45Z",
  "level": "info",
  "message": "User logged in",
  "user_id": "john",
  "source_ip": "192.168.1.10",
  "service": "auth-service",
  "trace_id": "a1b2c3d4"
}
```

The structured version is machine-parseable, allowing queries like "show all errors for user john" or "find all requests with trace_id a1b2c3d4".

## Using zap for High-Performance Logging

Uber's zap library provides fast, structured logging:

```go
package main

import (
    "context"
    "os"

    "go.uber.org/zap"
    "go.uber.org/zap/zapcore"
)

func initLogger() (*zap.Logger, error) {
    // Production configuration
    config := zap.NewProductionConfig()

    // Output to stdout (Kubernetes will capture it)
    config.OutputPaths = []string{"stdout"}
    config.ErrorOutputPaths = []string{"stderr"}

    // Use JSON encoding
    config.Encoding = "json"

    // Set log level from environment
    level := os.Getenv("LOG_LEVEL")
    if level != "" {
        var zapLevel zapcore.Level
        if err := zapLevel.UnmarshalText([]byte(level)); err == nil {
            config.Level = zap.NewAtomicLevelAt(zapLevel)
        }
    }

    // Add caller information
    config.EncoderConfig.CallerKey = "caller"
    config.EncoderConfig.StacktraceKey = "stacktrace"

    // Add Kubernetes metadata
    namespace := os.Getenv("NAMESPACE")
    podName := os.Getenv("POD_NAME")
    nodeName := os.Getenv("NODE_NAME")

    config.InitialFields = map[string]interface{}{
        "namespace": namespace,
        "pod":       podName,
        "node":      nodeName,
        "service":   "my-service",
    }

    return config.Build()
}

func main() {
    logger, err := initLogger()
    if err != nil {
        panic(err)
    }
    defer logger.Sync()

    // Replace global logger
    zap.ReplaceGlobals(logger)

    // Use structured logging
    logger.Info("Application started",
        zap.String("version", "1.0.0"),
        zap.Int("port", 8080),
    )

    // Log with different levels
    logger.Debug("Debug message", zap.String("component", "database"))
    logger.Info("Info message", zap.String("user", "john"))
    logger.Warn("Warning message", zap.Int("retry_count", 3))
    logger.Error("Error message", zap.Error(err))
}
```

Deploy with environment variables:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-app
  namespace: production
spec:
  template:
    spec:
      containers:
      - name: app
        image: my-go-app:latest
        env:
        - name: LOG_LEVEL
          value: "info"
        - name: NAMESPACE
          valueFrom:
            fieldRef:
              fieldPath: metadata.namespace
        - name: POD_NAME
          valueFrom:
            fieldRef:
              fieldPath: metadata.name
        - name: NODE_NAME
          valueFrom:
            fieldRef:
              fieldPath: spec.nodeName
```

## HTTP Request Logging Middleware

Log HTTP requests with comprehensive context:

```go
package middleware

import (
    "net/http"
    "time"

    "go.uber.org/zap"
)

type responseWriter struct {
    http.ResponseWriter
    statusCode int
    bytesWritten int
}

func (rw *responseWriter) WriteHeader(code int) {
    rw.statusCode = code
    rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
    n, err := rw.ResponseWriter.Write(b)
    rw.bytesWritten += n
    return n, err
}

func LoggingMiddleware(logger *zap.Logger) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            start := time.Now()

            // Wrap response writer to capture status code
            wrapped := &responseWriter{
                ResponseWriter: w,
                statusCode:     http.StatusOK,
            }

            // Extract request ID or generate one
            requestID := r.Header.Get("X-Request-ID")
            if requestID == "" {
                requestID = generateRequestID()
            }

            // Add request ID to response headers
            wrapped.Header().Set("X-Request-ID", requestID)

            // Create request-scoped logger
            reqLogger := logger.With(
                zap.String("request_id", requestID),
                zap.String("method", r.Method),
                zap.String("path", r.URL.Path),
                zap.String("remote_addr", r.RemoteAddr),
                zap.String("user_agent", r.Header.Get("User-Agent")),
            )

            // Log request start
            reqLogger.Info("Request started")

            // Process request
            next.ServeHTTP(wrapped, r)

            // Calculate duration
            duration := time.Since(start)

            // Log request completion
            reqLogger.Info("Request completed",
                zap.Int("status_code", wrapped.statusCode),
                zap.Int("response_size", wrapped.bytesWritten),
                zap.Duration("duration", duration),
                zap.Float64("duration_ms", float64(duration.Milliseconds())),
            )
        })
    }
}

func generateRequestID() string {
    // Implementation details
    return "req_" + randomString(16)
}
```

## Database Query Logging

Log database operations with context:

```go
package database

import (
    "context"
    "database/sql"
    "time"

    "go.uber.org/zap"
)

type LoggedDB struct {
    *sql.DB
    logger *zap.Logger
}

func (db *LoggedDB) QueryContext(ctx context.Context, query string, args ...interface{}) (*sql.Rows, error) {
    start := time.Now()

    rows, err := db.DB.QueryContext(ctx, query, args...)

    duration := time.Since(start)

    // Log query execution
    fields := []zap.Field{
        zap.String("query", query),
        zap.Duration("duration", duration),
        zap.Float64("duration_ms", float64(duration.Milliseconds())),
    }

    if err != nil {
        fields = append(fields, zap.Error(err))
        db.logger.Error("Database query failed", fields...)
    } else {
        db.logger.Debug("Database query executed", fields...)
    }

    // Log slow queries as warnings
    if duration > 1*time.Second {
        db.logger.Warn("Slow database query", fields...)
    }

    return rows, err
}

func (db *LoggedDB) ExecContext(ctx context.Context, query string, args ...interface{}) (sql.Result, error) {
    start := time.Now()

    result, err := db.DB.ExecContext(ctx, query, args...)

    duration := time.Since(start)

    fields := []zap.Field{
        zap.String("query", query),
        zap.Duration("duration", duration),
    }

    if err != nil {
        fields = append(fields, zap.Error(err))
        db.logger.Error("Database exec failed", fields...)
    } else {
        // Log affected rows if available
        if rowsAffected, err := result.RowsAffected(); err == nil {
            fields = append(fields, zap.Int64("rows_affected", rowsAffected))
        }
        db.logger.Debug("Database exec completed", fields...)
    }

    return result, err
}
```

## Error Logging with Stack Traces

Log errors with complete context:

```go
package errors

import (
    "fmt"
    "runtime"

    "go.uber.org/zap"
)

func LogError(logger *zap.Logger, err error, msg string, fields ...zap.Field) {
    if err == nil {
        return
    }

    // Add error to fields
    fields = append(fields, zap.Error(err))

    // Add stack trace for critical errors
    if isCriticalError(err) {
        stacktrace := make([]byte, 4096)
        length := runtime.Stack(stacktrace, false)
        fields = append(fields, zap.String("stacktrace", string(stacktrace[:length])))
    }

    // Add error type
    fields = append(fields, zap.String("error_type", fmt.Sprintf("%T", err)))

    logger.Error(msg, fields...)
}

func isCriticalError(err error) bool {
    // Define what constitutes a critical error
    // For example, database errors, panic recoveries, etc.
    return true
}

// Example usage
func ProcessRequest(logger *zap.Logger) error {
    err := someOperation()
    if err != nil {
        LogError(logger, err, "Failed to process request",
            zap.String("operation", "someOperation"),
            zap.String("user_id", "12345"),
        )
        return err
    }
    return nil
}
```

## Using logrus as Alternative

Some teams prefer logrus:

```go
package main

import (
    "os"

    "github.com/sirupsen/logrus"
)

func initLogrus() *logrus.Logger {
    logger := logrus.New()

    // JSON formatting
    logger.SetFormatter(&logrus.JSONFormatter{
        TimestampFormat: "2006-01-02T15:04:05.000Z",
        FieldMap: logrus.FieldMap{
            logrus.FieldKeyTime:  "timestamp",
            logrus.FieldKeyLevel: "level",
            logrus.FieldKeyMsg:   "message",
        },
    })

    // Output to stdout
    logger.SetOutput(os.Stdout)

    // Set log level
    logger.SetLevel(logrus.InfoLevel)

    // Add default fields
    logger.WithFields(logrus.Fields{
        "namespace": os.Getenv("NAMESPACE"),
        "pod":       os.Getenv("POD_NAME"),
        "service":   "my-service",
    })

    return logger
}

func main() {
    logger := initLogrus()

    // Structured logging
    logger.WithFields(logrus.Fields{
        "user_id": "john",
        "action":  "login",
    }).Info("User logged in")

    // Error logging
    err := someOperation()
    if err != nil {
        logger.WithFields(logrus.Fields{
            "error": err.Error(),
            "operation": "someOperation",
        }).Error("Operation failed")
    }
}
```

## Integrating with OpenTelemetry Traces

Add trace context to logs:

```go
package logging

import (
    "context"

    "go.opentelemetry.io/otel/trace"
    "go.uber.org/zap"
)

func LogWithTrace(ctx context.Context, logger *zap.Logger, msg string, fields ...zap.Field) {
    span := trace.SpanFromContext(ctx)
    if span.SpanContext().IsValid() {
        fields = append(fields,
            zap.String("trace_id", span.SpanContext().TraceID().String()),
            zap.String("span_id", span.SpanContext().SpanID().String()),
        )
    }

    logger.Info(msg, fields...)
}

// Usage example
func HandleRequest(ctx context.Context, logger *zap.Logger) {
    LogWithTrace(ctx, logger, "Processing request",
        zap.String("user_id", "12345"),
    )
}
```

## Log Sampling for High-Volume Services

Reduce log volume while maintaining visibility:

```go
func initSampledLogger() *zap.Logger {
    config := zap.NewProductionConfig()

    // Sample debug and info logs (1 out of every 100)
    config.Sampling = &zap.SamplingConfig{
        Initial:    100,
        Thereafter: 100,
    }

    logger, _ := config.Build()
    return logger
}
```

## Best Practices Configuration

Production-ready logger configuration:

```go
func NewProductionLogger() (*zap.Logger, error) {
    encoderConfig := zapcore.EncoderConfig{
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
    }

    config := zap.Config{
        Level:             zap.NewAtomicLevelAt(zap.InfoLevel),
        Development:       false,
        DisableCaller:     false,
        DisableStacktrace: false,
        Sampling: &zap.SamplingConfig{
            Initial:    100,
            Thereafter: 100,
        },
        Encoding:         "json",
        EncoderConfig:    encoderConfig,
        OutputPaths:      []string{"stdout"},
        ErrorOutputPaths: []string{"stderr"},
        InitialFields: map[string]interface{}{
            "namespace": os.Getenv("NAMESPACE"),
            "pod":       os.Getenv("POD_NAME"),
            "node":      os.Getenv("NODE_NAME"),
        },
    }

    return config.Build()
}
```

## Querying Logs in Loki

With structured JSON logging, query logs efficiently:

```logql
# Find all errors for specific user
{namespace="production"} | json | user_id="john" | level="error"

# Calculate error rate by service
sum by (service) (rate({namespace="production"} | json | level="error" [5m]))

# Find slow database queries
{namespace="production"} | json | duration_ms > 1000 | query != ""

# Trace specific request
{namespace="production"} | json | trace_id="a1b2c3d4"
```

## Conclusion

Structured JSON logging transforms Go applications from producing opaque text streams to generating queryable, analyzable data. By using libraries like zap or logrus, adding Kubernetes metadata, and following best practices for field naming and log levels, you create logs that integrate seamlessly with Loki, Elasticsearch, and other log aggregation systems. The result is comprehensive observability that scales from single pods to thousand-pod deployments.
