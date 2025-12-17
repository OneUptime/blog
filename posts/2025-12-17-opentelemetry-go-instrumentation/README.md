# OpenTelemetry for Go Services: A Complete Instrumentation Guide

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: OpenTelemetry, Go, Golang, Observability, Tracing, Metrics, gRPC, HTTP

Description: A comprehensive guide to instrumenting Go applications with OpenTelemetry- from HTTP and gRPC auto-instrumentation to manual spans, metrics, and production-ready configurations for high-performance services.

---

> Go powers some of the most demanding infrastructure in the world. OpenTelemetry's Go SDK is designed for that reality- minimal allocations, zero-copy propagation, and compile-time safety.

This guide walks through instrumenting Go services with OpenTelemetry, covering HTTP/gRPC middleware, manual instrumentation, metrics, and patterns optimized for Go's concurrency model.

---

## Table of Contents

1. Why OpenTelemetry for Go?
2. Installation and Setup
3. Basic Tracer Configuration
4. HTTP Server Instrumentation
5. HTTP Client Instrumentation
6. gRPC Instrumentation
7. Manual Span Creation
8. Adding Custom Metrics
9. Context Propagation Patterns
10. Database Instrumentation
11. Structured Logging Integration
12. Sampling Strategies
13. Production Configuration
14. Performance Considerations
15. Common Patterns and Best Practices

---

## 1. Why OpenTelemetry for Go?

| Benefit | Description |
|---------|-------------|
| Performance focused | Minimal allocations, optimized for high-throughput services |
| Context native | Leverages Go's `context.Context` for propagation |
| Type safe | Compile-time checks prevent runtime errors |
| Rich ecosystem | Instrumentation for net/http, gRPC, database/sql, and more |
| Vendor neutral | Export to any backend without code changes |

---

## 2. Installation and Setup

```bash
# Core packages
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
go get go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp

# Instrumentation packages
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
go get go.opentelemetry.io/contrib/instrumentation/database/sql/otelsql
```

---

## 3. Basic Tracer Configuration

### telemetry/telemetry.go

```go
package telemetry

import (
	"context"
	"os"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/exporters/otlp/otlpmetric/otlpmetrichttp"
	"go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp"
	"go.opentelemetry.io/otel/propagation"
	"go.opentelemetry.io/otel/sdk/metric"
	"go.opentelemetry.io/otel/sdk/resource"
	"go.opentelemetry.io/otel/sdk/trace"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

type Config struct {
	ServiceName    string
	ServiceVersion string
	Environment    string
	OTLPEndpoint   string
	OTLPHeaders    map[string]string
	SampleRate     float64
}

func DefaultConfig() Config {
	return Config{
		ServiceName:    getEnv("OTEL_SERVICE_NAME", "go-service"),
		ServiceVersion: getEnv("SERVICE_VERSION", "1.0.0"),
		Environment:    getEnv("ENVIRONMENT", "development"),
		OTLPEndpoint:   getEnv("OTEL_EXPORTER_OTLP_ENDPOINT", "https://oneuptime.com"),
		OTLPHeaders: map[string]string{
			"x-oneuptime-token": getEnv("ONEUPTIME_TOKEN", ""),
		},
		SampleRate: 0.1,
	}
}

func Setup(ctx context.Context, cfg Config) (func(context.Context) error, error) {
	// Create resource
	res, err := resource.Merge(
		resource.Default(),
		resource.NewWithAttributes(
			semconv.SchemaURL,
			semconv.ServiceName(cfg.ServiceName),
			semconv.ServiceVersion(cfg.ServiceVersion),
			attribute.String("deployment.environment", cfg.Environment),
		),
	)
	if err != nil {
		return nil, err
	}

	// Setup trace exporter
	traceExporter, err := otlptracehttp.New(ctx,
		otlptracehttp.WithEndpoint(cfg.OTLPEndpoint),
		otlptracehttp.WithHeaders(cfg.OTLPHeaders),
	)
	if err != nil {
		return nil, err
	}

	// Setup trace provider
	tracerProvider := trace.NewTracerProvider(
		trace.WithBatcher(traceExporter,
			trace.WithBatchTimeout(5*time.Second),
			trace.WithMaxExportBatchSize(512),
		),
		trace.WithResource(res),
		trace.WithSampler(trace.ParentBased(
			trace.TraceIDRatioBased(cfg.SampleRate),
		)),
	)
	otel.SetTracerProvider(tracerProvider)

	// Setup metric exporter
	metricExporter, err := otlpmetrichttp.New(ctx,
		otlpmetrichttp.WithEndpoint(cfg.OTLPEndpoint),
		otlpmetrichttp.WithHeaders(cfg.OTLPHeaders),
	)
	if err != nil {
		return nil, err
	}

	// Setup meter provider
	meterProvider := metric.NewMeterProvider(
		metric.WithResource(res),
		metric.WithReader(metric.NewPeriodicReader(metricExporter,
			metric.WithInterval(60*time.Second),
		)),
	)
	otel.SetMeterProvider(meterProvider)

	// Setup propagation
	otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
		propagation.TraceContext{},
		propagation.Baggage{},
	))

	// Return cleanup function
	cleanup := func(ctx context.Context) error {
		var errs []error
		if err := tracerProvider.Shutdown(ctx); err != nil {
			errs = append(errs, err)
		}
		if err := meterProvider.Shutdown(ctx); err != nil {
			errs = append(errs, err)
		}
		if len(errs) > 0 {
			return errs[0]
		}
		return nil
	}

	return cleanup, nil
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
```

