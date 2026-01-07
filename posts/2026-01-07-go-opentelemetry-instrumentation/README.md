# How to Instrument Go Applications with OpenTelemetry

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, OpenTelemetry, Observability, Tracing, Monitoring, DevOps, Distributed Tracing

Description: Learn how to instrument Go applications with OpenTelemetry for distributed tracing, covering auto and manual instrumentation for net/http, Gin, Echo, and gRPC frameworks.

---

OpenTelemetry has become the industry standard for observability in distributed systems. For Go developers, it provides a powerful way to collect traces, metrics, and logs from applications running across microservices architectures. This guide covers everything you need to know about instrumenting Go applications with OpenTelemetry, from basic setup to advanced production configurations.

## Table of Contents

1. [Introduction to OpenTelemetry in Go](#introduction-to-opentelemetry-in-go)
2. [Setting Up OpenTelemetry](#setting-up-opentelemetry)
3. [Instrumenting net/http](#instrumenting-nethttp)
4. [Instrumenting Gin Framework](#instrumenting-gin-framework)
5. [Instrumenting Echo Framework](#instrumenting-echo-framework)
6. [Instrumenting gRPC](#instrumenting-grpc)
7. [Manual Instrumentation Techniques](#manual-instrumentation-techniques)
8. [Context Propagation](#context-propagation)
9. [Production Best Practices](#production-best-practices)
10. [Troubleshooting Common Issues](#troubleshooting-common-issues)

## Introduction to OpenTelemetry in Go

OpenTelemetry (OTel) is a vendor-neutral observability framework that provides APIs, SDKs, and tools for generating, collecting, and exporting telemetry data. In Go applications, OpenTelemetry helps you:

- **Trace requests** across service boundaries
- **Collect metrics** about application performance
- **Correlate logs** with traces for better debugging
- **Understand dependencies** between services

The Go implementation of OpenTelemetry provides both automatic instrumentation through middleware libraries and manual instrumentation APIs for custom spans and attributes.

## Setting Up OpenTelemetry

Before instrumenting any framework, you need to set up the core OpenTelemetry components. Let's start with the required dependencies and basic configuration.

### Installing Core Dependencies

Add the following dependencies to your `go.mod` file:

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracehttp
go get go.opentelemetry.io/otel/propagation
```

### Creating the Tracer Provider

The tracer provider is the central component that manages span processors and exporters. Here is a production-ready setup:

```go
package telemetry

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

// InitTracer initializes the OpenTelemetry tracer with OTLP exporter
func InitTracer(ctx context.Context, serviceName, otlpEndpoint string) (func(context.Context) error, error) {
    // Create a gRPC connection to the OTLP collector
    conn, err := grpc.NewClient(otlpEndpoint,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
    )
    if err != nil {
        return nil, err
    }

    // Create the OTLP trace exporter
    exporter, err := otlptracegrpc.New(ctx, otlptracegrpc.WithGRPCConn(conn))
    if err != nil {
        return nil, err
    }

    // Define the resource with service information
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

    // Create the tracer provider with batch span processor
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter,
            sdktrace.WithBatchTimeout(5*time.Second),
            sdktrace.WithMaxExportBatchSize(512),
        ),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    // Set the global tracer provider and propagator
    otel.SetTracerProvider(tp)
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    // Return a shutdown function for graceful cleanup
    return tp.Shutdown, nil
}
```

### Using the Tracer in Your Application

Initialize the tracer early in your application's lifecycle:

```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"

    "yourapp/telemetry"
)

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Initialize the tracer
    shutdown, err := telemetry.InitTracer(ctx, "my-go-service", "localhost:4317")
    if err != nil {
        log.Fatalf("Failed to initialize tracer: %v", err)
    }

    // Ensure graceful shutdown
    defer func() {
        if err := shutdown(ctx); err != nil {
            log.Printf("Error shutting down tracer: %v", err)
        }
    }()

    // Handle shutdown signals
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    // Start your application here
    // ...

    <-sigChan
    log.Println("Shutting down...")
}
```

## Instrumenting net/http

The standard library's `net/http` package is the foundation of many Go web applications. OpenTelemetry provides middleware for automatic instrumentation.

### Installing the HTTP Instrumentation Package

```bash
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
```

### Auto-Instrumentation with otelhttp

Wrap your HTTP handlers with `otelhttp.NewHandler` for automatic span creation:

```go
package main

import (
    "fmt"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

func main() {
    // Create your handler
    helloHandler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
        fmt.Fprintf(w, "Hello, World!")
    })

    // Wrap the handler with OpenTelemetry instrumentation
    wrappedHandler := otelhttp.NewHandler(helloHandler, "hello-endpoint")

    // Register and serve
    http.Handle("/hello", wrappedHandler)
    http.ListenAndServe(":8080", nil)
}
```

### Instrumenting the HTTP Client

When making outbound HTTP requests, use the instrumented transport:

```go
package main

import (
    "context"
    "io"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
)

// CreateInstrumentedClient returns an HTTP client with tracing enabled
func CreateInstrumentedClient() *http.Client {
    return &http.Client{
        Transport: otelhttp.NewTransport(http.DefaultTransport),
    }
}

func fetchData(ctx context.Context, url string) ([]byte, error) {
    client := CreateInstrumentedClient()

    // Create request with context to propagate trace
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }

    resp, err := client.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    return io.ReadAll(resp.Body)
}
```

### Complete net/http Server Example

Here is a complete example with multiple endpoints and proper tracing:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "time"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("net-http-server")

// UserHandler handles user-related requests
func UserHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Create a child span for database operation
    ctx, span := tracer.Start(ctx, "fetch-user-from-db",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "SELECT"),
        ),
    )
    defer span.End()

    // Simulate database query
    time.Sleep(50 * time.Millisecond)

    user := map[string]string{
        "id":    "123",
        "name":  "John Doe",
        "email": "john@example.com",
    }

    span.SetAttributes(attribute.String("user.id", user["id"]))

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(user)
}

// HealthHandler returns service health status
func HealthHandler(w http.ResponseWriter, r *http.Request) {
    w.WriteHeader(http.StatusOK)
    w.Write([]byte("OK"))
}

func main() {
    // Initialize tracer (using the InitTracer function from earlier)
    ctx := context.Background()
    shutdown, err := InitTracer(ctx, "user-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(ctx)

    // Create a new ServeMux
    mux := http.NewServeMux()

    // Register handlers with instrumentation
    mux.Handle("/users", otelhttp.NewHandler(
        http.HandlerFunc(UserHandler),
        "GET /users",
        otelhttp.WithSpanNameFormatter(func(operation string, r *http.Request) string {
            return r.Method + " " + r.URL.Path
        }),
    ))

    mux.Handle("/health", otelhttp.NewHandler(
        http.HandlerFunc(HealthHandler),
        "GET /health",
    ))

    // Wrap the entire mux for catch-all instrumentation
    handler := otelhttp.NewHandler(mux, "http-server")

    log.Println("Server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", handler))
}
```

## Instrumenting Gin Framework

Gin is one of the most popular Go web frameworks. OpenTelemetry provides dedicated middleware for Gin applications.

### Installing Gin Instrumentation

```bash
go get go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin
```

### Auto-Instrumentation with otelgin Middleware

Add the middleware to your Gin router for automatic tracing:

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/gin-gonic/gin"
    "go.opentelemetry.io/contrib/instrumentation/github.com/gin-gonic/gin/otelgin"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("gin-server")

func main() {
    // Initialize tracer
    ctx := context.Background()
    shutdown, err := InitTracer(ctx, "gin-api-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(ctx)

    // Create Gin router
    r := gin.Default()

    // Add OpenTelemetry middleware
    r.Use(otelgin.Middleware("gin-api-service"))

    // Define routes
    r.GET("/api/users/:id", GetUserHandler)
    r.POST("/api/users", CreateUserHandler)
    r.GET("/api/products", GetProductsHandler)

    r.Run(":8080")
}

// GetUserHandler retrieves a user by ID
func GetUserHandler(c *gin.Context) {
    ctx := c.Request.Context()
    userID := c.Param("id")

    // Add custom attributes to the current span
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(attribute.String("user.id", userID))

    // Create a child span for business logic
    ctx, childSpan := tracer.Start(ctx, "validate-user-access")
    // Simulate validation
    childSpan.End()

    c.JSON(http.StatusOK, gin.H{
        "id":   userID,
        "name": "Jane Doe",
    })
}

// CreateUserHandler creates a new user
func CreateUserHandler(c *gin.Context) {
    ctx := c.Request.Context()

    var user struct {
        Name  string `json:"name"`
        Email string `json:"email"`
    }

    if err := c.ShouldBindJSON(&user); err != nil {
        span := trace.SpanFromContext(ctx)
        span.RecordError(err)
        c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
        return
    }

    // Create span for database insert
    _, dbSpan := tracer.Start(ctx, "insert-user-db",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "INSERT"),
            attribute.String("user.email", user.Email),
        ),
    )
    // Simulate DB operation
    dbSpan.End()

    c.JSON(http.StatusCreated, gin.H{
        "id":    "new-user-123",
        "name":  user.Name,
        "email": user.Email,
    })
}

// GetProductsHandler retrieves all products
func GetProductsHandler(c *gin.Context) {
    ctx := c.Request.Context()

    // Create span for cache lookup
    ctx, cacheSpan := tracer.Start(ctx, "cache-lookup",
        trace.WithAttributes(
            attribute.String("cache.type", "redis"),
            attribute.Bool("cache.hit", true),
        ),
    )
    // Simulate cache operation
    cacheSpan.End()

    products := []gin.H{
        {"id": "1", "name": "Product A", "price": 29.99},
        {"id": "2", "name": "Product B", "price": 49.99},
    }

    c.JSON(http.StatusOK, products)
}
```

### Custom Span Names in Gin

Customize how span names are generated for better readability in your tracing backend:

```go
// Use a custom span name formatter
r.Use(otelgin.Middleware("gin-api-service",
    otelgin.WithSpanNameFormatter(func(r *http.Request) string {
        return r.Method + " " + r.URL.Path
    }),
))
```

## Instrumenting Echo Framework

Echo is another popular Go web framework known for its performance. OpenTelemetry provides dedicated support for Echo as well.

### Installing Echo Instrumentation

```bash
go get go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho
```

### Auto-Instrumentation with otelecho Middleware

Integrate OpenTelemetry middleware into your Echo application:

```go
package main

import (
    "context"
    "log"
    "net/http"

    "github.com/labstack/echo/v4"
    "github.com/labstack/echo/v4/middleware"
    "go.opentelemetry.io/contrib/instrumentation/github.com/labstack/echo/otelecho"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("echo-server")

func main() {
    // Initialize tracer
    ctx := context.Background()
    shutdown, err := InitTracer(ctx, "echo-api-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(ctx)

    // Create Echo instance
    e := echo.New()

    // Add standard middleware
    e.Use(middleware.Logger())
    e.Use(middleware.Recover())

    // Add OpenTelemetry middleware
    e.Use(otelecho.Middleware("echo-api-service"))

    // Define routes
    e.GET("/api/orders/:id", GetOrderHandler)
    e.POST("/api/orders", CreateOrderHandler)
    e.GET("/api/inventory", GetInventoryHandler)

    e.Logger.Fatal(e.Start(":8080"))
}

// GetOrderHandler retrieves an order by ID
func GetOrderHandler(c echo.Context) error {
    ctx := c.Request().Context()
    orderID := c.Param("id")

    // Get current span and add attributes
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("order.id", orderID),
        attribute.String("handler", "GetOrderHandler"),
    )

    // Create child span for order lookup
    ctx, lookupSpan := tracer.Start(ctx, "lookup-order",
        trace.WithAttributes(
            attribute.String("db.table", "orders"),
        ),
    )
    // Simulate database lookup
    lookupSpan.End()

    return c.JSON(http.StatusOK, map[string]interface{}{
        "id":     orderID,
        "status": "shipped",
        "items":  3,
    })
}

// CreateOrderHandler creates a new order
func CreateOrderHandler(c echo.Context) error {
    ctx := c.Request().Context()

    var order struct {
        CustomerID string   `json:"customer_id"`
        Items      []string `json:"items"`
    }

    if err := c.Bind(&order); err != nil {
        span := trace.SpanFromContext(ctx)
        span.RecordError(err)
        return c.JSON(http.StatusBadRequest, map[string]string{"error": err.Error()})
    }

    // Create span for inventory check
    ctx, inventorySpan := tracer.Start(ctx, "check-inventory",
        trace.WithAttributes(
            attribute.Int("items.count", len(order.Items)),
        ),
    )
    // Simulate inventory check
    inventorySpan.End()

    // Create span for order creation
    _, createSpan := tracer.Start(ctx, "create-order-record",
        trace.WithAttributes(
            attribute.String("customer.id", order.CustomerID),
        ),
    )
    // Simulate order creation
    createSpan.End()

    return c.JSON(http.StatusCreated, map[string]interface{}{
        "order_id":    "ord-456",
        "customer_id": order.CustomerID,
        "status":      "pending",
    })
}

// GetInventoryHandler retrieves inventory status
func GetInventoryHandler(c echo.Context) error {
    ctx := c.Request().Context()

    // Create span for inventory query
    _, querySpan := tracer.Start(ctx, "query-inventory",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "SELECT"),
        ),
    )
    // Simulate query
    querySpan.End()

    return c.JSON(http.StatusOK, map[string]interface{}{
        "total_items":     1500,
        "low_stock_items": 23,
    })
}
```

## Instrumenting gRPC

gRPC is widely used in microservices architectures. OpenTelemetry provides interceptors for both gRPC clients and servers.

### Installing gRPC Instrumentation

```bash
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
```

### Server-Side Instrumentation

Add OpenTelemetry interceptors to your gRPC server:

```go
package main

import (
    "context"
    "log"
    "net"

    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"

    pb "yourapp/proto/user"
)

var tracer = otel.Tracer("grpc-server")

// UserServiceServer implements the user service
type UserServiceServer struct {
    pb.UnimplementedUserServiceServer
}

// GetUser retrieves a user by ID
func (s *UserServiceServer) GetUser(ctx context.Context, req *pb.GetUserRequest) (*pb.User, error) {
    // Get the current span from context
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("user.id", req.GetId()),
        attribute.String("rpc.method", "GetUser"),
    )

    // Create child span for database operation
    ctx, dbSpan := tracer.Start(ctx, "fetch-user-from-database",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.statement", "SELECT * FROM users WHERE id = ?"),
        ),
    )
    // Simulate database fetch
    dbSpan.End()

    return &pb.User{
        Id:    req.GetId(),
        Name:  "John Doe",
        Email: "john@example.com",
    }, nil
}

// CreateUser creates a new user
func (s *UserServiceServer) CreateUser(ctx context.Context, req *pb.CreateUserRequest) (*pb.User, error) {
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("user.email", req.GetEmail()),
        attribute.String("rpc.method", "CreateUser"),
    )

    // Create span for validation
    ctx, validationSpan := tracer.Start(ctx, "validate-user-data")
    // Simulate validation
    validationSpan.End()

    // Create span for database insert
    _, insertSpan := tracer.Start(ctx, "insert-user-record",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "INSERT"),
        ),
    )
    // Simulate insert
    insertSpan.End()

    return &pb.User{
        Id:    "new-user-789",
        Name:  req.GetName(),
        Email: req.GetEmail(),
    }, nil
}

