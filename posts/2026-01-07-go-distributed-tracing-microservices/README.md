# How to Implement Distributed Tracing in Go Microservices

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Distributed Tracing, Microservices, OpenTelemetry, Observability, gRPC, Tracing

Description: Learn how to implement distributed tracing in Go microservices with proper context propagation across HTTP, gRPC, and message queues using OpenTelemetry.

---

## Introduction

In a microservices architecture, a single user request often traverses multiple services before returning a response. When something goes wrong or performance degrades, identifying the root cause becomes challenging without proper observability. Distributed tracing solves this by creating a unified view of requests as they flow through your system.

This guide covers implementing distributed tracing in Go microservices using OpenTelemetry, focusing on context propagation across HTTP, gRPC, and message queues like Kafka and RabbitMQ.

## Understanding Distributed Tracing Fundamentals

### What is Distributed Tracing?

Distributed tracing tracks requests as they propagate through distributed systems. Each trace represents the complete journey of a request, consisting of multiple spans that represent individual operations or service calls.

Key concepts include:

- **Trace**: The complete path of a request through your system
- **Span**: A single unit of work within a trace (e.g., an HTTP request, database query)
- **Context**: The carrier of trace information between services
- **Trace ID**: A unique identifier for the entire trace
- **Span ID**: A unique identifier for each span within a trace
- **Parent Span ID**: Links child spans to their parent, creating the trace hierarchy

### Why Context Propagation Matters

Context propagation ensures trace information flows seamlessly between services. Without proper propagation, you lose visibility into how requests traverse your system. The context carries the trace ID, span ID, and other metadata necessary to correlate spans across service boundaries.

## Setting Up OpenTelemetry in Go

### Installing Dependencies

First, install the required OpenTelemetry packages for Go:

```bash
go get go.opentelemetry.io/otel
go get go.opentelemetry.io/otel/sdk
go get go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc
go get go.opentelemetry.io/otel/propagation
go get go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp
go get go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc
```

### Initializing the Tracer Provider

This code sets up the OpenTelemetry tracer provider with an OTLP exporter that sends traces to a collector (like Jaeger, Zipkin, or OneUptime):

```go
package tracing

import (
    "context"
    "time"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/exporters/otlp/otlptrace/otlptracegrpc"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/sdk/resource"
    sdktrace "go.opentelemetry.io/otel/sdk/trace"
    semconv "go.opentelemetry.io/otel/semconv/v1.21.0"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"
)

// InitTracer initializes the OpenTelemetry tracer provider
// serviceName identifies this service in traces
// collectorEndpoint is the OTLP collector address (e.g., "localhost:4317")
func InitTracer(ctx context.Context, serviceName, collectorEndpoint string) (*sdktrace.TracerProvider, error) {
    // Create a gRPC connection to the collector
    conn, err := grpc.NewClient(collectorEndpoint,
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

    // Define resource attributes for this service
    res, err := resource.New(ctx,
        resource.WithAttributes(
            semconv.ServiceName(serviceName),
            semconv.ServiceVersion("1.0.0"),
        ),
    )
    if err != nil {
        return nil, err
    }

    // Create the tracer provider with batch processing
    tp := sdktrace.NewTracerProvider(
        sdktrace.WithBatcher(exporter,
            sdktrace.WithBatchTimeout(5*time.Second),
        ),
        sdktrace.WithResource(res),
        sdktrace.WithSampler(sdktrace.AlwaysSample()),
    )

    // Set the global tracer provider
    otel.SetTracerProvider(tp)

    // Set the global propagator to W3C Trace Context
    // This ensures trace context is propagated in a standard format
    otel.SetTextMapPropagator(propagation.NewCompositeTextMapPropagator(
        propagation.TraceContext{},
        propagation.Baggage{},
    ))

    return tp, nil
}
```

## HTTP Context Propagation

### Instrumenting HTTP Servers

The otelhttp middleware automatically extracts trace context from incoming requests and creates spans for each request:

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

// OrderService handles order-related HTTP requests
type OrderService struct {
    tracer trace.Tracer
}

func NewOrderService() *OrderService {
    return &OrderService{
        tracer: otel.Tracer("order-service"),
    }
}