### main.go

```go
package main

import (
	"context"
	"log"
	"os"
	"os/signal"
	"syscall"

	"myapp/telemetry"
)

func main() {
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	// Setup telemetry
	cleanup, err := telemetry.Setup(ctx, telemetry.DefaultConfig())
	if err != nil {
		log.Fatalf("Failed to setup telemetry: %v", err)
	}
	defer func() {
		if err := cleanup(ctx); err != nil {
			log.Printf("Error shutting down telemetry: %v", err)
		}
	}()

	// Start your application
	startServer(ctx)

	// Wait for shutdown signal
	sigCh := make(chan os.Signal, 1)
	signal.Notify(sigCh, syscall.SIGINT, syscall.SIGTERM)
	<-sigCh
}
```

---

## 4. HTTP Server Instrumentation

### Using otelhttp middleware

```go
package main

import (
	"encoding/json"
	"net/http"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("http-server")

func main() {
	// Wrap handlers with OpenTelemetry middleware
	mux := http.NewServeMux()

	mux.Handle("/users/", otelhttp.WithRouteTag("/users/{id}", http.HandlerFunc(getUserHandler)))
	mux.Handle("/orders", otelhttp.WithRouteTag("/orders", http.HandlerFunc(createOrderHandler)))
	mux.Handle("/health", http.HandlerFunc(healthHandler))

	// Wrap entire server
	handler := otelhttp.NewHandler(mux, "http-server",
		otelhttp.WithMessageEvents(otelhttp.ReadEvents, otelhttp.WriteEvents),
	)

	http.ListenAndServe(":8080", handler)
}

func getUserHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Get the span created by otelhttp middleware
	span := trace.SpanFromContext(ctx)
	span.SetAttributes(attribute.String("user.id", r.URL.Path[len("/users/"):]))

	// Add custom child span for database operation
	ctx, dbSpan := tracer.Start(ctx, "db.query.users.select")
	user, err := fetchUserFromDB(ctx, r.URL.Path[len("/users/"):])
	if err != nil {
		dbSpan.RecordError(err)
		dbSpan.SetStatus(codes.Error, err.Error())
		dbSpan.End()
		http.Error(w, "User not found", http.StatusNotFound)
		return
	}
	dbSpan.SetAttributes(attribute.Bool("user.found", true))
	dbSpan.End()

	json.NewEncoder(w).Encode(user)
}

func createOrderHandler(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()

	// Decode request
	var order Order
	if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
		span := trace.SpanFromContext(ctx)
		span.RecordError(err)
		span.SetStatus(codes.Error, "Invalid request body")
		http.Error(w, "Invalid request", http.StatusBadRequest)
		return
	}

	// Process order with child spans
	ctx, processSpan := tracer.Start(ctx, "order.process")
	processSpan.SetAttributes(
		attribute.Int("order.items", len(order.Items)),
		attribute.Float64("order.total", order.Total),
	)

	result, err := processOrder(ctx, &order)
	if err != nil {
		processSpan.RecordError(err)
		processSpan.SetStatus(codes.Error, err.Error())
		processSpan.End()
		http.Error(w, "Order processing failed", http.StatusInternalServerError)
		return
	}

	processSpan.SetAttributes(attribute.String("order.id", result.ID))
	processSpan.End()

	w.WriteHeader(http.StatusCreated)
	json.NewEncoder(w).Encode(result)
}

func healthHandler(w http.ResponseWriter, r *http.Request) {
	w.WriteHeader(http.StatusOK)
	w.Write([]byte("OK"))
}
```