func main() {
    // Initialize tracer
    ctx := context.Background()
    shutdown, err := InitTracer(ctx, "user-grpc-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(ctx)

    // Create gRPC server with OpenTelemetry interceptors
    server := grpc.NewServer(
        grpc.StatsHandler(otelgrpc.NewServerHandler()),
    )

    // Register service
    pb.RegisterUserServiceServer(server, &UserServiceServer{})

    // Start listening
    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatalf("Failed to listen: %v", err)
    }

    log.Println("gRPC server starting on :50051")
    if err := server.Serve(lis); err != nil {
        log.Fatalf("Failed to serve: %v", err)
    }
}
```

### Client-Side Instrumentation

Configure your gRPC client with tracing:

```go
package main

import (
    "context"
    "log"
    "time"

    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    pb "yourapp/proto/user"
)

var tracer = otel.Tracer("grpc-client")

// CreateGRPCClient creates an instrumented gRPC client connection
func CreateGRPCClient(target string) (*grpc.ClientConn, error) {
    return grpc.NewClient(target,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    )
}

func main() {
    // Initialize tracer
    ctx := context.Background()
    shutdown, err := InitTracer(ctx, "api-gateway", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer shutdown(ctx)

    // Create instrumented client
    conn, err := CreateGRPCClient("localhost:50051")
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer conn.Close()

    client := pb.NewUserServiceClient(conn)

    // Create a parent span for the operation
    ctx, span := tracer.Start(ctx, "fetch-user-workflow",
        attribute.String("workflow.type", "user-fetch"),
    )
    defer span.End()

    // Make the gRPC call - automatically traced
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    user, err := client.GetUser(ctx, &pb.GetUserRequest{Id: "123"})
    if err != nil {
        span.RecordError(err)
        log.Fatalf("Failed to get user: %v", err)
    }

    log.Printf("User: %v", user)
}
```

## Manual Instrumentation Techniques

While auto-instrumentation covers HTTP and gRPC calls, you often need manual instrumentation for custom business logic, database operations, and external service calls.

### Creating Custom Spans

Create spans to track specific operations within your code:

```go
package main

import (
    "context"
    "errors"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/codes"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("order-service")

// ProcessOrder demonstrates manual span creation with various features
func ProcessOrder(ctx context.Context, orderID string, items []string) error {
    // Create a span for the entire order processing
    ctx, span := tracer.Start(ctx, "process-order",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
            attribute.Int("order.items_count", len(items)),
        ),
        trace.WithSpanKind(trace.SpanKindInternal),
    )
    defer span.End()

    // Validate order
    if err := validateOrder(ctx, orderID, items); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Order validation failed")
        return err
    }

    // Reserve inventory
    if err := reserveInventory(ctx, items); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Inventory reservation failed")
        return err
    }

    // Process payment
    if err := processPayment(ctx, orderID); err != nil {
        span.RecordError(err)
        span.SetStatus(codes.Error, "Payment processing failed")
        return err
    }

    // Add success event
    span.AddEvent("order-completed", trace.WithAttributes(
        attribute.String("order.id", orderID),
        attribute.String("timestamp", time.Now().Format(time.RFC3339)),
    ))

    span.SetStatus(codes.Ok, "Order processed successfully")
    return nil
}