// CreateOrder handles POST /orders requests
// The context contains trace information automatically extracted by otelhttp
func (s *OrderService) CreateOrder(w http.ResponseWriter, r *http.Request) {
    // Extract the context with trace information
    ctx := r.Context()

    // Create a child span for order processing
    ctx, span := s.tracer.Start(ctx, "process-order",
        trace.WithAttributes(
            attribute.String("order.type", "new"),
        ),
    )
    defer span.End()

    // Simulate order processing
    order, err := s.processOrder(ctx)
    if err != nil {
        span.RecordError(err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    // Add order details to the span
    span.SetAttributes(
        attribute.String("order.id", order.ID),
        attribute.Float64("order.total", order.Total),
    )

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(order)
}

type Order struct {
    ID    string  `json:"id"`
    Total float64 `json:"total"`
}

func (s *OrderService) processOrder(ctx context.Context) (*Order, error) {
    // Create a span for the database operation
    _, span := s.tracer.Start(ctx, "save-to-database")
    defer span.End()

    // Simulate database operation
    time.Sleep(50 * time.Millisecond)

    return &Order{ID: "ord-12345", Total: 99.99}, nil
}

func main() {
    ctx := context.Background()

    // Initialize the tracer
    tp, err := InitTracer(ctx, "order-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(ctx)

    orderService := NewOrderService()

    // Wrap handlers with otelhttp to enable automatic trace extraction
    mux := http.NewServeMux()
    mux.Handle("/orders", otelhttp.NewHandler(
        http.HandlerFunc(orderService.CreateOrder),
        "CreateOrder",
    ))

    log.Println("Starting order service on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

### Instrumenting HTTP Clients

When making outbound HTTP requests, the trace context must be injected into the request headers:

```go
package client

import (
    "context"
    "io"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
)

// TracedHTTPClient wraps http.Client with tracing capabilities
type TracedHTTPClient struct {
    client *http.Client
    tracer trace.Tracer
}

// NewTracedHTTPClient creates a new HTTP client with tracing enabled
func NewTracedHTTPClient() *TracedHTTPClient {
    return &TracedHTTPClient{
        // otelhttp.NewTransport automatically injects trace context into outgoing requests
        client: &http.Client{
            Transport: otelhttp.NewTransport(http.DefaultTransport),
        },
        tracer: otel.Tracer("http-client"),
    }
}

// CallInventoryService demonstrates making a traced HTTP call to another service
func (c *TracedHTTPClient) CallInventoryService(ctx context.Context, productID string) ([]byte, error) {
    // Create a span for this outbound call
    ctx, span := c.tracer.Start(ctx, "call-inventory-service",
        trace.WithAttributes(
            attribute.String("product.id", productID),
            attribute.String("service.target", "inventory-service"),
        ),
    )
    defer span.End()

    // Create the request with the traced context
    req, err := http.NewRequestWithContext(ctx, "GET",
        "http://inventory-service:8081/inventory/"+productID, nil)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }

    // The otelhttp transport automatically injects trace headers
    resp, err := c.client.Do(req)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }
    defer resp.Body.Close()

    span.SetAttributes(attribute.Int("http.status_code", resp.StatusCode))

    return io.ReadAll(resp.Body)
}
```

### Manual Context Propagation for HTTP

In cases where you need manual control over header injection and extraction:

```go
package propagation

import (
    "context"
    "net/http"

    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/propagation"
)

// InjectTraceContext manually injects trace context into HTTP headers
func InjectTraceContext(ctx context.Context, req *http.Request) {
    propagator := otel.GetTextMapPropagator()
    propagator.Inject(ctx, propagation.HeaderCarrier(req.Header))
}

// ExtractTraceContext manually extracts trace context from HTTP headers
func ExtractTraceContext(ctx context.Context, req *http.Request) context.Context {
    propagator := otel.GetTextMapPropagator()
    return propagator.Extract(ctx, propagation.HeaderCarrier(req.Header))
}
```

## gRPC Context Propagation

### Setting Up gRPC Server with Tracing

gRPC uses interceptors for middleware functionality. The otelgrpc package provides interceptors that handle trace context automatically:

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

    pb "yourproject/proto/inventory"
)

// InventoryServer implements the gRPC inventory service
type InventoryServer struct {
    pb.UnimplementedInventoryServiceServer
    tracer trace.Tracer
}

func NewInventoryServer() *InventoryServer {
    return &InventoryServer{
        tracer: otel.Tracer("inventory-service"),
    }
}

// CheckStock handles inventory check requests
// The context automatically contains trace information from the gRPC metadata
func (s *InventoryServer) CheckStock(ctx context.Context, req *pb.StockRequest) (*pb.StockResponse, error) {
    // Create a child span for the stock check operation
    ctx, span := s.tracer.Start(ctx, "check-stock-availability",
        trace.WithAttributes(
            attribute.String("product.id", req.ProductId),
            attribute.Int64("quantity.requested", int64(req.Quantity)),
        ),
    )
    defer span.End()

    // Simulate database lookup
    available, err := s.queryInventory(ctx, req.ProductId, req.Quantity)
    if err != nil {
        span.RecordError(err)
        return nil, err
    }

    span.SetAttributes(attribute.Bool("stock.available", available))

    return &pb.StockResponse{
        ProductId: req.ProductId,
        Available: available,
        Quantity:  100, // current stock
    }, nil
}

func (s *InventoryServer) queryInventory(ctx context.Context, productID string, qty int32) (bool, error) {
    _, span := s.tracer.Start(ctx, "query-inventory-database")
    defer span.End()

    // Simulate database query
    return qty <= 100, nil
}

func main() {
    ctx := context.Background()

    // Initialize the tracer
    tp, err := InitTracer(ctx, "inventory-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(ctx)

    // Create gRPC server with OpenTelemetry interceptors
    // StatsHandler automatically handles trace context propagation
    server := grpc.NewServer(
        grpc.StatsHandler(otelgrpc.NewServerHandler()),
    )

    pb.RegisterInventoryServiceServer(server, NewInventoryServer())

    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Starting inventory gRPC service on :50051")
    log.Fatal(server.Serve(lis))
}
```

### Setting Up gRPC Client with Tracing

The gRPC client uses dial options to enable trace context injection:

```go
package client

import (
    "context"
    "time"

    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"
    "google.golang.org/grpc/credentials/insecure"

    pb "yourproject/proto/inventory"
)

// InventoryClient wraps the gRPC client with tracing
type InventoryClient struct {
    client pb.InventoryServiceClient
    conn   *grpc.ClientConn
    tracer trace.Tracer
}

// NewInventoryClient creates a new traced gRPC client
func NewInventoryClient(target string) (*InventoryClient, error) {
    // Create connection with OpenTelemetry stats handler
    // This automatically injects trace context into gRPC metadata
    conn, err := grpc.NewClient(target,
        grpc.WithTransportCredentials(insecure.NewCredentials()),
        grpc.WithStatsHandler(otelgrpc.NewClientHandler()),
    )
    if err != nil {
        return nil, err
    }

    return &InventoryClient{
        client: pb.NewInventoryServiceClient(conn),
        conn:   conn,
        tracer: otel.Tracer("inventory-client"),
    }, nil
}

// CheckProductStock calls the inventory service with trace context
func (c *InventoryClient) CheckProductStock(ctx context.Context, productID string, quantity int32) (bool, error) {
    // Create a span for the client call
    ctx, span := c.tracer.Start(ctx, "inventory-check",
        trace.WithAttributes(
            attribute.String("product.id", productID),
        ),
    )
    defer span.End()

    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    resp, err := c.client.CheckStock(ctx, &pb.StockRequest{
        ProductId: productID,
        Quantity:  quantity,
    })
    if err != nil {
        span.RecordError(err)
        return false, err
    }

    span.SetAttributes(attribute.Bool("stock.available", resp.Available))
    return resp.Available, nil
}

func (c *InventoryClient) Close() error {
    return c.conn.Close()
}
```

## Message Queue Context Propagation

### Kafka Integration

Kafka requires custom carrier implementations to propagate trace context through message headers:

```go
package kafka

import (
    "context"

    "github.com/IBM/sarama"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
)

// KafkaHeaderCarrier implements TextMapCarrier for Kafka message headers
type KafkaHeaderCarrier []sarama.RecordHeader

// Get retrieves a value from Kafka headers
func (c KafkaHeaderCarrier) Get(key string) string {
    for _, h := range c {
        if string(h.Key) == key {
            return string(h.Value)
        }
    }
    return ""
}

// Set adds a key-value pair to Kafka headers
func (c *KafkaHeaderCarrier) Set(key, value string) {
    *c = append(*c, sarama.RecordHeader{
        Key:   []byte(key),
        Value: []byte(value),
    })
}

// Keys returns all keys in the carrier
func (c KafkaHeaderCarrier) Keys() []string {
    keys := make([]string, len(c))
    for i, h := range c {
        keys[i] = string(h.Key)
    }
    return keys
}

// TracedKafkaProducer wraps a Kafka producer with tracing
type TracedKafkaProducer struct {
    producer sarama.SyncProducer
    tracer   trace.Tracer
}

// NewTracedKafkaProducer creates a traced Kafka producer
func NewTracedKafkaProducer(brokers []string) (*TracedKafkaProducer, error) {
    config := sarama.NewConfig()
    config.Producer.Return.Successes = true
    config.Producer.RequiredAcks = sarama.WaitForAll

    producer, err := sarama.NewSyncProducer(brokers, config)
    if err != nil {
        return nil, err
    }

    return &TracedKafkaProducer{
        producer: producer,
        tracer:   otel.Tracer("kafka-producer"),
    }, nil
}

// SendMessage sends a message with trace context injected into headers
func (p *TracedKafkaProducer) SendMessage(ctx context.Context, topic string, key, value []byte) error {
    // Create a span for the produce operation
    ctx, span := p.tracer.Start(ctx, "kafka-produce",
        trace.WithSpanKind(trace.SpanKindProducer),
        trace.WithAttributes(
            attribute.String("messaging.system", "kafka"),
            attribute.String("messaging.destination", topic),
            attribute.String("messaging.destination_kind", "topic"),
        ),
    )
    defer span.End()

    // Create headers and inject trace context
    var headers KafkaHeaderCarrier
    propagator := otel.GetTextMapPropagator()
    propagator.Inject(ctx, &headers)

    msg := &sarama.ProducerMessage{
        Topic:   topic,
        Key:     sarama.ByteEncoder(key),
        Value:   sarama.ByteEncoder(value),
        Headers: headers,
    }

    partition, offset, err := p.producer.SendMessage(msg)
    if err != nil {
        span.RecordError(err)
        return err
    }

    span.SetAttributes(
        attribute.Int64("messaging.kafka.partition", int64(partition)),
        attribute.Int64("messaging.kafka.offset", offset),
    )

    return nil
}

// TracedKafkaConsumer wraps a Kafka consumer with tracing
type TracedKafkaConsumer struct {
    consumer sarama.Consumer
    tracer   trace.Tracer
}

// ProcessMessage extracts trace context and processes a Kafka message
func (c *TracedKafkaConsumer) ProcessMessage(msg *sarama.ConsumerMessage, handler func(context.Context, []byte) error) error {
    // Extract trace context from message headers
    headers := make(KafkaHeaderCarrier, len(msg.Headers))
    for i, h := range msg.Headers {
        headers[i] = *h
    }

    propagator := otel.GetTextMapPropagator()
    ctx := propagator.Extract(context.Background(), headers)

    // Create a consumer span linked to the producer span
    ctx, span := c.tracer.Start(ctx, "kafka-consume",
        trace.WithSpanKind(trace.SpanKindConsumer),
        trace.WithAttributes(
            attribute.String("messaging.system", "kafka"),
            attribute.String("messaging.source", msg.Topic),
            attribute.Int64("messaging.kafka.partition", int64(msg.Partition)),
            attribute.Int64("messaging.kafka.offset", msg.Offset),
        ),
    )
    defer span.End()

    // Process the message with the extracted context
    if err := handler(ctx, msg.Value); err != nil {
        span.RecordError(err)
        return err
    }

    return nil
}
```

### RabbitMQ Integration

RabbitMQ uses AMQP headers for context propagation:

```go
package rabbitmq

import (
    "context"

    amqp "github.com/rabbitmq/amqp091-go"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/propagation"
    "go.opentelemetry.io/otel/trace"
)

// AMQPHeaderCarrier implements TextMapCarrier for AMQP headers
type AMQPHeaderCarrier amqp.Table

// Get retrieves a value from AMQP headers
func (c AMQPHeaderCarrier) Get(key string) string {
    if val, ok := c[key]; ok {
        if str, ok := val.(string); ok {
            return str
        }
    }
    return ""
}

// Set adds a key-value pair to AMQP headers
func (c AMQPHeaderCarrier) Set(key, value string) {
    c[key] = value
}

// Keys returns all keys in the carrier
func (c AMQPHeaderCarrier) Keys() []string {
    keys := make([]string, 0, len(c))
    for k := range c {
        keys = append(keys, k)
    }
    return keys
}

// TracedRabbitMQPublisher wraps a RabbitMQ publisher with tracing
type TracedRabbitMQPublisher struct {
    channel *amqp.Channel
    tracer  trace.Tracer
}

// NewTracedRabbitMQPublisher creates a traced RabbitMQ publisher
func NewTracedRabbitMQPublisher(conn *amqp.Connection) (*TracedRabbitMQPublisher, error) {
    ch, err := conn.Channel()
    if err != nil {
        return nil, err
    }

    return &TracedRabbitMQPublisher{
        channel: ch,
        tracer:  otel.Tracer("rabbitmq-publisher"),
    }, nil
}

// Publish sends a message with trace context in AMQP headers
func (p *TracedRabbitMQPublisher) Publish(ctx context.Context, exchange, routingKey string, body []byte) error {
    // Create a span for the publish operation
    ctx, span := p.tracer.Start(ctx, "rabbitmq-publish",
        trace.WithSpanKind(trace.SpanKindProducer),
        trace.WithAttributes(
            attribute.String("messaging.system", "rabbitmq"),
            attribute.String("messaging.destination", exchange),
            attribute.String("messaging.rabbitmq.routing_key", routingKey),
        ),
    )
    defer span.End()

    // Create headers and inject trace context
    headers := make(AMQPHeaderCarrier)
    propagator := otel.GetTextMapPropagator()
    propagator.Inject(ctx, headers)

    msg := amqp.Publishing{
        ContentType: "application/json",
        Body:        body,
        Headers:     amqp.Table(headers),
    }

    err := p.channel.PublishWithContext(ctx, exchange, routingKey, false, false, msg)
    if err != nil {
        span.RecordError(err)
        return err
    }

    return nil
}

// TracedRabbitMQConsumer wraps a RabbitMQ consumer with tracing
type TracedRabbitMQConsumer struct {
    channel *amqp.Channel
    tracer  trace.Tracer
}

// ProcessDelivery extracts trace context and processes a RabbitMQ message
func (c *TracedRabbitMQConsumer) ProcessDelivery(d amqp.Delivery, handler func(context.Context, []byte) error) error {
    // Extract trace context from AMQP headers
    headers := AMQPHeaderCarrier(d.Headers)
    propagator := otel.GetTextMapPropagator()
    ctx := propagator.Extract(context.Background(), headers)

    // Create a consumer span linked to the producer span
    ctx, span := c.tracer.Start(ctx, "rabbitmq-consume",
        trace.WithSpanKind(trace.SpanKindConsumer),
        trace.WithAttributes(
            attribute.String("messaging.system", "rabbitmq"),
            attribute.String("messaging.source", d.Exchange),
            attribute.String("messaging.rabbitmq.routing_key", d.RoutingKey),
        ),
    )
    defer span.End()

    // Process the message with the extracted context
    if err := handler(ctx, d.Body); err != nil {
        span.RecordError(err)
        return err
    }

    return nil
}
```

## Complete Microservices Example

### Architecture Overview

Let us build a simple e-commerce system with three services:

1. **API Gateway**: Receives HTTP requests from clients
2. **Order Service**: Processes orders via gRPC
3. **Notification Service**: Sends notifications via Kafka

### API Gateway Implementation

The gateway receives HTTP requests and calls the Order Service via gRPC:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"

    "go.opentelemetry.io/contrib/instrumentation/net/http/otelhttp"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"

    "yourproject/client"
    "yourproject/tracing"
)

type Gateway struct {
    orderClient *client.OrderClient
    tracer      trace.Tracer
}

func NewGateway(orderClient *client.OrderClient) *Gateway {
    return &Gateway{
        orderClient: orderClient,
        tracer:      otel.Tracer("api-gateway"),
    }
}

type CreateOrderRequest struct {
    CustomerID string  `json:"customer_id"`
    ProductID  string  `json:"product_id"`
    Quantity   int32   `json:"quantity"`
    Amount     float64 `json:"amount"`
}

// HandleCreateOrder processes incoming order requests
func (g *Gateway) HandleCreateOrder(w http.ResponseWriter, r *http.Request) {
    ctx := r.Context()

    // Parse request body
    var req CreateOrderRequest
    if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
        http.Error(w, "invalid request body", http.StatusBadRequest)
        return
    }

    // Add business context to the current span
    span := trace.SpanFromContext(ctx)
    span.SetAttributes(
        attribute.String("customer.id", req.CustomerID),
        attribute.String("product.id", req.ProductID),
    )

    // Call Order Service via gRPC (trace context is automatically propagated)
    orderID, err := g.orderClient.CreateOrder(ctx, req.CustomerID, req.ProductID, req.Quantity, req.Amount)
    if err != nil {
        span.RecordError(err)
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    span.SetAttributes(attribute.String("order.id", orderID))

    w.Header().Set("Content-Type", "application/json")
    json.NewEncoder(w).Encode(map[string]string{"order_id": orderID})
}

func main() {
    ctx := context.Background()

    // Initialize tracer
    tp, err := tracing.InitTracer(ctx, "api-gateway", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(ctx)

    // Create Order Service client
    orderClient, err := client.NewOrderClient("order-service:50051")
    if err != nil {
        log.Fatal(err)
    }
    defer orderClient.Close()

    gateway := NewGateway(orderClient)

    // Set up routes with OpenTelemetry HTTP middleware
    mux := http.NewServeMux()
    mux.Handle("/api/orders", otelhttp.NewHandler(
        http.HandlerFunc(gateway.HandleCreateOrder),
        "CreateOrder",
    ))

    log.Println("API Gateway starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", mux))
}
```

### Order Service Implementation

The Order Service receives gRPC calls and publishes events to Kafka:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net"

    "github.com/google/uuid"
    "go.opentelemetry.io/contrib/instrumentation/google.golang.org/grpc/otelgrpc"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"
    "google.golang.org/grpc"

    "yourproject/kafka"
    pb "yourproject/proto/order"
    "yourproject/tracing"
)

type OrderServer struct {
    pb.UnimplementedOrderServiceServer
    kafkaProducer *kafka.TracedKafkaProducer
    tracer        trace.Tracer
}

func NewOrderServer(kafkaProducer *kafka.TracedKafkaProducer) *OrderServer {
    return &OrderServer{
        kafkaProducer: kafkaProducer,
        tracer:        otel.Tracer("order-service"),
    }
}

// CreateOrder handles order creation requests
func (s *OrderServer) CreateOrder(ctx context.Context, req *pb.CreateOrderRequest) (*pb.CreateOrderResponse, error) {
    // Create a span for order processing
    ctx, span := s.tracer.Start(ctx, "process-order",
        trace.WithAttributes(
            attribute.String("customer.id", req.CustomerId),
            attribute.String("product.id", req.ProductId),
            attribute.Int64("quantity", int64(req.Quantity)),
        ),
    )
    defer span.End()

    // Generate order ID
    orderID := uuid.New().String()
    span.SetAttributes(attribute.String("order.id", orderID))

    // Save order to database (simulated)
    if err := s.saveOrder(ctx, orderID, req); err != nil {
        span.RecordError(err)
        return nil, err
    }

    // Publish order created event to Kafka
    // Trace context is automatically propagated via Kafka headers
    event := map[string]interface{}{
        "order_id":    orderID,
        "customer_id": req.CustomerId,
        "product_id":  req.ProductId,
        "amount":      req.Amount,
        "event_type":  "order_created",
    }

    eventData, _ := json.Marshal(event)
    if err := s.kafkaProducer.SendMessage(ctx, "order-events", []byte(orderID), eventData); err != nil {
        span.RecordError(err)
        // Log but don't fail the order
        log.Printf("Failed to publish order event: %v", err)
    }

    return &pb.CreateOrderResponse{
        OrderId: orderID,
        Status:  "created",
    }, nil
}

func (s *OrderServer) saveOrder(ctx context.Context, orderID string, req *pb.CreateOrderRequest) error {
    _, span := s.tracer.Start(ctx, "save-order-to-database",
        trace.WithAttributes(
            attribute.String("db.system", "postgresql"),
            attribute.String("db.operation", "INSERT"),
        ),
    )
    defer span.End()

    // Simulate database operation
    return nil
}

func main() {
    ctx := context.Background()

    // Initialize tracer
    tp, err := tracing.InitTracer(ctx, "order-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(ctx)

    // Create Kafka producer
    kafkaProducer, err := kafka.NewTracedKafkaProducer([]string{"localhost:9092"})
    if err != nil {
        log.Fatal(err)
    }

    // Create gRPC server with tracing
    server := grpc.NewServer(
        grpc.StatsHandler(otelgrpc.NewServerHandler()),
    )

    pb.RegisterOrderServiceServer(server, NewOrderServer(kafkaProducer))

    lis, err := net.Listen("tcp", ":50051")
    if err != nil {
        log.Fatal(err)
    }

    log.Println("Order Service starting on :50051")
    log.Fatal(server.Serve(lis))
}
```

### Notification Service Implementation

The Notification Service consumes Kafka events with trace context:

```go
package main

import (
    "context"
    "encoding/json"
    "log"

    "github.com/IBM/sarama"
    "go.opentelemetry.io/otel"
    "go.opentelemetry.io/otel/attribute"
    "go.opentelemetry.io/otel/trace"

    "yourproject/kafka"
    "yourproject/tracing"
)

type NotificationService struct {
    tracer trace.Tracer
}

func NewNotificationService() *NotificationService {
    return &NotificationService{
        tracer: otel.Tracer("notification-service"),
    }
}

// HandleOrderEvent processes order events from Kafka
func (s *NotificationService) HandleOrderEvent(ctx context.Context, data []byte) error {
    // Parse the event
    var event map[string]interface{}
    if err := json.Unmarshal(data, &event); err != nil {
        return err
    }

    orderID := event["order_id"].(string)
    customerID := event["customer_id"].(string)

    // Create a span for notification processing
    ctx, span := s.tracer.Start(ctx, "process-notification",
        trace.WithAttributes(
            attribute.String("order.id", orderID),
            attribute.String("customer.id", customerID),
            attribute.String("notification.type", "order_confirmation"),
        ),
    )
    defer span.End()

    // Send email notification
    if err := s.sendEmail(ctx, customerID, orderID); err != nil {
        span.RecordError(err)
        return err
    }

    // Send SMS notification
    if err := s.sendSMS(ctx, customerID, orderID); err != nil {
        span.RecordError(err)
        return err
    }

    return nil
}

func (s *NotificationService) sendEmail(ctx context.Context, customerID, orderID string) error {
    _, span := s.tracer.Start(ctx, "send-email",
        trace.WithAttributes(
            attribute.String("notification.channel", "email"),
        ),
    )
    defer span.End()

    // Simulate sending email
    log.Printf("Sending email to customer %s for order %s", customerID, orderID)
    return nil
}

func (s *NotificationService) sendSMS(ctx context.Context, customerID, orderID string) error {
    _, span := s.tracer.Start(ctx, "send-sms",
        trace.WithAttributes(
            attribute.String("notification.channel", "sms"),
        ),
    )
    defer span.End()

    // Simulate sending SMS
    log.Printf("Sending SMS to customer %s for order %s", customerID, orderID)
    return nil
}

func main() {
    ctx := context.Background()

    // Initialize tracer
    tp, err := tracing.InitTracer(ctx, "notification-service", "localhost:4317")
    if err != nil {
        log.Fatal(err)
    }
    defer tp.Shutdown(ctx)

    notificationService := NewNotificationService()

    // Create Kafka consumer
    config := sarama.NewConfig()
    config.Consumer.Group.Rebalance.Strategy = sarama.NewBalanceStrategyRoundRobin()

    consumer, err := sarama.NewConsumer([]string{"localhost:9092"}, config)
    if err != nil {
        log.Fatal(err)
    }
    defer consumer.Close()

    partitionConsumer, err := consumer.ConsumePartition("order-events", 0, sarama.OffsetNewest)
    if err != nil {
        log.Fatal(err)
    }
    defer partitionConsumer.Close()

    tracedConsumer := &kafka.TracedKafkaConsumer{
        tracer: otel.Tracer("kafka-consumer"),
    }

    log.Println("Notification Service starting, consuming from order-events topic")

    for msg := range partitionConsumer.Messages() {
        if err := tracedConsumer.ProcessMessage(msg, notificationService.HandleOrderEvent); err != nil {
            log.Printf("Error processing message: %v", err)
        }
    }
}
```

## Best Practices for Distributed Tracing

### 1. Meaningful Span Names

Use descriptive, action-oriented span names that indicate what operation is being performed:

```go
// Good span names
tracer.Start(ctx, "validate-order-input")
tracer.Start(ctx, "query-inventory-database")
tracer.Start(ctx, "publish-order-created-event")

// Avoid generic names
tracer.Start(ctx, "process")
tracer.Start(ctx, "handler")
tracer.Start(ctx, "function")
```

### 2. Add Relevant Attributes

Include attributes that help with debugging and analysis:

```go
span.SetAttributes(
    // Business context
    attribute.String("order.id", orderID),
    attribute.String("customer.tier", "premium"),
    attribute.Float64("order.total", 299.99),

    // Technical context
    attribute.String("db.system", "postgresql"),
    attribute.String("db.operation", "SELECT"),
    attribute.Int("http.status_code", 200),
)
```

### 3. Record Errors Properly

Always record errors with context:

```go
if err != nil {
    span.RecordError(err)
    span.SetStatus(codes.Error, err.Error())
    return err
}
```

### 4. Use Appropriate Span Kinds

Set the correct span kind for better visualization:

```go
// For HTTP/gRPC servers
trace.WithSpanKind(trace.SpanKindServer)

// For HTTP/gRPC clients
trace.WithSpanKind(trace.SpanKindClient)

// For message producers
trace.WithSpanKind(trace.SpanKindProducer)

// For message consumers
trace.WithSpanKind(trace.SpanKindConsumer)

// For internal operations
trace.WithSpanKind(trace.SpanKindInternal)
```

### 5. Implement Sampling

In production, sample traces to reduce overhead:

```go
// Sample 10% of traces
sampler := sdktrace.TraceIDRatioBased(0.1)

// Or use parent-based sampling to respect upstream decisions
sampler := sdktrace.ParentBased(sdktrace.TraceIDRatioBased(0.1))

tp := sdktrace.NewTracerProvider(
    sdktrace.WithSampler(sampler),
    // ... other options
)
```

## Viewing Traces in OneUptime

Once your services are instrumented, you can view traces in OneUptime:

1. Configure the OTLP exporter to point to your OneUptime endpoint
2. Navigate to the Traces section in OneUptime
3. Search for traces by service name, trace ID, or time range
4. Analyze the trace waterfall to identify latency bottlenecks
5. Drill down into individual spans to see attributes and events

## Conclusion

Implementing distributed tracing in Go microservices requires careful attention to context propagation across different communication protocols. By using OpenTelemetry and following the patterns shown in this guide, you can achieve comprehensive observability across your microservices architecture.

Key takeaways:

- Always propagate context through HTTP headers, gRPC metadata, and message queue headers
- Use the otelhttp and otelgrpc packages for automatic instrumentation
- Implement custom carriers for message queues like Kafka and RabbitMQ
- Add meaningful span names and attributes for better debugging
- Consider sampling strategies for production environments

With proper distributed tracing in place, you will have the visibility needed to debug issues, optimize performance, and understand how requests flow through your system.