### Custom middleware pattern

```go
package middleware

import (
	"net/http"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

var (
	tracer         = otel.Tracer("http-middleware")
	meter          = otel.Meter("http-middleware")
	requestCounter metric.Int64Counter
	requestLatency metric.Float64Histogram
)

func init() {
	var err error
	requestCounter, err = meter.Int64Counter("http.server.requests.total",
		metric.WithDescription("Total HTTP requests"),
	)
	if err != nil {
		panic(err)
	}

	requestLatency, err = meter.Float64Histogram("http.server.request.duration",
		metric.WithDescription("HTTP request duration in milliseconds"),
		metric.WithUnit("ms"),
	)
	if err != nil {
		panic(err)
	}
}

func Telemetry(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()

		// Create response wrapper to capture status code
		rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		// Start span (in addition to otelhttp if used together)
		ctx, span := tracer.Start(r.Context(), "http.request",
			trace.WithAttributes(
				attribute.String("http.method", r.Method),
				attribute.String("http.url", r.URL.Path),
				attribute.String("http.user_agent", r.UserAgent()),
			),
		)
		defer span.End()

		// Process request
		next.ServeHTTP(rw, r.WithContext(ctx))

		// Record metrics
		duration := float64(time.Since(start).Milliseconds())
		attrs := []attribute.KeyValue{
			attribute.String("http.method", r.Method),
			attribute.String("http.route", r.URL.Path),
			attribute.Int("http.status_code", rw.statusCode),
		}

		requestCounter.Add(ctx, 1, metric.WithAttributes(attrs...))
		requestLatency.Record(ctx, duration, metric.WithAttributes(attrs...))

		span.SetAttributes(attribute.Int("http.status_code", rw.statusCode))
	})
}

type responseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.statusCode = code
	rw.ResponseWriter.WriteHeader(code)
}
```

---

## 5. HTTP Client Instrumentation

```go
package httpclient

import (
	"context"
	"io"
	"net/http"
	"time"

	"go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("http-client")

// NewClient creates an HTTP client with OpenTelemetry instrumentation
func NewClient() *http.Client {
	return &http.Client{
		Transport: otelhttp.NewTransport(http.DefaultTransport,
			otelhttp.WithSpanNameFormatter(func(_ string, r *http.Request) string {
				return "HTTP " + r.Method + " " + r.URL.Host
			}),
		),
		Timeout: 30 * time.Second,
	}
}

// FetchUser demonstrates traced HTTP client call
func FetchUser(ctx context.Context, userID string) (*User, error) {
	ctx, span := tracer.Start(ctx, "user.fetch",
		trace.WithSpanKind(trace.SpanKindClient),
		trace.WithAttributes(attribute.String("user.id", userID)),
	)
	defer span.End()

	client := NewClient()
	req, err := http.NewRequestWithContext(ctx, "GET", "https://api.example.com/users/"+userID, nil)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}

	resp, err := client.Do(req)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}
	defer resp.Body.Close()

	span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))

	if resp.StatusCode >= 400 {
		span.SetStatus(codes.Error, "HTTP error")
		return nil, fmt.Errorf("HTTP %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		span.RecordError(err)
		return nil, err
	}

	var user User
	if err := json.Unmarshal(body, &user); err != nil {
		span.RecordError(err)
		return nil, err
	}

	span.SetAttributes(attribute.Bool("user.found", true))
	return &user, nil
}
```

---

## 6. gRPC Instrumentation

### Server instrumentation

```go
package main

import (
	"context"
	"net"

	"google.golang.org/grpc"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	pb "myapp/proto"
)

var tracer = otel.Tracer("grpc-server")

type userServer struct {
	pb.UnimplementedUserServiceServer
}

func (s *userServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
	// Span is automatically created by otelgrpc interceptor
	span := trace.SpanFromContext(ctx)
	span.SetAttributes(attribute.String("user.id", req.UserId))

	// Add child span for database lookup
	ctx, dbSpan := tracer.Start(ctx, "db.query.users.select")
	user, err := fetchUser(ctx, req.UserId)
	if err != nil {
		dbSpan.RecordError(err)
		dbSpan.End()
		return nil, err
	}
	dbSpan.SetAttributes(attribute.Bool("cache.hit", false))
	dbSpan.End()

	span.SetAttributes(attribute.String("user.email", user.Email))
	return user, nil
}

func main() {
	lis, err := net.Listen("tcp", ":50051")
	if err != nil {
		log.Fatalf("failed to listen: %v", err)
	}

	// Create gRPC server with OpenTelemetry interceptors
	server := grpc.NewServer(
		grpc.StatsHandler(otelgrpc.NewServerHandler()),
	)

	pb.RegisterUserServiceServer(server, &userServer{})

	log.Println("gRPC server listening on :50051")
	server.Serve(lis)
}
```