func validateOrder(ctx context.Context, orderID string, items []string) error {
    _, span := tracer.Start(ctx, "validate-order",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
        ),
    )
    defer span.End()

    if len(items) == 0 {
        return errors.New("order must contain at least one item")
    }

    // Add validation event
    span.AddEvent("validation-passed")
    return nil
}

func reserveInventory(ctx context.Context, items []string) error {
    ctx, span := tracer.Start(ctx, "reserve-inventory",
        trace.WithAttributes(
            attribute.Int("items.count", len(items)),
        ),
    )
    defer span.End()

    for i, item := range items {
        _, itemSpan := tracer.Start(ctx, "reserve-item",
            trace.WithAttributes(
                attribute.String("item.id", item),
                attribute.Int("item.index", i),
            ),
        )
        // Simulate inventory check
        time.Sleep(10 * time.Millisecond)
        itemSpan.End()
    }

    return nil
}

func processPayment(ctx context.Context, orderID string) error {
    _, span := tracer.Start(ctx, "process-payment",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
            attribute.String("payment.provider", "stripe"),
        ),
        trace.WithSpanKind(trace.SpanKindClient),
    )
    defer span.End()

    // Simulate payment processing
    time.Sleep(100 * time.Millisecond)

    span.AddEvent("payment-authorized", trace.WithAttributes(
        attribute.String("transaction.id", "txn-abc-123"),
    ))

    return nil
}
```

### Recording Errors and Events

Properly record errors and significant events in your spans:

```go
// RecordError with additional context
func handleDatabaseError(ctx context.Context, err error) {
    span := trace.SpanFromContext(ctx)

    span.RecordError(err, trace.WithAttributes(
        attribute.String("error.type", "database_error"),
        attribute.String("db.system", "postgresql"),
        attribute.Bool("error.retryable", true),
    ))

    span.SetStatus(codes.Error, err.Error())
}

