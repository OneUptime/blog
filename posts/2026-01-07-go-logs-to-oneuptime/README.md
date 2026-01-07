# How to Send Go Application Logs to OneUptime

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, OneUptime, Logging, Observability, OpenTelemetry, Monitoring

Description: Learn how to send Go application logs to OneUptime for centralized logging and observability using OpenTelemetry and structured logging.

---

Centralized logging is a cornerstone of modern observability. When your Go applications run across multiple containers, pods, or servers, having all logs in one place becomes essential for debugging, monitoring, and maintaining system health. OneUptime provides a powerful platform for aggregating and analyzing logs from all your services.

In this comprehensive guide, we will walk through how to send Go application logs to OneUptime using OpenTelemetry, the industry-standard framework for observability. We will cover everything from basic setup to advanced configurations with popular Go logging libraries.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Understanding the Architecture](#understanding-the-architecture)
3. [Setting Up Your Go Project](#setting-up-your-go-project)
4. [Configuring OpenTelemetry Log Exporter](#configuring-opentelemetry-log-exporter)
5. [Integrating with Popular Go Logging Libraries](#integrating-with-popular-go-logging-libraries)
6. [Log Levels and Filtering](#log-levels-and-filtering)
7. [Structured Logging Best Practices](#structured-logging-best-practices)
8. [Advanced Configuration](#advanced-configuration)
9. [Troubleshooting](#troubleshooting)
10. [Conclusion](#conclusion)

## Prerequisites

Before we begin, ensure you have the following:

- Go 1.21 or later installed
- A OneUptime account with an active project
- Your OneUptime OTLP endpoint URL and API key
- Basic familiarity with Go programming

## Understanding the Architecture

OneUptime accepts logs via the OpenTelemetry Protocol (OTLP), which is the standard transport mechanism for OpenTelemetry data. The architecture looks like this:

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│  Go Application │────▶│  OTLP Exporter  │────▶│    OneUptime    │
│   (Your Code)   │     │  (gRPC/HTTP)    │     │   Log Ingestion │
└─────────────────┘     └─────────────────┘     └─────────────────┘
```

Your Go application generates logs, which are then exported to OneUptime using the OTLP exporter over either gRPC or HTTP.

## Setting Up Your Go Project

Let's start by creating a new Go project and installing the necessary dependencies.

Create a new directory and initialize a Go module:

```bash
mkdir go-oneuptime-logging
cd go-oneuptime-logging
go mod init github.com/yourusername/go-oneuptime-logging
```

Install the required OpenTelemetry packages for logging:

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp
go get go.opentelemetry.io/otel/sdk/log
go get go.opentelemetry.io/otel/log
```

## Configuring OpenTelemetry Log Exporter

Now let's create the core configuration for sending logs to OneUptime. We will set up an OTLP exporter that connects to OneUptime's ingestion endpoint.

Create a file named `otel.go` that initializes the OpenTelemetry logging pipeline:

```go
package main

import (
	"context"
	"fmt"
	"os"
	"time"

	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
	"go.opentelemetry.io/otel/log/global"
	sdklog "go.opentelemetry.io/otel/sdk/log"
	"go.opentelemetry.io/otel/sdk/resource"
	semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// InitLogging initializes the OpenTelemetry logging pipeline with OneUptime
// as the destination. It returns a shutdown function that should be called
// when the application exits to ensure all logs are flushed.
func InitLogging(ctx context.Context) (func(context.Context) error, error) {
	// Retrieve OneUptime configuration from environment variables
	// These should be set in your deployment configuration
	endpoint := os.Getenv("ONEUPTIME_OTLP_ENDPOINT")
	apiKey := os.Getenv("ONEUPTIME_API_KEY")
	serviceName := os.Getenv("SERVICE_NAME")

	if endpoint == "" {
		endpoint = "https://otlp.oneuptime.com"
	}

	if serviceName == "" {
		serviceName = "go-application"
	}

	// Create the OTLP HTTP exporter configured for OneUptime
	// The exporter handles batching and retry logic automatically
	exporter, err := otlploghttp.New(ctx,
		otlploghttp.WithEndpoint(endpoint),
		otlploghttp.WithHeaders(map[string]string{
			"x-oneuptime-token": apiKey,
		}),
		// Use insecure connection only for local development
		// In production, always use TLS
		otlploghttp.WithInsecure(),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create OTLP exporter: %w", err)
	}

	// Define the resource that identifies this application
	// These attributes help you filter and group logs in OneUptime
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(serviceName),
			semconv.ServiceVersion("1.0.0"),
			semconv.DeploymentEnvironment("production"),
		),
	)
	if err != nil {
		return nil, fmt.Errorf("failed to create resource: %w", err)
	}

	// Create the log processor with batching enabled
	// Batching improves performance by sending multiple logs in one request
	processor := sdklog.NewBatchProcessor(exporter,
		sdklog.WithMaxQueueSize(2048),
		sdklog.WithExportMaxBatchSize(512),
		sdklog.WithExportInterval(5*time.Second),
		sdklog.WithExportTimeout(30*time.Second),
	)

	// Create the logger provider with the processor and resource
	provider := sdklog.NewLoggerProvider(
		sdklog.WithProcessor(processor),
		sdklog.WithResource(res),
	)

	// Set the global logger provider so it can be used throughout the application
	global.SetLoggerProvider(provider)

	return provider.Shutdown, nil
}
```

Create the main application file that uses the logging configuration:

```go
package main

import (
	"context"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize the OpenTelemetry logging pipeline
	// The shutdown function ensures all logs are flushed before exit
	shutdown, err := InitLogging(ctx)
	if err != nil {
		panic(err)
	}
	defer func() {
		// Give the exporter time to flush remaining logs
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if err := shutdown(shutdownCtx); err != nil {
			os.Stderr.WriteString("Error shutting down logger: " + err.Error() + "\n")
		}
	}()

	// Get the logger from the global provider
	logger := global.GetLoggerProvider().Logger("main")

	// Log application startup
	logger.Emit(ctx, log.Record{}.
		SetSeverity(log.SeverityInfo).
		SetBody(log.StringValue("Application started")).
		AddAttributes(
			log.String("component", "main"),
			log.String("version", "1.0.0"),
		))

	// Simulate application work
	for i := 0; i < 5; i++ {
		logger.Emit(ctx, log.Record{}.
			SetSeverity(log.SeverityInfo).
			SetBody(log.StringValue("Processing request")).
			AddAttributes(
				log.Int("request_id", i),
				log.String("method", "GET"),
				log.String("path", "/api/users"),
			))
		time.Sleep(1 * time.Second)
	}

	// Wait for interrupt signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	logger.Emit(ctx, log.Record{}.
		SetSeverity(log.SeverityInfo).
		SetBody(log.StringValue("Application shutting down")))
}
```

## Integrating with Popular Go Logging Libraries

While OpenTelemetry provides native logging capabilities, you may already be using popular Go logging libraries. Let's see how to integrate them with OneUptime.

### Integration with Zap

Zap is one of the most popular high-performance logging libraries for Go. Here's how to create a bridge that sends Zap logs to OneUptime:

```go
package logging

import (
	"context"

	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
	"go.uber.org/zap"
	"go.uber.org/zap/zapcore"
)

// OtelCore implements zapcore.Core and forwards logs to OpenTelemetry
// This allows you to use Zap's API while sending logs to OneUptime
type OtelCore struct {
	logger log.Logger
	level  zapcore.Level
	fields []log.KeyValue
}

// NewOtelCore creates a new Zap core that sends logs to OpenTelemetry
func NewOtelCore(level zapcore.Level) *OtelCore {
	return &OtelCore{
		logger: global.GetLoggerProvider().Logger("zap"),
		level:  level,
		fields: make([]log.KeyValue, 0),
	}
}

// Enabled returns true if the given level is at or above the core's level
func (c *OtelCore) Enabled(level zapcore.Level) bool {
	return level >= c.level
}

// With creates a new core with additional fields
func (c *OtelCore) With(fields []zapcore.Field) zapcore.Core {
	newFields := make([]log.KeyValue, len(c.fields), len(c.fields)+len(fields))
	copy(newFields, c.fields)

	for _, f := range fields {
		newFields = append(newFields, convertZapField(f))
	}

	return &OtelCore{
		logger: c.logger,
		level:  c.level,
		fields: newFields,
	}
}

// Check determines whether the supplied entry should be logged
func (c *OtelCore) Check(entry zapcore.Entry, checked *zapcore.CheckedEntry) *zapcore.CheckedEntry {
	if c.Enabled(entry.Level) {
		return checked.AddCore(entry, c)
	}
	return checked
}

// Write serializes the entry and any fields to the OpenTelemetry logger
func (c *OtelCore) Write(entry zapcore.Entry, fields []zapcore.Field) error {
	// Create a new log record
	record := log.Record{}
	record.SetBody(log.StringValue(entry.Message))
	record.SetSeverity(zapLevelToOtelSeverity(entry.Level))
	record.SetTimestamp(entry.Time)

	// Add base fields
	allAttrs := make([]log.KeyValue, 0, len(c.fields)+len(fields)+2)
	allAttrs = append(allAttrs, c.fields...)
	allAttrs = append(allAttrs, log.String("logger", entry.LoggerName))
	allAttrs = append(allAttrs, log.String("caller", entry.Caller.String()))

	// Add entry-specific fields
	for _, f := range fields {
		allAttrs = append(allAttrs, convertZapField(f))
	}

	record.AddAttributes(allAttrs...)

	// Emit the log record
	c.logger.Emit(context.Background(), record)
	return nil
}

// Sync flushes any buffered logs (no-op for OpenTelemetry as batching is handled by the exporter)
func (c *OtelCore) Sync() error {
	return nil
}

// convertZapField converts a Zap field to an OpenTelemetry KeyValue
func convertZapField(f zapcore.Field) log.KeyValue {
	switch f.Type {
	case zapcore.StringType:
		return log.String(f.Key, f.String)
	case zapcore.Int64Type, zapcore.Int32Type, zapcore.Int16Type, zapcore.Int8Type:
		return log.Int64(f.Key, f.Integer)
	case zapcore.Float64Type:
		return log.Float64(f.Key, f.Integer)
	case zapcore.BoolType:
		return log.Bool(f.Key, f.Integer == 1)
	default:
		return log.String(f.Key, f.String)
	}
}

// zapLevelToOtelSeverity converts Zap log levels to OpenTelemetry severity
func zapLevelToOtelSeverity(level zapcore.Level) log.Severity {
	switch level {
	case zapcore.DebugLevel:
		return log.SeverityDebug
	case zapcore.InfoLevel:
		return log.SeverityInfo
	case zapcore.WarnLevel:
		return log.SeverityWarn
	case zapcore.ErrorLevel:
		return log.SeverityError
	case zapcore.DPanicLevel, zapcore.PanicLevel:
		return log.SeverityFatal
	case zapcore.FatalLevel:
		return log.SeverityFatal
	default:
		return log.SeverityInfo
	}
}

// NewZapLogger creates a Zap logger that sends logs to OneUptime
func NewZapLogger() *zap.Logger {
	core := NewOtelCore(zapcore.DebugLevel)
	return zap.New(core)
}
```

Example usage with Zap:

```go
package main

import (
	"context"
	"time"

	"go.uber.org/zap"
)

func main() {
	ctx := context.Background()

	// Initialize OpenTelemetry logging first
	shutdown, err := InitLogging(ctx)
	if err != nil {
		panic(err)
	}
	defer shutdown(ctx)

	// Create a Zap logger that sends to OneUptime
	logger := NewZapLogger()
	defer logger.Sync()

	// Use Zap as you normally would
	logger.Info("User logged in",
		zap.String("user_id", "usr_123456"),
		zap.String("email", "user@example.com"),
		zap.String("ip_address", "192.168.1.100"),
	)

	logger.Warn("Rate limit approaching",
		zap.Int("current_requests", 95),
		zap.Int("limit", 100),
		zap.Duration("window", 1*time.Minute),
	)

	logger.Error("Database connection failed",
		zap.String("host", "db.example.com"),
		zap.Int("port", 5432),
		zap.Error(err),
		zap.Int("retry_count", 3),
	)
}
```

### Integration with Logrus

Logrus is another popular logging library. Here's how to create a hook that forwards logs to OneUptime:

```go
package logging

import (
	"context"

	"github.com/sirupsen/logrus"
	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
)

// OtelHook is a Logrus hook that sends logs to OpenTelemetry
type OtelHook struct {
	logger log.Logger
	levels []logrus.Level
}

// NewOtelHook creates a new Logrus hook for OpenTelemetry
func NewOtelHook(levels []logrus.Level) *OtelHook {
	return &OtelHook{
		logger: global.GetLoggerProvider().Logger("logrus"),
		levels: levels,
	}
}

// Levels returns the log levels this hook is interested in
func (h *OtelHook) Levels() []logrus.Level {
	return h.levels
}

// Fire is called when a log event is fired
func (h *OtelHook) Fire(entry *logrus.Entry) error {
	record := log.Record{}
	record.SetBody(log.StringValue(entry.Message))
	record.SetSeverity(logrusLevelToOtelSeverity(entry.Level))
	record.SetTimestamp(entry.Time)

	// Convert Logrus fields to OpenTelemetry attributes
	attrs := make([]log.KeyValue, 0, len(entry.Data))
	for key, value := range entry.Data {
		attrs = append(attrs, convertLogrusField(key, value))
	}
	record.AddAttributes(attrs...)

	h.logger.Emit(context.Background(), record)
	return nil
}

// logrusLevelToOtelSeverity converts Logrus levels to OpenTelemetry severity
func logrusLevelToOtelSeverity(level logrus.Level) log.Severity {
	switch level {
	case logrus.TraceLevel:
		return log.SeverityTrace
	case logrus.DebugLevel:
		return log.SeverityDebug
	case logrus.InfoLevel:
		return log.SeverityInfo
	case logrus.WarnLevel:
		return log.SeverityWarn
	case logrus.ErrorLevel:
		return log.SeverityError
	case logrus.FatalLevel:
		return log.SeverityFatal
	case logrus.PanicLevel:
		return log.SeverityFatal
	default:
		return log.SeverityInfo
	}
}

// convertLogrusField converts a Logrus field to an OpenTelemetry KeyValue
func convertLogrusField(key string, value interface{}) log.KeyValue {
	switch v := value.(type) {
	case string:
		return log.String(key, v)
	case int:
		return log.Int(key, v)
	case int64:
		return log.Int64(key, v)
	case float64:
		return log.Float64(key, v)
	case bool:
		return log.Bool(key, v)
	case error:
		return log.String(key, v.Error())
	default:
		return log.String(key, fmt.Sprintf("%v", v))
	}
}
```

Example usage with Logrus:

```go
package main

import (
	"context"

	"github.com/sirupsen/logrus"
)

func main() {
	ctx := context.Background()

	// Initialize OpenTelemetry logging
	shutdown, err := InitLogging(ctx)
	if err != nil {
		panic(err)
	}
	defer shutdown(ctx)

	// Create and configure Logrus logger
	logger := logrus.New()
	logger.SetLevel(logrus.DebugLevel)
	logger.SetFormatter(&logrus.JSONFormatter{})

	// Add the OpenTelemetry hook to forward logs to OneUptime
	logger.AddHook(NewOtelHook(logrus.AllLevels))

	// Use Logrus as you normally would
	logger.WithFields(logrus.Fields{
		"order_id":    "ord_789",
		"customer_id": "cust_456",
		"amount":      99.99,
		"currency":    "USD",
	}).Info("Order placed successfully")

	logger.WithFields(logrus.Fields{
		"service":     "payment",
		"provider":    "stripe",
		"error_code":  "card_declined",
	}).Error("Payment processing failed")
}
```

### Integration with slog (Go 1.21+)

Go 1.21 introduced the `log/slog` package for structured logging. Here's how to create a handler that sends logs to OneUptime:

```go
package logging

import (
	"context"
	"log/slog"

	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
)

// OtelHandler implements slog.Handler and forwards logs to OpenTelemetry
type OtelHandler struct {
	logger log.Logger
	attrs  []log.KeyValue
	groups []string
	level  slog.Level
}

// NewOtelHandler creates a new slog handler that sends logs to OpenTelemetry
func NewOtelHandler(level slog.Level) *OtelHandler {
	return &OtelHandler{
		logger: global.GetLoggerProvider().Logger("slog"),
		attrs:  make([]log.KeyValue, 0),
		groups: make([]string, 0),
		level:  level,
	}
}

// Enabled reports whether the handler handles records at the given level
func (h *OtelHandler) Enabled(ctx context.Context, level slog.Level) bool {
	return level >= h.level
}

// Handle handles the log record
func (h *OtelHandler) Handle(ctx context.Context, r slog.Record) error {
	record := log.Record{}
	record.SetBody(log.StringValue(r.Message))
	record.SetSeverity(slogLevelToOtelSeverity(r.Level))
	record.SetTimestamp(r.Time)

	// Add pre-existing attributes
	attrs := make([]log.KeyValue, len(h.attrs))
	copy(attrs, h.attrs)

	// Add record attributes
	r.Attrs(func(a slog.Attr) bool {
		attrs = append(attrs, slogAttrToOtel(h.groups, a))
		return true
	})

	record.AddAttributes(attrs...)
	h.logger.Emit(ctx, record)
	return nil
}

// WithAttrs returns a new handler with the given attributes added
func (h *OtelHandler) WithAttrs(attrs []slog.Attr) slog.Handler {
	newAttrs := make([]log.KeyValue, len(h.attrs), len(h.attrs)+len(attrs))
	copy(newAttrs, h.attrs)
	for _, a := range attrs {
		newAttrs = append(newAttrs, slogAttrToOtel(h.groups, a))
	}
	return &OtelHandler{
		logger: h.logger,
		attrs:  newAttrs,
		groups: h.groups,
		level:  h.level,
	}
}

// WithGroup returns a new handler with the given group appended
func (h *OtelHandler) WithGroup(name string) slog.Handler {
	newGroups := make([]string, len(h.groups)+1)
	copy(newGroups, h.groups)
	newGroups[len(h.groups)] = name
	return &OtelHandler{
		logger: h.logger,
		attrs:  h.attrs,
		groups: newGroups,
		level:  h.level,
	}
}

// slogLevelToOtelSeverity converts slog levels to OpenTelemetry severity
func slogLevelToOtelSeverity(level slog.Level) log.Severity {
	switch {
	case level >= slog.LevelError:
		return log.SeverityError
	case level >= slog.LevelWarn:
		return log.SeverityWarn
	case level >= slog.LevelInfo:
		return log.SeverityInfo
	default:
		return log.SeverityDebug
	}
}

// slogAttrToOtel converts a slog attribute to an OpenTelemetry KeyValue
func slogAttrToOtel(groups []string, a slog.Attr) log.KeyValue {
	key := a.Key
	for i := len(groups) - 1; i >= 0; i-- {
		key = groups[i] + "." + key
	}

	switch a.Value.Kind() {
	case slog.KindString:
		return log.String(key, a.Value.String())
	case slog.KindInt64:
		return log.Int64(key, a.Value.Int64())
	case slog.KindFloat64:
		return log.Float64(key, a.Value.Float64())
	case slog.KindBool:
		return log.Bool(key, a.Value.Bool())
	case slog.KindTime:
		return log.String(key, a.Value.Time().Format(time.RFC3339))
	case slog.KindDuration:
		return log.String(key, a.Value.Duration().String())
	default:
		return log.String(key, a.Value.String())
	}
}
```

Example usage with slog:

```go
package main

import (
	"context"
	"log/slog"
	"os"
)

func main() {
	ctx := context.Background()

	// Initialize OpenTelemetry logging
	shutdown, err := InitLogging(ctx)
	if err != nil {
		panic(err)
	}
	defer shutdown(ctx)

	// Create an slog logger with the OpenTelemetry handler
	// Also use a multi-handler to write to stdout for local debugging
	otelHandler := NewOtelHandler(slog.LevelDebug)
	jsonHandler := slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{Level: slog.LevelDebug})

	// Use multi-handler for both local output and OneUptime
	logger := slog.New(NewMultiHandler(otelHandler, jsonHandler))
	slog.SetDefault(logger)

	// Use slog as you normally would
	slog.Info("Server started",
		slog.String("host", "0.0.0.0"),
		slog.Int("port", 8080),
	)

	slog.With("request_id", "req_abc123").Info("Request received",
		slog.String("method", "POST"),
		slog.String("path", "/api/v1/users"),
		slog.Int("content_length", 256),
	)

	slog.Error("Failed to process request",
		slog.String("error", "validation failed"),
		slog.String("field", "email"),
	)
}
```

## Log Levels and Filtering

Understanding and properly using log levels is crucial for effective logging. Here's a breakdown of log levels and when to use them:

| Level | Severity | Use Case |
|-------|----------|----------|
| TRACE | 1-4 | Extremely detailed debugging information |
| DEBUG | 5-8 | Information useful during development |
| INFO | 9-12 | Normal operational messages |
| WARN | 13-16 | Potential issues that don't prevent operation |
| ERROR | 17-20 | Errors that affect functionality |
| FATAL | 21-24 | Critical errors causing application shutdown |

Here's how to implement level-based filtering:

```go
package logging

import (
	"context"
	"os"

	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
)

// LogLevel represents the minimum severity level for logging
type LogLevel int

const (
	LevelTrace LogLevel = iota
	LevelDebug
	LevelInfo
	LevelWarn
	LevelError
	LevelFatal
)

// Logger wraps the OpenTelemetry logger with level filtering
type Logger struct {
	otelLogger log.Logger
	minLevel   LogLevel
	attrs      []log.KeyValue
}

// NewLogger creates a new logger with the specified minimum level
func NewLogger(name string, minLevel LogLevel) *Logger {
	return &Logger{
		otelLogger: global.GetLoggerProvider().Logger(name),
		minLevel:   minLevel,
		attrs:      make([]log.KeyValue, 0),
	}
}

// NewLoggerFromEnv creates a logger with level set from environment variable
func NewLoggerFromEnv(name string) *Logger {
	levelStr := os.Getenv("LOG_LEVEL")
	level := LevelInfo // default

	switch levelStr {
	case "trace":
		level = LevelTrace
	case "debug":
		level = LevelDebug
	case "info":
		level = LevelInfo
	case "warn":
		level = LevelWarn
	case "error":
		level = LevelError
	case "fatal":
		level = LevelFatal
	}

	return NewLogger(name, level)
}

// With creates a new logger with additional attributes
func (l *Logger) With(attrs ...log.KeyValue) *Logger {
	newAttrs := make([]log.KeyValue, len(l.attrs)+len(attrs))
	copy(newAttrs, l.attrs)
	copy(newAttrs[len(l.attrs):], attrs)
	return &Logger{
		otelLogger: l.otelLogger,
		minLevel:   l.minLevel,
		attrs:      newAttrs,
	}
}

// shouldLog returns true if the given level should be logged
func (l *Logger) shouldLog(level LogLevel) bool {
	return level >= l.minLevel
}

// emit sends a log record if the level is enabled
func (l *Logger) emit(ctx context.Context, level LogLevel, severity log.Severity, msg string, attrs []log.KeyValue) {
	if !l.shouldLog(level) {
		return
	}

	record := log.Record{}
	record.SetBody(log.StringValue(msg))
	record.SetSeverity(severity)

	allAttrs := make([]log.KeyValue, 0, len(l.attrs)+len(attrs))
	allAttrs = append(allAttrs, l.attrs...)
	allAttrs = append(allAttrs, attrs...)
	record.AddAttributes(allAttrs...)

	l.otelLogger.Emit(ctx, record)
}

// Trace logs at trace level
func (l *Logger) Trace(ctx context.Context, msg string, attrs ...log.KeyValue) {
	l.emit(ctx, LevelTrace, log.SeverityTrace, msg, attrs)
}

// Debug logs at debug level
func (l *Logger) Debug(ctx context.Context, msg string, attrs ...log.KeyValue) {
	l.emit(ctx, LevelDebug, log.SeverityDebug, msg, attrs)
}

// Info logs at info level
func (l *Logger) Info(ctx context.Context, msg string, attrs ...log.KeyValue) {
	l.emit(ctx, LevelInfo, log.SeverityInfo, msg, attrs)
}

// Warn logs at warn level
func (l *Logger) Warn(ctx context.Context, msg string, attrs ...log.KeyValue) {
	l.emit(ctx, LevelWarn, log.SeverityWarn, msg, attrs)
}

// Error logs at error level
func (l *Logger) Error(ctx context.Context, msg string, attrs ...log.KeyValue) {
	l.emit(ctx, LevelError, log.SeverityError, msg, attrs)
}

// Fatal logs at fatal level
func (l *Logger) Fatal(ctx context.Context, msg string, attrs ...log.KeyValue) {
	l.emit(ctx, LevelFatal, log.SeverityFatal, msg, attrs)
}
```

## Structured Logging Best Practices

Structured logging makes your logs searchable and analyzable in OneUptime. Here are best practices to follow:

### 1. Use Consistent Field Names

Create a set of standard field names for your application:

```go
package logging

// Standard log fields for consistent logging across the application
const (
	// Request-related fields
	FieldRequestID     = "request_id"
	FieldMethod        = "http_method"
	FieldPath          = "http_path"
	FieldStatusCode    = "http_status"
	FieldDuration      = "duration_ms"
	FieldUserAgent     = "user_agent"
	FieldClientIP      = "client_ip"

	// User-related fields
	FieldUserID        = "user_id"
	FieldTenantID      = "tenant_id"
	FieldSessionID     = "session_id"

	// Error-related fields
	FieldError         = "error"
	FieldErrorCode     = "error_code"
	FieldStackTrace    = "stack_trace"

	// Business logic fields
	FieldOrderID       = "order_id"
	FieldProductID     = "product_id"
	FieldTransactionID = "transaction_id"

	// Infrastructure fields
	FieldComponent     = "component"
	FieldVersion       = "version"
	FieldEnvironment   = "environment"
)
```

### 2. Add Request Context

Always include request context in your logs for traceability:

```go
package middleware

import (
	"context"
	"net/http"
	"time"

	"github.com/google/uuid"
	"go.opentelemetry.io/otel/log"
)

type contextKey string

const requestLoggerKey contextKey = "request_logger"

// RequestLoggingMiddleware adds request context to all logs
func RequestLoggingMiddleware(logger *Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			requestID := uuid.New().String()

			// Create a request-scoped logger with common attributes
			reqLogger := logger.With(
				log.String(FieldRequestID, requestID),
				log.String(FieldMethod, r.Method),
				log.String(FieldPath, r.URL.Path),
				log.String(FieldClientIP, r.RemoteAddr),
				log.String(FieldUserAgent, r.UserAgent()),
			)

			// Add logger to context
			ctx := context.WithValue(r.Context(), requestLoggerKey, reqLogger)

			// Wrap response writer to capture status code
			wrapped := &responseWriter{ResponseWriter: w, statusCode: 200}

			// Log request start
			reqLogger.Info(ctx, "Request started")

			// Call the next handler
			next.ServeHTTP(wrapped, r.WithContext(ctx))

			// Log request completion
			duration := time.Since(start)
			reqLogger.Info(ctx, "Request completed",
				log.Int(FieldStatusCode, wrapped.statusCode),
				log.Float64(FieldDuration, float64(duration.Milliseconds())),
			)
		})
	}
}

// LoggerFromContext retrieves the request-scoped logger from context
func LoggerFromContext(ctx context.Context) *Logger {
	if logger, ok := ctx.Value(requestLoggerKey).(*Logger); ok {
		return logger
	}
	return NewLogger("default", LevelInfo)
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *responseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}
```

### 3. Log Errors with Context

Always provide context when logging errors:

```go
package main

import (
	"context"
	"database/sql"
	"fmt"
	"runtime"

	"go.opentelemetry.io/otel/log"
)

// LogError logs an error with full context including stack trace
func LogError(ctx context.Context, logger *Logger, err error, msg string, attrs ...log.KeyValue) {
	// Capture stack trace
	buf := make([]byte, 4096)
	n := runtime.Stack(buf, false)
	stackTrace := string(buf[:n])

	// Add error context
	errorAttrs := []log.KeyValue{
		log.String(FieldError, err.Error()),
		log.String(FieldStackTrace, stackTrace),
	}
	errorAttrs = append(errorAttrs, attrs...)

	logger.Error(ctx, msg, errorAttrs...)
}

// Example usage in a database operation
func GetUser(ctx context.Context, logger *Logger, db *sql.DB, userID string) (*User, error) {
	logger.Debug(ctx, "Fetching user from database",
		log.String(FieldUserID, userID),
	)

	user := &User{}
	err := db.QueryRowContext(ctx, "SELECT * FROM users WHERE id = $1", userID).Scan(
		&user.ID, &user.Name, &user.Email,
	)

	if err != nil {
		if err == sql.ErrNoRows {
			logger.Warn(ctx, "User not found",
				log.String(FieldUserID, userID),
			)
			return nil, fmt.Errorf("user not found: %s", userID)
		}

		LogError(ctx, logger, err, "Database query failed",
			log.String(FieldUserID, userID),
			log.String("query", "SELECT * FROM users"),
		)
		return nil, err
	}

	logger.Debug(ctx, "User fetched successfully",
		log.String(FieldUserID, userID),
		log.String("email", user.Email),
	)

	return user, nil
}
```

### 4. Use Sampling for High-Volume Logs

When dealing with high-volume logs, implement sampling to reduce costs while maintaining visibility:

```go
package logging

import (
	"math/rand"
	"sync/atomic"
)

// SampledLogger wraps a logger with sampling capabilities
type SampledLogger struct {
	logger     *Logger
	sampleRate float64
	counter    uint64
}

// NewSampledLogger creates a logger that samples logs at the given rate
// For example, a rate of 0.1 means 10% of logs will be sent
func NewSampledLogger(logger *Logger, sampleRate float64) *SampledLogger {
	return &SampledLogger{
		logger:     logger,
		sampleRate: sampleRate,
	}
}

// shouldSample returns true if this log should be sampled
func (s *SampledLogger) shouldSample() bool {
	// Always sample error and fatal logs
	return rand.Float64() < s.sampleRate
}

// InfoSampled logs at info level with sampling
func (s *SampledLogger) InfoSampled(ctx context.Context, msg string, attrs ...log.KeyValue) {
	if s.shouldSample() {
		count := atomic.AddUint64(&s.counter, 1)
		attrs = append(attrs,
			log.Bool("sampled", true),
			log.Float64("sample_rate", s.sampleRate),
			log.Int64("sample_count", int64(count)),
		)
		s.logger.Info(ctx, msg, attrs...)
	}
}

// Error always logs errors without sampling
func (s *SampledLogger) Error(ctx context.Context, msg string, attrs ...log.KeyValue) {
	s.logger.Error(ctx, msg, attrs...)
}
```

## Advanced Configuration

### Environment-Based Configuration

Create a comprehensive configuration system for different environments:

```go
package config

import (
	"os"
	"strconv"
	"time"
)

// LoggingConfig holds all logging configuration options
type LoggingConfig struct {
	// OneUptime configuration
	Endpoint    string
	APIKey      string
	ServiceName string
	Environment string

	// Batching configuration
	MaxQueueSize    int
	MaxBatchSize    int
	ExportInterval  time.Duration
	ExportTimeout   time.Duration

	// Filtering
	MinLevel     string
	SampleRate   float64

	// Additional attributes
	CustomAttributes map[string]string
}

// LoadLoggingConfig loads configuration from environment variables
func LoadLoggingConfig() *LoggingConfig {
	return &LoggingConfig{
		Endpoint:         getEnv("ONEUPTIME_OTLP_ENDPOINT", "https://otlp.oneuptime.com"),
		APIKey:           getEnv("ONEUPTIME_API_KEY", ""),
		ServiceName:      getEnv("SERVICE_NAME", "go-application"),
		Environment:      getEnv("ENVIRONMENT", "development"),
		MaxQueueSize:     getEnvInt("LOG_MAX_QUEUE_SIZE", 2048),
		MaxBatchSize:     getEnvInt("LOG_MAX_BATCH_SIZE", 512),
		ExportInterval:   getEnvDuration("LOG_EXPORT_INTERVAL", 5*time.Second),
		ExportTimeout:    getEnvDuration("LOG_EXPORT_TIMEOUT", 30*time.Second),
		MinLevel:         getEnv("LOG_LEVEL", "info"),
		SampleRate:       getEnvFloat("LOG_SAMPLE_RATE", 1.0),
		CustomAttributes: parseCustomAttributes(getEnv("LOG_CUSTOM_ATTRIBUTES", "")),
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvInt(key string, defaultValue int) int {
	if value := os.Getenv(key); value != "" {
		if intValue, err := strconv.Atoi(value); err == nil {
			return intValue
		}
	}
	return defaultValue
}

func getEnvFloat(key string, defaultValue float64) float64 {
	if value := os.Getenv(key); value != "" {
		if floatValue, err := strconv.ParseFloat(value, 64); err == nil {
			return floatValue
		}
	}
	return defaultValue
}

func getEnvDuration(key string, defaultValue time.Duration) time.Duration {
	if value := os.Getenv(key); value != "" {
		if duration, err := time.ParseDuration(value); err == nil {
			return duration
		}
	}
	return defaultValue
}

func parseCustomAttributes(value string) map[string]string {
	attrs := make(map[string]string)
	// Parse comma-separated key=value pairs
	// Implementation omitted for brevity
	return attrs
}
```

### Retry and Error Handling

Implement robust retry logic for failed exports:

```go
package logging

import (
	"context"
	"time"

	"go.opentelemetry.io/otel/exporters/otlp/otlplog/otlploghttp"
)

// RetryConfig configures the retry behavior for log exports
type RetryConfig struct {
	Enabled         bool
	InitialInterval time.Duration
	MaxInterval     time.Duration
	MaxElapsedTime  time.Duration
}

// DefaultRetryConfig returns sensible defaults for retry configuration
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		Enabled:         true,
		InitialInterval: 1 * time.Second,
		MaxInterval:     30 * time.Second,
		MaxElapsedTime:  5 * time.Minute,
	}
}

// CreateExporterWithRetry creates an OTLP exporter with retry configuration
func CreateExporterWithRetry(ctx context.Context, config *LoggingConfig, retryConfig RetryConfig) (*otlploghttp.Exporter, error) {
	opts := []otlploghttp.Option{
		otlploghttp.WithEndpoint(config.Endpoint),
		otlploghttp.WithHeaders(map[string]string{
			"x-oneuptime-token": config.APIKey,
		}),
	}

	if retryConfig.Enabled {
		opts = append(opts, otlploghttp.WithRetry(otlploghttp.RetryConfig{
			Enabled:         true,
			InitialInterval: retryConfig.InitialInterval,
			MaxInterval:     retryConfig.MaxInterval,
			MaxElapsedTime:  retryConfig.MaxElapsedTime,
		}))
	}

	return otlploghttp.New(ctx, opts...)
}
```

## Troubleshooting

### Common Issues and Solutions

#### 1. Logs Not Appearing in OneUptime

First, verify your configuration:

```go
package main

import (
	"fmt"
	"os"
)

func validateConfig() error {
	endpoint := os.Getenv("ONEUPTIME_OTLP_ENDPOINT")
	apiKey := os.Getenv("ONEUPTIME_API_KEY")

	if endpoint == "" {
		return fmt.Errorf("ONEUPTIME_OTLP_ENDPOINT is not set")
	}

	if apiKey == "" {
		return fmt.Errorf("ONEUPTIME_API_KEY is not set")
	}

	fmt.Printf("Configuration valid:\n")
	fmt.Printf("  Endpoint: %s\n", endpoint)
	fmt.Printf("  API Key: %s...\n", apiKey[:10])

	return nil
}
```

#### 2. Debugging Export Failures

Enable debug logging to see export attempts:

```go
package main

import (
	"context"
	"log"
	"os"

	"go.opentelemetry.io/otel"
)

func init() {
	// Enable OpenTelemetry debug logging
	otel.SetErrorHandler(otel.ErrorHandlerFunc(func(err error) {
		log.Printf("OpenTelemetry error: %v", err)
	}))

	// Set verbose logging for debugging
	if os.Getenv("OTEL_DEBUG") == "true" {
		// Additional debug configuration
	}
}
```

#### 3. High Memory Usage

If you're experiencing high memory usage, adjust batching settings:

```go
// Reduce queue size and batch size for memory-constrained environments
processor := sdklog.NewBatchProcessor(exporter,
	sdklog.WithMaxQueueSize(512),      // Reduce from default
	sdklog.WithExportMaxBatchSize(128), // Smaller batches
	sdklog.WithExportInterval(2*time.Second), // More frequent exports
)
```

#### 4. Verifying Log Delivery

Create a test function to verify logs are being received:

```go
package main

import (
	"context"
	"fmt"
	"time"

	"go.opentelemetry.io/otel/log"
	"go.opentelemetry.io/otel/log/global"
)

func verifyLogDelivery(ctx context.Context) error {
	logger := global.GetLoggerProvider().Logger("verification")

	testID := fmt.Sprintf("test-%d", time.Now().UnixNano())

	logger.Emit(ctx, log.Record{}.
		SetSeverity(log.SeverityInfo).
		SetBody(log.StringValue("Verification test log")).
		AddAttributes(
			log.String("test_id", testID),
			log.String("purpose", "delivery_verification"),
		))

	fmt.Printf("Sent verification log with test_id: %s\n", testID)
	fmt.Println("Check OneUptime for this log entry to verify delivery")

	// Allow time for the log to be exported
	time.Sleep(10 * time.Second)

	return nil
}
```

## Complete Example Application

Here's a complete example bringing everything together:

```go
package main

import (
	"context"
	"fmt"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"go.opentelemetry.io/otel/log"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Initialize logging
	shutdown, err := InitLogging(ctx)
	if err != nil {
		fmt.Fprintf(os.Stderr, "Failed to initialize logging: %v\n", err)
		os.Exit(1)
	}
	defer func() {
		shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer shutdownCancel()
		if err := shutdown(shutdownCtx); err != nil {
			fmt.Fprintf(os.Stderr, "Error shutting down logger: %v\n", err)
		}
	}()

	// Create application logger
	logger := NewLoggerFromEnv("my-app")

	logger.Info(ctx, "Application starting",
		log.String("version", "1.0.0"),
		log.String("environment", os.Getenv("ENVIRONMENT")),
	)

	// Set up HTTP server with logging middleware
	mux := http.NewServeMux()

	mux.HandleFunc("/health", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("OK"))
	})

	mux.HandleFunc("/api/example", func(w http.ResponseWriter, r *http.Request) {
		reqLogger := LoggerFromContext(r.Context())

		reqLogger.Info(r.Context(), "Processing API request")

		// Simulate work
		time.Sleep(100 * time.Millisecond)

		w.Header().Set("Content-Type", "application/json")
		w.Write([]byte(`{"status": "success"}`))
	})

	// Apply middleware
	handler := RequestLoggingMiddleware(logger)(mux)

	server := &http.Server{
		Addr:    ":8080",
		Handler: handler,
	}

	// Start server in goroutine
	go func() {
		logger.Info(ctx, "HTTP server starting", log.Int("port", 8080))
		if err := server.ListenAndServe(); err != http.ErrServerClosed {
			logger.Error(ctx, "HTTP server error", log.String("error", err.Error()))
		}
	}()

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	logger.Info(ctx, "Shutdown signal received")

	// Graceful shutdown
	shutdownCtx, shutdownCancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer shutdownCancel()

	if err := server.Shutdown(shutdownCtx); err != nil {
		logger.Error(ctx, "Server shutdown error", log.String("error", err.Error()))
	}

	logger.Info(ctx, "Application shutdown complete")
}
```

## Conclusion

Sending Go application logs to OneUptime provides centralized visibility into your application's behavior and health. By using OpenTelemetry as the transport mechanism, you get a vendor-neutral, standards-based approach that integrates well with the broader observability ecosystem.

Key takeaways from this guide:

1. **Use OpenTelemetry** - It provides a standardized way to export logs that works with OneUptime and other observability platforms.

2. **Integrate with existing loggers** - Whether you use Zap, Logrus, or slog, you can bridge them to OpenTelemetry without changing your application code.

3. **Structure your logs** - Use consistent field names and always include context like request IDs and user IDs.

4. **Configure appropriately** - Tune batching, sampling, and retry settings based on your application's needs.

5. **Handle errors gracefully** - Implement proper shutdown procedures to ensure all logs are flushed before application exit.

With these practices in place, you'll have comprehensive visibility into your Go applications through OneUptime's powerful log analysis capabilities.

## Additional Resources

- [OneUptime Documentation](https://docs.oneuptime.com)
- [OpenTelemetry Go Documentation](https://opentelemetry.io/docs/instrumentation/go/)
- [OpenTelemetry Logging Specification](https://opentelemetry.io/docs/specs/otel/logs/)
- [Go slog Package Documentation](https://pkg.go.dev/log/slog)