### Client instrumentation

```go
package main

import (
	"context"
	"log"
	"time"

	"google.golang.org/grpc"
	"google.golang.org/grpc/credentials/insecure"
	"go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"

	pb "myapp/proto"
)

var tracer = otel.Tracer("grpc-client")

func main() {
	// Create connection with OpenTelemetry instrumentation
	conn, err := grpc.NewClient("localhost:50051",
		grpc.WithTransportCredentials(insecure.NewCredentials()),
		grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
	)
	if err != nil {
		log.Fatalf("failed to connect: %v", err)
	}
	defer conn.Close()

	client := pb.NewUserServiceClient(conn)

	// Make traced call
	ctx, span := tracer.Start(context.Background(), "fetch_user_data")
	defer span.End()

	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()

	resp, err := client.GetUser(ctx, &pb.GetUserRequest{UserId: "123"})
	if err != nil {
		span.RecordError(err)
		log.Fatalf("GetUser failed: %v", err)
	}

	span.SetAttributes(attribute.String("response.user_id", resp.Id))
	log.Printf("User: %+v", resp)
}
```

---

## 7. Manual Span Creation

### Basic patterns

```go
package service

import (
	"context"
	"fmt"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("order-service")

func ProcessOrder(ctx context.Context, order *Order) (*OrderResult, error) {
	ctx, span := tracer.Start(ctx, "order.process",
		trace.WithAttributes(
			attribute.String("order.id", order.ID),
			attribute.Int("order.items", len(order.Items)),
			attribute.Float64("order.total", order.Total),
		),
		trace.WithSpanKind(trace.SpanKindInternal),
	)
	defer span.End()

	// Validation span
	if err := validateOrder(ctx, order); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "validation failed")
		return nil, err
	}

	// Payment span
	paymentResult, err := processPayment(ctx, order)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "payment failed")
		return nil, err
	}
	span.SetAttributes(attribute.String("payment.id", paymentResult.ID))

	// Fulfillment span
	if err := fulfillOrder(ctx, order); err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, "fulfillment failed")
		return nil, err
	}

	span.AddEvent("order.completed", trace.WithAttributes(
		attribute.String("order.id", order.ID),
	))
	span.SetStatus(codes.Ok, "")

	return &OrderResult{
		OrderID:   order.ID,
		PaymentID: paymentResult.ID,
		Status:    "completed",
	}, nil
}

func validateOrder(ctx context.Context, order *Order) error {
	ctx, span := tracer.Start(ctx, "order.validate")
	defer span.End()

	if len(order.Items) == 0 {
		err := fmt.Errorf("order has no items")
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return err
	}

	span.AddEvent("validation.passed")
	return nil
}

func processPayment(ctx context.Context, order *Order) (*PaymentResult, error) {
	ctx, span := tracer.Start(ctx, "payment.process",
		trace.WithSpanKind(trace.SpanKindClient),
		trace.WithAttributes(
			attribute.Float64("payment.amount", order.Total),
			attribute.String("payment.currency", "USD"),
		),
	)
	defer span.End()

	// Call payment gateway
	result, err := paymentGateway.Charge(ctx, order.Total)
	if err != nil {
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}

	span.SetAttributes(attribute.String("payment.transaction_id", result.TransactionID))
	return result, nil
}
```

### Span with links (for async workflows)

```go
func ProcessBatch(ctx context.Context, messages []Message) error {
	// Collect links from all source messages
	var links []trace.Link
	for _, msg := range messages {
		if msg.SpanContext.IsValid() {
			links = append(links, trace.Link{
				SpanContext: msg.SpanContext,
				Attributes: []attribute.KeyValue{
					attribute.String("message.id", msg.ID),
				},
			})
		}
	}

	// Create span with links instead of parent
	ctx, span := tracer.Start(ctx, "batch.process",
		trace.WithLinks(links...),
		trace.WithAttributes(
			attribute.Int("batch.size", len(messages)),
		),
	)
	defer span.End()

	for _, msg := range messages {
		if err := processMessage(ctx, msg); err != nil {
			span.RecordError(err)
		}
	}

	return nil
}
```

---

## 8. Adding Custom Metrics