// Add events with timestamps and attributes
func recordOrderEvent(ctx context.Context, eventName string, orderID string) {
    span := trace.SpanFromContext(ctx)

    span.AddEvent(eventName, trace.WithAttributes(
        attribute.String("order.id", orderID),
        attribute.String("event.source", "order-service"),
    ), trace.WithTimestamp(time.Now()))
}
```

## Context Propagation

Context propagation is essential for distributed tracing across service boundaries. OpenTelemetry handles this automatically for HTTP and gRPC, but you may need manual propagation for other protocols.

### Extracting and Injecting Context

Use propagators to pass trace context between services:

```go
package propagation

import (
    "context"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

// MapCarrier implements TextMapCarrier for map[string]string
type MapCarrier map[string]string

func (c MapCarrier) Get(key string) string {
    return c[key]
}

func (c MapCarrier) Set(key, value string) {
    c[key] = value
}

func (c MapCarrier) Keys() []string {
    keys := make([]string, 0, len(c))
    for k := range c {
        keys = append(keys, k)
    }
    return keys
}

// InjectContext injects trace context into a carrier for outbound messages
func InjectContext(ctx context.Context) map[string]string {
    carrier := make(MapCarrier)
    otel.GetTextMapPropagator().Inject(ctx, carrier)
    return carrier
}

// ExtractContext extracts trace context from an inbound message
func ExtractContext(ctx context.Context, carrier map[string]string) context.Context {
    return otel.GetTextMapPropagator().Extract(ctx, MapCarrier(carrier))
}
```

### Using Context Propagation with Message Queues

Example of propagating context through a message queue:

```go
package messaging

import (
    "context"
    "encoding/json"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

var tracer = otel.Tracer("message-queue")

// Message represents a queue message with trace context
type Message struct {
    Payload      json.RawMessage   `json:"payload"`
    TraceContext map[string]string `json:"trace_context"`
}

// PublishMessage publishes a message with trace context
func PublishMessage(ctx context.Context, payload interface{}) error {
    ctx, span := tracer.Start(ctx, "publish-message",
        trace.WithSpanKind(trace.SpanKindProducer),
        trace.WithAttributes(
            attribute.String("messaging.system", "rabbitmq"),
            attribute.String("messaging.operation", "publish"),
        ),
    )
    defer span.End()

    payloadBytes, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    msg := Message{
        Payload:      payloadBytes,
        TraceContext: InjectContext(ctx),
    }

    // Publish to queue (implementation depends on your queue system)
    return publishToQueue(msg)
}

// ConsumeMessage processes a message and continues the trace
func ConsumeMessage(msg Message) error {
    // Extract context from message
    ctx := ExtractContext(context.Background(), msg.TraceContext)

    // Create a consumer span linked to the producer
    ctx, span := tracer.Start(ctx, "consume-message",
        trace.WithSpanKind(trace.SpanKindConsumer),
        trace.WithAttributes(
            attribute.String("messaging.system", "rabbitmq"),
            attribute.String("messaging.operation", "consume"),
        ),
    )
    defer span.End()

    // Process the message
    return processMessage(ctx, msg.Payload)
}
```

## Production Best Practices

When deploying OpenTelemetry in production, consider these best practices for performance, reliability, and cost optimization.

### Sampling Strategies

Use appropriate sampling to balance observability with cost:

```go
package telemetry

import (
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// CreateProductionSampler returns a sampler suitable for production
func CreateProductionSampler() sdktrace.Sampler {
    // Sample 10% of traces, but always sample errors
    return sdktrace.ParentBased(
        sdktrace.TraceIDRatioBased(0.1),
        sdktrace.WithRemoteParentSampled(sdktrace.AlwaysSample()),
        sdktrace.WithRemoteParentNotSampled(sdktrace.TraceIDRatioBased(0.1)),
        sdktrace.WithLocalParentSampled(sdktrace.AlwaysSample()),
        sdktrace.WithLocalParentNotSampled(sdktrace.TraceIDRatioBased(0.1)),
    )
}

// Apply the sampler to the tracer provider
func InitProductionTracer(ctx context.Context, serviceName, endpoint string) (func(context.Context) error, error) {
    // ... exporter setup ...

    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(CreateProductionSampler()),
    )

    // ... rest of setup ...
}
```

### Resource Configuration

Properly configure resources for better trace organization:

```go
package telemetry

import (
    "os"

    "go.opentelemetry.io/otel/sdk/resource"
    semconv "go.opentelemetry.io/otel/semconv/v1.24.0"
)

// CreateResource creates a resource with comprehensive attributes
func CreateResource(serviceName, version string) (*resource.Resource, error) {
    return resource.Merge(
        resource.Default(),
        resource.NewWithAttributes(
            semconv.SchemaURL,
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion(version),
            semconv.ServiceInstanceID(getInstanceID()),
            semconv.DeploymentEnvironment(getEnvironment()),
            semconv.ContainerName(os.Getenv("HOSTNAME")),
            semconv.K8SPodName(os.Getenv("POD_NAME")),
            semconv.K8SNamespaceName(os.Getenv("POD_NAMESPACE")),
        ),
    )
}

func getInstanceID() string {
    if id := os.Getenv("INSTANCE_ID"); id != "" {
        return id
    }
    if hostname, err := os.Hostname(); err == nil {
        return hostname
    }
    return "unknown"
}

func getEnvironment() string {
    if env := os.Getenv("ENVIRONMENT"); env != "" {
        return env
    }
    return "development"
}
```

### Graceful Shutdown

Ensure all spans are exported before shutdown:

```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"
)

func main() {
    ctx := context.Background()

    // Initialize tracer
    shutdown, err := InitTracer(ctx, "my-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }

    // Start your server in a goroutine
    go startServer()

    // Wait for shutdown signal
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    log.Println("Shutdown signal received")

    // Create a deadline for graceful shutdown
    shutdownCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
    defer cancel()

    // Shutdown tracer to flush pending spans
    if err := shutdown(shutdownCtx); err != nil {
        log.Printf("Error during tracer shutdown: %v", err)
    }

    log.Println("Shutdown complete")
}
```

### Performance Optimization

Optimize tracing overhead in high-throughput applications:

```go
package telemetry

import (
    "time"

    sdktrace "go.opentelemetry.io/otel/sdk/trace"
)

// CreateOptimizedProvider creates a tracer provider optimized for performance
func CreateOptimizedProvider(exporter sdktrace.SpanExporter, res *resource.Resource) *sdktrace.TracerProvider {
    return sdktrace.NewTracerProvider(
        // Use batch processor with optimized settings
        sdktrace.WithBatcher(exporter,
            // Increase batch size for fewer network calls
            sdktrace.WithMaxExportBatchSize(1024),
            // Increase queue size to handle bursts
            sdktrace.WithMaxQueueSize(4096),
            // Export more frequently under load
            sdktrace.WithBatchTimeout(2*time.Second),
            // Allow blocking when queue is full to prevent span loss
            sdktrace.WithBlocking(),
        ),
        sdktrace.WithResource(res),
        // Use ratio-based sampling for production
        sdktrace.WithSampler(sdktrace.TraceIDRatioBased(0.1)),
    )
}
```

## Troubleshooting Common Issues

Here are solutions to common issues when implementing OpenTelemetry in Go applications.

### Traces Not Appearing

If traces are not appearing in your backend, check these common issues:

```go
// Verify the tracer is properly initialized
package main

import (
    "context"
    "log"

    "go.opentelemetry.io/otel"
)

func verifyTracerSetup() {
    tracer := otel.Tracer("test")
    _, span := tracer.Start(context.Background(), "test-span")

    // Check if we have a valid span
    if !span.SpanContext().IsValid() {
        log.Println("WARNING: Tracer may not be properly initialized")
    }

    span.End()
}
```

### Context Not Propagating

Ensure context is properly passed through your call chain:

```go
// WRONG: Creating new context loses trace information
func badHandler(w http.ResponseWriter, r *http.Request) {
    ctx := context.Background() // This loses the trace!
    doSomething(ctx)
}

// CORRECT: Use the request context
func goodHandler(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context() // Preserves trace context
    doSomething(ctx)
}
```

### Memory Leaks from Unclosed Spans

Always close spans, even in error paths:

```go
// Use defer to ensure span is always closed
func processRequest(ctx context.Context) error {
    ctx, span := tracer.Start(ctx, "process-request")
    defer span.End() // This ensures the span is always closed

    if err := validateRequest(ctx); err != nil {
        span.RecordError(err)
        return err
    }

    return executeRequest(ctx)
}
```

### High Cardinality Attributes

Avoid high cardinality attributes that can overwhelm your tracing backend:

```go
// BAD: User IDs, request IDs, timestamps as attributes can cause cardinality explosion
span.SetAttributes(
    attribute.String("user.id", userID),           // Potentially millions of unique values
    attribute.String("request.id", uuid.New().String()), // Unique per request
)

// BETTER: Use these as span events or keep only for sampled traces
if span.IsRecording() {
    span.SetAttributes(
        attribute.String("user.id", userID),
    )
}

// Or use events for high-cardinality data
span.AddEvent("user-action", trace.WithAttributes(
    attribute.String("user.id", userID),
))
```

## Conclusion

Instrumenting Go applications with OpenTelemetry provides deep visibility into your distributed systems. By leveraging auto-instrumentation for HTTP frameworks like net/http, Gin, and Echo, along with gRPC interceptors, you can quickly add observability to your applications. Manual instrumentation allows you to capture custom business logic and create meaningful traces that help debug complex issues.

Key takeaways:

1. **Start with auto-instrumentation** - Use the provided middleware for your framework to get immediate visibility
2. **Add manual spans for business logic** - Create custom spans for operations that matter to your application
3. **Propagate context correctly** - Always pass context through your call chain to maintain trace continuity
4. **Configure for production** - Use appropriate sampling, batching, and resource configuration
5. **Handle errors properly** - Record errors on spans and set appropriate status codes

With these patterns in place, you will have comprehensive observability across your Go microservices, enabling faster debugging and better understanding of your system's behavior.

## Additional Resources

- [OpenTelemetry Go Documentation](https://opentelemetry.io/docs/languages/go/)
- [OpenTelemetry Go SDK Repository](https://github.com/open-telemetry/opentelemetry-go)
- [OpenTelemetry Contrib Repository](https://github.com/open-telemetry/opentelemetry-go-contrib)
- [Semantic Conventions](https://opentelemetry.io/docs/concepts/semantic-conventions/)