```go
package metrics

import (
	"context"
	"runtime"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var meter = otel.Meter("myapp")

var (
	// Counter - monotonically increasing
	RequestsTotal metric.Int64Counter

	// UpDownCounter - can increase or decrease
	ActiveConnections metric.Int64UpDownCounter

	// Histogram - distribution of values
	RequestDuration metric.Float64Histogram

	// Gauge via callback - current value
	MemoryUsage metric.Int64ObservableGauge
)

func Init() error {
	var err error

	RequestsTotal, err = meter.Int64Counter("http.requests.total",
		metric.WithDescription("Total HTTP requests"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return err
	}

	ActiveConnections, err = meter.Int64UpDownCounter("connections.active",
		metric.WithDescription("Active connections"),
		metric.WithUnit("1"),
	)
	if err != nil {
		return err
	}

	RequestDuration, err = meter.Float64Histogram("http.request.duration",
		metric.WithDescription("HTTP request duration"),
		metric.WithUnit("ms"),
		metric.WithExplicitBucketBoundaries(1, 5, 10, 25, 50, 100, 250, 500, 1000),
	)
	if err != nil {
		return err
	}

	MemoryUsage, err = meter.Int64ObservableGauge("process.memory.heap",
		metric.WithDescription("Heap memory usage"),
		metric.WithUnit("By"),
		metric.WithInt64Callback(func(_ context.Context, o metric.Int64Observer) error {
			var m runtime.MemStats
			runtime.ReadMemStats(&m)
			o.Observe(int64(m.HeapAlloc))
			return nil
		}),
	)
	if err != nil {
		return err
	}

	return nil
}

// Usage example
func RecordRequest(ctx context.Context, method, path string, statusCode int, duration time.Duration) {
	attrs := []attribute.KeyValue{
		attribute.String("http.method", method),
		attribute.String("http.route", path),
		attribute.Int("http.status_code", statusCode),
	}

	RequestsTotal.Add(ctx, 1, metric.WithAttributes(attrs...))
	RequestDuration.Record(ctx, float64(duration.Milliseconds()), metric.WithAttributes(attrs...))
}
```

### Business metrics example

```go
package orders

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/metric"
)

var meter = otel.Meter("orders")

var (
	ordersCreated   metric.Int64Counter
	orderValue      metric.Float64Histogram
	ordersInProcess metric.Int64UpDownCounter
)

func initMetrics() {
	ordersCreated, _ = meter.Int64Counter("orders.created.total",
		metric.WithDescription("Total orders created"),
	)

	orderValue, _ = meter.Float64Histogram("orders.value",
		metric.WithDescription("Order value distribution"),
		metric.WithUnit("USD"),
	)

	ordersInProcess, _ = meter.Int64UpDownCounter("orders.in_process",
		metric.WithDescription("Orders currently being processed"),
	)
}

func CreateOrder(ctx context.Context, order *Order) error {
	ordersInProcess.Add(ctx, 1)
	defer ordersInProcess.Add(ctx, -1)

	// Process order...

	// Record metrics on success
	ordersCreated.Add(ctx, 1, metric.WithAttributes(
		attribute.String("order.type", order.Type),
		attribute.String("order.region", order.Region),
	))

	orderValue.Record(ctx, order.Total, metric.WithAttributes(
		attribute.String("order.currency", order.Currency),
	))

	return nil
}
```

---

## 9. Context Propagation Patterns

### Goroutine context propagation

```go
package main

import (
	"context"
	"sync"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("worker")

func ProcessItemsConcurrently(ctx context.Context, items []Item) error {
	ctx, span := tracer.Start(ctx, "process.batch",
		trace.WithAttributes(attribute.Int("batch.size", len(items))),
	)
	defer span.End()

	var wg sync.WaitGroup
	errCh := make(chan error, len(items))

	for _, item := range items {
		wg.Add(1)
		go func(item Item) {
			defer wg.Done()

			// IMPORTANT: Create child span inside goroutine with parent context
			_, itemSpan := tracer.Start(ctx, "process.item",
				trace.WithAttributes(attribute.String("item.id", item.ID)),
			)
			defer itemSpan.End()

			if err := processItem(ctx, item); err != nil {
				itemSpan.RecordError(err)
				errCh <- err
			}
		}(item)
	}

	wg.Wait()
	close(errCh)

	// Collect errors
	for err := range errCh {
		span.RecordError(err)
	}

	return nil
}
```

### Worker pool with context

```go
package worker

import (
	"context"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("worker-pool")

type Job struct {
	ID      string
	Payload interface{}
	// Carry span context for linking
	SpanContext trace.SpanContext
}

type Pool struct {
	jobs    chan Job
	workers int
}

func NewPool(workers int) *Pool {
	return &Pool{
		jobs:    make(chan Job, 100),
		workers: workers,
	}
}

func (p *Pool) Start(ctx context.Context) {
	for i := 0; i < p.workers; i++ {
		go p.worker(ctx, i)
	}
}

func (p *Pool) worker(ctx context.Context, id int) {
	for job := range p.jobs {
		// Create new span linked to original
		var opts []trace.SpanStartOption
		if job.SpanContext.IsValid() {
			opts = append(opts, trace.WithLinks(trace.Link{
				SpanContext: job.SpanContext,
			}))
		}

		_, span := tracer.Start(ctx, "job.process", opts...)
		span.SetAttributes(
			attribute.String("job.id", job.ID),
			attribute.Int("worker.id", id),
		)

		if err := processJob(ctx, job); err != nil {
			span.RecordError(err)
		}

		span.End()
	}
}

func (p *Pool) Submit(ctx context.Context, job Job) {
	// Capture current span context for linking
	span := trace.SpanFromContext(ctx)
	job.SpanContext = span.SpanContext()
	p.jobs <- job
}
```

---

## 10. Database Instrumentation

### database/sql with otelsql

```go
package database

import (
	"context"
	"database/sql"

	"github.com/XSAM/otelsql"
	_ "github.com/lib/pq"
	semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
)

func NewDB(dsn string) (*sql.DB, error) {
	// Register instrumented driver
	driverName, err := otelsql.Register("postgres",
		otelsql.WithAttributes(
			semconv.DBSystemPostgreSQL,
		),
		otelsql.WithDBName("mydb"),
	)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open(driverName, dsn)
	if err != nil {
		return nil, err
	}

	// Record connection pool metrics
	if err := otelsql.RecordStats(db); err != nil {
		return nil, err
	}

	return db, nil
}

// All queries now automatically create spans
func GetUser(ctx context.Context, db *sql.DB, userID string) (*User, error) {
	var user User
	err := db.QueryRowContext(ctx,
		"SELECT id, name, email FROM users WHERE id = $1",
		userID,
	).Scan(&user.ID, &user.Name, &user.Email)

	return &user, err
}
```

### Manual database spans

```go
package repository

import (
	"context"
	"database/sql"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/codes"
	"go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("repository")

type UserRepository struct {
	db *sql.DB
}

func (r *UserRepository) GetByID(ctx context.Context, id string) (*User, error) {
	ctx, span := tracer.Start(ctx, "db.query.users.select",
		trace.WithSpanKind(trace.SpanKindClient),
		trace.WithAttributes(
			attribute.String("db.system", "postgresql"),
			attribute.String("db.name", "mydb"),
			attribute.String("db.operation", "SELECT"),
			attribute.String("db.sql.table", "users"),
		),
	)
	defer span.End()

	var user User
	err := r.db.QueryRowContext(ctx,
		"SELECT id, name, email FROM users WHERE id = $1", id,
	).Scan(&user.ID, &user.Name, &user.Email)

	if err != nil {
		if err == sql.ErrNoRows {
			span.SetAttributes(attribute.Bool("db.rows.found", false))
			return nil, ErrNotFound
		}
		span.RecordError(err)
		span.SetStatus(codes.Error, err.Error())
		return nil, err
	}

	span.SetAttributes(
		attribute.Bool("db.rows.found", true),
		attribute.Int("db.rows.affected", 1),
	)

	return &user, nil
}
```

---

## 11. Structured Logging Integration

### zerolog integration

```go
package logging

import (
	"context"
	"os"

	"github.com/rs/zerolog"
	"go.opentelemetry.io/otel/trace"
)

var logger zerolog.Logger

func Init() {
	logger = zerolog.New(os.Stdout).With().Timestamp().Logger()
}

// WithTraceContext adds trace context to log entry
func WithTraceContext(ctx context.Context) zerolog.Logger {
	span := trace.SpanFromContext(ctx)
	if !span.SpanContext().IsValid() {
		return logger
	}

	return logger.With().
		Str("trace_id", span.SpanContext().TraceID().String()).
		Str("span_id", span.SpanContext().SpanID().String()).
		Logger()
}

// Usage
func ProcessOrder(ctx context.Context, orderID string) error {
	log := WithTraceContext(ctx)

	log.Info().
		Str("order_id", orderID).
		Msg("Processing order")

	// Business logic...

	log.Info().
		Str("order_id", orderID).
		Str("status", "completed").
		Msg("Order processed successfully")

	return nil
}
```

### slog integration (Go 1.21+)

```go
package logging

import (
	"context"
	"log/slog"
	"os"

	"go.opentelemetry.io/otel/trace"
)

type TraceHandler struct {
	slog.Handler
}

func NewTraceHandler() *TraceHandler {
	return &TraceHandler{
		Handler: slog.NewJSONHandler(os.Stdout, &slog.HandlerOptions{
			Level: slog.LevelInfo,
		}),
	}
}

func (h *TraceHandler) Handle(ctx context.Context, r slog.Record) error {
	span := trace.SpanFromContext(ctx)
	if span.SpanContext().IsValid() {
		r.AddAttrs(
			slog.String("trace_id", span.SpanContext().TraceID().String()),
			slog.String("span_id", span.SpanContext().SpanID().String()),
		)
	}
	return h.Handler.Handle(ctx, r)
}

func Init() {
	slog.SetDefault(slog.New(NewTraceHandler()))
}

// Usage
func ProcessOrder(ctx context.Context, orderID string) {
	slog.InfoContext(ctx, "Processing order",
		slog.String("order_id", orderID),
	)
}
```

---

## 12. Sampling Strategies

```go
package telemetry

import (
	"go.opentelemetry.io/otel/sdk/trace"
)

// AlwaysSample - development
func AlwaysSampler() trace.Sampler {
	return trace.AlwaysSample()
}

// NeverSample - disable tracing
func NeverSampler() trace.Sampler {
	return trace.NeverSample()
}

// RatioBased - sample percentage
func RatioSampler(fraction float64) trace.Sampler {
	return trace.TraceIDRatioBased(fraction)
}

// ParentBased - recommended for production
func ProductionSampler(fraction float64) trace.Sampler {
	return trace.ParentBased(
		trace.TraceIDRatioBased(fraction),
		trace.WithLocalParentSampled(trace.AlwaysSample()),
		trace.WithLocalParentNotSampled(trace.NeverSample()),
		trace.WithRemoteParentSampled(trace.AlwaysSample()),
		trace.WithRemoteParentNotSampled(trace.NeverSample()),
	)
}

// Custom sampler - sample errors and slow requests
type ErrorBiasedSampler struct {
	baseSampler trace.Sampler
}

func NewErrorBiasedSampler(fraction float64) *ErrorBiasedSampler {
	return &ErrorBiasedSampler{
		baseSampler: trace.TraceIDRatioBased(fraction),
	}
}

func (s *ErrorBiasedSampler) ShouldSample(p trace.SamplingParameters) trace.SamplingResult {
	// Always sample if marked as error
	for _, attr := range p.Attributes {
		if attr.Key == "error" && attr.Value.AsBool() {
			return trace.SamplingResult{
				Decision:   trace.RecordAndSample,
				Tracestate: p.ParentContext.TraceState(),
			}
		}
	}

	return s.baseSampler.ShouldSample(p)
}

func (s *ErrorBiasedSampler) Description() string {
	return "ErrorBiasedSampler"
}
```

---

## 13. Production Configuration

### Environment variables

```bash
# Service identification
export OTEL_SERVICE_NAME=my-go-service
export SERVICE_VERSION=1.2.3
export ENVIRONMENT=production

# OTLP exporter
export OTEL_EXPORTER_OTLP_ENDPOINT=https://oneuptime.com
export OTEL_EXPORTER_OTLP_HEADERS="x-oneuptime-token=your-token"
export OTEL_EXPORTER_OTLP_PROTOCOL=http/protobuf

# Sampling
export OTEL_TRACES_SAMPLER=parentbased_traceidratio
export OTEL_TRACES_SAMPLER_ARG=0.1

# Resource attributes
export OTEL_RESOURCE_ATTRIBUTES="deployment.environment=production,k8s.namespace.name=default"
```

### Kubernetes deployment

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: go-service
spec:
  template:
    spec:
      containers:
        - name: app
          image: my-go-service:latest
          env:
            - name: OTEL_SERVICE_NAME
              value: "go-service"
            - name: OTEL_EXPORTER_OTLP_ENDPOINT
              value: "http://otel-collector.monitoring:4318"
            - name: ONEUPTIME_TOKEN
              valueFrom:
                secretKeyRef:
                  name: oneuptime-credentials
                  key: token
            - name: POD_NAME
              valueFrom:
                fieldRef:
                  fieldPath: metadata.name
            - name: POD_NAMESPACE
              valueFrom:
                fieldRef:
                  fieldPath: metadata.namespace
            - name: OTEL_RESOURCE_ATTRIBUTES
              value: "k8s.pod.name=$(POD_NAME),k8s.namespace.name=$(POD_NAMESPACE)"
          resources:
            limits:
              memory: "256Mi"
              cpu: "500m"
```

### Dockerfile

```dockerfile
FROM golang:1.21-alpine AS builder
WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -o /server ./cmd/server

FROM alpine:3.18
RUN apk --no-cache add ca-certificates
COPY --from=builder /server /server
EXPOSE 8080
CMD ["/server"]
```

---

## 14. Performance Considerations

### Benchmarking span creation

```go
// Span creation is cheap (~100ns) but not free
// Avoid creating spans in hot loops

// BAD - span per iteration
func processItems(ctx context.Context, items []Item) {
	for _, item := range items {
		_, span := tracer.Start(ctx, "process.item")
		process(item)
		span.End()
	}
}

// GOOD - single span with events
func processItems(ctx context.Context, items []Item) {
	ctx, span := tracer.Start(ctx, "process.items",
		trace.WithAttributes(attribute.Int("items.count", len(items))),
	)
	defer span.End()

	for i, item := range items {
		process(item)
		if i%100 == 0 {
			span.AddEvent("progress", trace.WithAttributes(
				attribute.Int("processed", i),
			))
		}
	}
}
```

### Batch processor tuning

```go
tracerProvider := trace.NewTracerProvider(
	trace.WithBatcher(exporter,
		// Increase batch size for high-throughput
		trace.WithMaxExportBatchSize(1024),
		// Reduce export frequency
		trace.WithBatchTimeout(10*time.Second),
		// Increase queue size
		trace.WithMaxQueueSize(4096),
		// Block on full queue (vs drop)
		trace.WithBlocking(),
	),
)
```

### Memory optimization

```go
// Reuse attribute slices
var commonAttrs = []attribute.KeyValue{
	attribute.String("service.tier", "api"),
	attribute.String("service.region", "us-east-1"),
}

func createSpan(ctx context.Context, name string, extraAttrs ...attribute.KeyValue) (context.Context, trace.Span) {
	attrs := make([]attribute.KeyValue, 0, len(commonAttrs)+len(extraAttrs))
	attrs = append(attrs, commonAttrs...)
	attrs = append(attrs, extraAttrs...)

	return tracer.Start(ctx, name, trace.WithAttributes(attrs...))
}
```

---

## 15. Common Patterns and Best Practices

| Pattern | Description |
|---------|-------------|
| Initialize early | Setup telemetry before any other imports |
| Use context everywhere | Pass `context.Context` through all functions |
| End spans explicitly | Use `defer span.End()` immediately after creation |
| Set status on error | Always `span.SetStatus(codes.Error, msg)` on failures |
| Use semantic conventions | `semconv.HTTPMethod`, `semconv.DBSystem`, etc. |
| Batch attributes | Set multiple attributes at once when possible |
| Sample appropriately | 10% base rate + tail sampling for errors |

### Error handling pattern

```go
func DoWork(ctx context.Context) (result string, err error) {
	ctx, span := tracer.Start(ctx, "do.work")
	defer func() {
		if err != nil {
			span.RecordError(err)
			span.SetStatus(codes.Error, err.Error())
		}
		span.End()
	}()

	// Work that might fail
	result, err = riskyOperation(ctx)
	if err != nil {
		return "", fmt.Errorf("risky operation failed: %w", err)
	}

	return result, nil
}
```

---

## Summary

| Component | Instrumentation |
|-----------|-----------------|
| HTTP Server | `otelhttp.NewHandler()` |
| HTTP Client | `otelhttp.NewTransport()` |
| gRPC Server | `otelgrpc.NewServerHandler()` |
| gRPC Client | `otelgrpc.NewClientHandler()` |
| database/sql | `otelsql.Register()` |
| Manual spans | `tracer.Start(ctx, name)` |

Go's OpenTelemetry SDK is optimized for high-performance services. Start with automatic instrumentation, add manual spans for business logic, and export to OneUptime for unified observability.

---

*Ready to trace your Go services? Send telemetry to [OneUptime](https://oneuptime.com) and correlate traces with metrics and logs.*

---

### See Also

- [What are Traces and Spans in OpenTelemetry](/blog/post/2025-08-27-traces-and-spans-in-opentelemetry/)
- [gRPC Tracing with OpenTelemetry](/blog/post/2025-12-17-opentelemetry-grpc-tracing/)
- [OpenTelemetry Collector: What It Is and When You Need It](/blog/post/2025-09-18-what-is-opentelemetry-collector-and-why-use-one/)
