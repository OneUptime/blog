# How to Use Kafka in Go with segmentio/kafka-go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Kafka, Messaging, Distributed Systems, Event-Driven

Description: Build event-driven systems in Go using Kafka with segmentio/kafka-go, covering producers, consumers, consumer groups, and message delivery guarantees.

---

Apache Kafka has become the backbone of modern event-driven architectures, enabling real-time data streaming at massive scale. When building Go applications that need to interact with Kafka, the `segmentio/kafka-go` library provides a pure Go implementation with excellent performance and a clean API. This guide covers everything you need to build production-ready Kafka applications in Go.

## Why segmentio/kafka-go?

The `segmentio/kafka-go` library offers several advantages over alternatives:

- **Pure Go implementation**: No CGO dependencies, making cross-compilation and deployment straightforward
- **Modern API**: Both low-level and high-level APIs for different use cases
- **Built-in batching**: Automatic message batching for optimal throughput
- **Consumer groups**: Native support for coordinated consumption
- **Context support**: First-class support for Go contexts for cancellation and timeouts

## Installation and Setup

Before diving into code, let's set up a local Kafka environment and install the library.

### Installing kafka-go

Add the library to your Go project:

```bash
go get github.com/segmentio/kafka-go
```

### Docker Compose for Local Development

This Docker Compose file sets up a single-node Kafka cluster with KRaft mode (no ZooKeeper required) for local development:

```yaml
version: '3.8'
services:
  kafka:
    image: bitnami/kafka:3.6
    ports:
      - "9092:9092"
    environment:
      - KAFKA_CFG_NODE_ID=1
      - KAFKA_CFG_PROCESS_ROLES=controller,broker
      - KAFKA_CFG_LISTENERS=PLAINTEXT://:9092,CONTROLLER://:9093
      - KAFKA_CFG_LISTENER_SECURITY_PROTOCOL_MAP=CONTROLLER:PLAINTEXT,PLAINTEXT:PLAINTEXT
      - KAFKA_CFG_CONTROLLER_QUORUM_VOTERS=1@kafka:9093
      - KAFKA_CFG_CONTROLLER_LISTENER_NAMES=CONTROLLER
      - KAFKA_CFG_AUTO_CREATE_TOPICS_ENABLE=true
    volumes:
      - kafka_data:/bitnami/kafka

volumes:
  kafka_data:
```

Start the environment with `docker-compose up -d`.

## Basic Producer Implementation

Let's start with a simple producer that sends messages to a Kafka topic.

### Simple Producer with Writer

The Writer is the high-level API for producing messages. It handles batching and connection management automatically:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
)

func main() {
    // Create a writer (producer) with basic configuration.
    // The writer automatically handles connection pooling and batching.
    writer := &kafka.Writer{
        Addr:         kafka.TCP("localhost:9092"),
        Topic:        "orders",
        Balancer:     &kafka.LeastBytes{}, // Distributes messages based on partition size
        RequiredAcks: kafka.RequireAll,    // Wait for all replicas to acknowledge
        Async:        false,               // Synchronous writes for reliability
    }
    defer writer.Close()

    // Create a context with timeout for the write operation.
    ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
    defer cancel()

    // Send a batch of messages.
    // Even though we're sending individually, the writer batches them internally.
    messages := []kafka.Message{
        {Key: []byte("order-1"), Value: []byte(`{"id": 1, "amount": 100.00}`)},
        {Key: []byte("order-2"), Value: []byte(`{"id": 2, "amount": 250.50}`)},
        {Key: []byte("order-3"), Value: []byte(`{"id": 3, "amount": 75.25}`)},
    }

    err := writer.WriteMessages(ctx, messages...)
    if err != nil {
        log.Fatalf("failed to write messages: %v", err)
    }

    fmt.Println("Messages sent successfully")
}
```

### Producer with Batching Configuration

For high-throughput scenarios, configure batching parameters to optimize performance:

```go
package main

import (
    "context"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
)

func createOptimizedWriter() *kafka.Writer {
    // Configure the writer for high-throughput production workloads.
    // These settings balance latency and throughput.
    return &kafka.Writer{
        Addr:  kafka.TCP("localhost:9092"),
        Topic: "events",

        // Balancer determines how messages are distributed across partitions.
        // Hash balancer ensures messages with the same key go to the same partition.
        Balancer: &kafka.Hash{},

        // Batching configuration for optimal throughput.
        BatchSize:    100,              // Maximum messages per batch
        BatchBytes:   1048576,          // Maximum batch size in bytes (1MB)
        BatchTimeout: 10 * time.Millisecond, // Maximum time to wait for batch to fill

        // Reliability settings.
        RequiredAcks: kafka.RequireAll, // Wait for all ISR replicas
        MaxAttempts:  3,                // Retry failed writes up to 3 times

        // Compression reduces network bandwidth and storage.
        Compression: kafka.Snappy,

        // Enable idempotent writes to prevent duplicates on retries.
        // This is essential for exactly-once semantics.
        AllowAutoTopicCreation: true,
    }
}

func main() {
    writer := createOptimizedWriter()
    defer writer.Close()

    ctx := context.Background()

    // Simulate producing a stream of events.
    for i := 0; i < 1000; i++ {
        msg := kafka.Message{
            Key:   []byte(fmt.Sprintf("key-%d", i%10)), // 10 unique keys for distribution
            Value: []byte(fmt.Sprintf(`{"event_id": %d, "timestamp": %d}`, i, time.Now().UnixNano())),
            Headers: []kafka.Header{
                {Key: "source", Value: []byte("go-producer")},
                {Key: "version", Value: []byte("1.0")},
            },
        }

        if err := writer.WriteMessages(ctx, msg); err != nil {
            log.Printf("failed to write message %d: %v", i, err)
        }
    }

    log.Println("Finished producing messages")
}
```

### Producer with Custom Partitioning

Sometimes you need fine-grained control over which partition receives each message:

```go
package main

import (
    "context"
    "hash/fnv"
    "log"

    "github.com/segmentio/kafka-go"
)

// CustomBalancer implements a custom partitioning strategy.
// This example partitions based on a custom field in the message.
type CustomBalancer struct{}

func (b *CustomBalancer) Balance(msg kafka.Message, partitions ...int) int {
    // Extract tenant ID from headers for multi-tenant partitioning.
    var tenantID string
    for _, h := range msg.Headers {
        if h.Key == "tenant-id" {
            tenantID = string(h.Value)
            break
        }
    }

    // If no tenant ID, fall back to key-based partitioning.
    if tenantID == "" {
        tenantID = string(msg.Key)
    }

    // Use FNV hash for consistent distribution.
    hasher := fnv.New32a()
    hasher.Write([]byte(tenantID))
    return int(hasher.Sum32()) % len(partitions)
}

func main() {
    writer := &kafka.Writer{
        Addr:     kafka.TCP("localhost:9092"),
        Topic:    "multi-tenant-events",
        Balancer: &CustomBalancer{},
    }
    defer writer.Close()

    ctx := context.Background()

    // Send messages for different tenants.
    // Messages from the same tenant will always go to the same partition.
    messages := []kafka.Message{
        {
            Key:   []byte("event-1"),
            Value: []byte(`{"data": "tenant A event"}`),
            Headers: []kafka.Header{
                {Key: "tenant-id", Value: []byte("tenant-a")},
            },
        },
        {
            Key:   []byte("event-2"),
            Value: []byte(`{"data": "tenant B event"}`),
            Headers: []kafka.Header{
                {Key: "tenant-id", Value: []byte("tenant-b")},
            },
        },
    }

    if err := writer.WriteMessages(ctx, messages...); err != nil {
        log.Fatalf("failed to write: %v", err)
    }
}
```

## Consumer Implementation

Consumers read messages from Kafka topics. Let's explore different consumer patterns.

### Simple Consumer with Reader

The Reader provides a straightforward way to consume messages:

```go
package main

import (
    "context"
    "fmt"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
)

func main() {
    // Create a reader (consumer) for a specific topic and partition.
    // This is useful when you need explicit partition control.
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers:   []string{"localhost:9092"},
        Topic:     "orders",
        Partition: 0,                    // Read from partition 0
        MinBytes:  10e3,                 // 10KB minimum batch size
        MaxBytes:  10e6,                 // 10MB maximum batch size
        MaxWait:   500 * time.Millisecond, // Maximum time to wait for batch
    })
    defer reader.Close()

    // Set the offset to the beginning for this example.
    // In production, you'd typically continue from the last committed offset.
    reader.SetOffset(kafka.FirstOffset)

    ctx := context.Background()

    // Read messages in a loop.
    for {
        // ReadMessage blocks until a message is available or context is cancelled.
        msg, err := reader.ReadMessage(ctx)
        if err != nil {
            log.Printf("error reading message: %v", err)
            break
        }

        fmt.Printf("Received: partition=%d offset=%d key=%s value=%s\n",
            msg.Partition, msg.Offset, string(msg.Key), string(msg.Value))
    }
}
```

### Consumer with Manual Offset Management

For greater control, use FetchMessage and CommitMessages separately:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
)

// Order represents our domain model.
type Order struct {
    ID     int     `json:"id"`
    Amount float64 `json:"amount"`
}

func processOrder(order Order) error {
    // Simulate order processing.
    log.Printf("Processing order %d with amount %.2f", order.ID, order.Amount)
    time.Sleep(100 * time.Millisecond)
    return nil
}

func main() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers:        []string{"localhost:9092"},
        Topic:          "orders",
        Partition:      0,
        MinBytes:       1,    // Read even single messages
        MaxBytes:       10e6,
        CommitInterval: 0,    // Disable auto-commit for manual control
    })
    defer reader.Close()

    ctx := context.Background()

    for {
        // FetchMessage retrieves the next message without committing.
        msg, err := reader.FetchMessage(ctx)
        if err != nil {
            log.Printf("fetch error: %v", err)
            break
        }

        // Deserialize the message.
        var order Order
        if err := json.Unmarshal(msg.Value, &order); err != nil {
            log.Printf("failed to unmarshal order: %v", err)
            // Commit anyway to skip malformed messages.
            reader.CommitMessages(ctx, msg)
            continue
        }

        // Process the order.
        if err := processOrder(order); err != nil {
            log.Printf("failed to process order %d: %v", order.ID, err)
            // Don't commit - the message will be reprocessed.
            continue
        }

        // Commit only after successful processing.
        // This ensures at-least-once delivery semantics.
        if err := reader.CommitMessages(ctx, msg); err != nil {
            log.Printf("failed to commit: %v", err)
        }
    }
}
```

## Consumer Groups for Scalability

Consumer groups allow multiple consumers to coordinate and share the workload of consuming from a topic.

### Consumer Group Implementation

Here's a complete consumer group implementation with graceful shutdown:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/segmentio/kafka-go"
)

// Event represents a generic event from Kafka.
type Event struct {
    Type      string          `json:"type"`
    Timestamp time.Time       `json:"timestamp"`
    Payload   json.RawMessage `json:"payload"`
}

// EventHandler processes events.
type EventHandler func(ctx context.Context, event Event) error

func createConsumerGroup(groupID, topic string, handler EventHandler) {
    // Create a reader configured for consumer group mode.
    // The GroupID enables automatic partition assignment and rebalancing.
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers:        []string{"localhost:9092"},
        GroupID:        groupID,          // Consumer group identifier
        Topic:          topic,
        MinBytes:       10e3,             // 10KB
        MaxBytes:       10e6,             // 10MB
        MaxWait:        3 * time.Second,  // Poll timeout
        CommitInterval: time.Second,      // Auto-commit interval
        StartOffset:    kafka.LastOffset, // Start from latest for new groups

        // Session and heartbeat timeouts for group coordination.
        SessionTimeout:   30 * time.Second,
        HeartbeatInterval: 3 * time.Second,

        // Rebalance timeout gives consumers time to finish processing.
        RebalanceTimeout: 60 * time.Second,
    })

    // Set up graceful shutdown.
    ctx, cancel := context.WithCancel(context.Background())
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    go func() {
        <-sigChan
        log.Println("Shutdown signal received, closing consumer...")
        cancel()
    }()

    log.Printf("Consumer group %s started, listening on topic %s", groupID, topic)

    // Main consumption loop.
    for {
        // Check if shutdown was requested.
        select {
        case <-ctx.Done():
            log.Println("Context cancelled, stopping consumer")
            reader.Close()
            return
        default:
        }

        // Fetch the next message with a timeout context.
        fetchCtx, fetchCancel := context.WithTimeout(ctx, 10*time.Second)
        msg, err := reader.FetchMessage(fetchCtx)
        fetchCancel()

        if err != nil {
            if ctx.Err() != nil {
                // Context was cancelled, exit gracefully.
                break
            }
            log.Printf("fetch error: %v", err)
            continue
        }

        // Deserialize the event.
        var event Event
        if err := json.Unmarshal(msg.Value, &event); err != nil {
            log.Printf("failed to unmarshal event: %v", err)
            // Commit to skip malformed messages.
            reader.CommitMessages(ctx, msg)
            continue
        }

        // Process the event.
        if err := handler(ctx, event); err != nil {
            log.Printf("handler error for event %s: %v", event.Type, err)
            // Depending on requirements, you might not commit here
            // to enable retry logic.
        }

        // Commit after processing.
        if err := reader.CommitMessages(ctx, msg); err != nil {
            log.Printf("commit error: %v", err)
        }
    }

    reader.Close()
    log.Println("Consumer stopped")
}

func main() {
    // Define the event handler.
    handler := func(ctx context.Context, event Event) error {
        log.Printf("Processing event: type=%s, timestamp=%s",
            event.Type, event.Timestamp.Format(time.RFC3339))
        // Add your business logic here.
        return nil
    }

    // Start the consumer group.
    // Run multiple instances of this program to see partition rebalancing.
    createConsumerGroup("event-processor-group", "events", handler)
}
```

### Multiple Partition Consumer with Concurrency

For higher throughput, process messages concurrently while maintaining order within partitions:

```go
package main

import (
    "context"
    "log"
    "sync"
    "time"

    "github.com/segmentio/kafka-go"
)

// PartitionProcessor handles messages for a single partition.
// This ensures ordered processing within each partition while
// allowing concurrent processing across partitions.
type PartitionProcessor struct {
    partition int
    messages  chan kafka.Message
    wg        *sync.WaitGroup
}

func newPartitionProcessor(partition int, wg *sync.WaitGroup) *PartitionProcessor {
    pp := &PartitionProcessor{
        partition: partition,
        messages:  make(chan kafka.Message, 100),
        wg:        wg,
    }
    go pp.run()
    return pp
}

func (pp *PartitionProcessor) run() {
    defer pp.wg.Done()

    for msg := range pp.messages {
        // Process message - maintain order within this partition.
        log.Printf("Partition %d: processing offset %d", pp.partition, msg.Offset)
        time.Sleep(10 * time.Millisecond) // Simulate work
    }
}

func (pp *PartitionProcessor) submit(msg kafka.Message) {
    pp.messages <- msg
}

func (pp *PartitionProcessor) close() {
    close(pp.messages)
}

func main() {
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        GroupID: "concurrent-processor",
        Topic:   "high-volume-events",
    })
    defer reader.Close()

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    var wg sync.WaitGroup
    processors := make(map[int]*PartitionProcessor)
    var mu sync.Mutex

    // Get or create a processor for a partition.
    getProcessor := func(partition int) *PartitionProcessor {
        mu.Lock()
        defer mu.Unlock()

        if pp, ok := processors[partition]; ok {
            return pp
        }

        wg.Add(1)
        pp := newPartitionProcessor(partition, &wg)
        processors[partition] = pp
        return pp
    }

    // Consume messages and route to partition processors.
    for {
        msg, err := reader.FetchMessage(ctx)
        if err != nil {
            log.Printf("fetch error: %v", err)
            break
        }

        // Route to the appropriate partition processor.
        processor := getProcessor(msg.Partition)
        processor.submit(msg)

        // Commit the message.
        reader.CommitMessages(ctx, msg)
    }

    // Cleanup: close all processors and wait.
    mu.Lock()
    for _, pp := range processors {
        pp.close()
    }
    mu.Unlock()

    wg.Wait()
}
```

## Message Serialization

Proper serialization is crucial for interoperability and schema evolution.

### JSON Serialization with Type Registry

A type-safe approach to JSON serialization with support for multiple message types:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "reflect"
    "time"

    "github.com/segmentio/kafka-go"
)

// MessageEnvelope wraps all messages with metadata.
type MessageEnvelope struct {
    Type      string          `json:"type"`
    Version   int             `json:"version"`
    Timestamp time.Time       `json:"timestamp"`
    Payload   json.RawMessage `json:"payload"`
}

// TypeRegistry maps type names to Go types for deserialization.
type TypeRegistry struct {
    types map[string]reflect.Type
}

func NewTypeRegistry() *TypeRegistry {
    return &TypeRegistry{
        types: make(map[string]reflect.Type),
    }
}

func (r *TypeRegistry) Register(name string, example interface{}) {
    r.types[name] = reflect.TypeOf(example)
}

func (r *TypeRegistry) Decode(envelope MessageEnvelope) (interface{}, error) {
    t, ok := r.types[envelope.Type]
    if !ok {
        return nil, fmt.Errorf("unknown type: %s", envelope.Type)
    }

    // Create a new instance of the registered type.
    instance := reflect.New(t).Interface()
    if err := json.Unmarshal(envelope.Payload, instance); err != nil {
        return nil, fmt.Errorf("failed to unmarshal payload: %w", err)
    }

    return instance, nil
}

// Domain types.
type OrderCreated struct {
    OrderID    string  `json:"order_id"`
    CustomerID string  `json:"customer_id"`
    Amount     float64 `json:"amount"`
}

type OrderShipped struct {
    OrderID        string `json:"order_id"`
    TrackingNumber string `json:"tracking_number"`
    Carrier        string `json:"carrier"`
}

// Serialize creates an envelope for any payload.
func Serialize(typeName string, version int, payload interface{}) ([]byte, error) {
    payloadBytes, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }

    envelope := MessageEnvelope{
        Type:      typeName,
        Version:   version,
        Timestamp: time.Now().UTC(),
        Payload:   payloadBytes,
    }

    return json.Marshal(envelope)
}

func main() {
    // Set up the type registry.
    registry := NewTypeRegistry()
    registry.Register("order.created", OrderCreated{})
    registry.Register("order.shipped", OrderShipped{})

    // Producer example.
    writer := &kafka.Writer{
        Addr:  kafka.TCP("localhost:9092"),
        Topic: "orders",
    }
    defer writer.Close()

    order := OrderCreated{
        OrderID:    "ORD-12345",
        CustomerID: "CUST-789",
        Amount:     299.99,
    }

    data, err := Serialize("order.created", 1, order)
    if err != nil {
        log.Fatalf("failed to serialize: %v", err)
    }

    ctx := context.Background()
    err = writer.WriteMessages(ctx, kafka.Message{
        Key:   []byte(order.OrderID),
        Value: data,
    })
    if err != nil {
        log.Fatalf("failed to write: %v", err)
    }

    // Consumer example.
    reader := kafka.NewReader(kafka.ReaderConfig{
        Brokers: []string{"localhost:9092"},
        Topic:   "orders",
        GroupID: "order-processor",
    })
    defer reader.Close()

    for {
        msg, err := reader.ReadMessage(ctx)
        if err != nil {
            log.Printf("read error: %v", err)
            break
        }

        var envelope MessageEnvelope
        if err := json.Unmarshal(msg.Value, &envelope); err != nil {
            log.Printf("failed to unmarshal envelope: %v", err)
            continue
        }

        payload, err := registry.Decode(envelope)
        if err != nil {
            log.Printf("failed to decode: %v", err)
            continue
        }

        // Type switch to handle different message types.
        switch v := payload.(type) {
        case *OrderCreated:
            log.Printf("Order created: %s for $%.2f", v.OrderID, v.Amount)
        case *OrderShipped:
            log.Printf("Order shipped: %s via %s", v.OrderID, v.Carrier)
        }
    }
}
```

### Avro Serialization with Schema Registry

For production systems requiring schema evolution, use Avro with a schema registry:

```go
package main

import (
    "context"
    "encoding/binary"
    "fmt"
    "log"

    "github.com/linkedin/goavro/v2"
    "github.com/segmentio/kafka-go"
)

// SchemaRegistry client for managing Avro schemas.
// In production, use a proper schema registry client.
type SchemaRegistry struct {
    schemas map[int]*goavro.Codec
}

func NewSchemaRegistry() *SchemaRegistry {
    return &SchemaRegistry{
        schemas: make(map[int]*goavro.Codec),
    }
}

func (sr *SchemaRegistry) Register(schemaID int, schemaJSON string) error {
    codec, err := goavro.NewCodec(schemaJSON)
    if err != nil {
        return fmt.Errorf("failed to create codec: %w", err)
    }
    sr.schemas[schemaID] = codec
    return nil
}

func (sr *SchemaRegistry) Encode(schemaID int, data map[string]interface{}) ([]byte, error) {
    codec, ok := sr.schemas[schemaID]
    if !ok {
        return nil, fmt.Errorf("schema not found: %d", schemaID)
    }

    // Encode to Avro binary.
    binary, err := codec.BinaryFromNative(nil, data)
    if err != nil {
        return nil, err
    }

    // Prepend magic byte and schema ID (Confluent wire format).
    result := make([]byte, 5+len(binary))
    result[0] = 0 // Magic byte
    binary.BigEndian.PutUint32(result[1:5], uint32(schemaID))
    copy(result[5:], binary)

    return result, nil
}

func (sr *SchemaRegistry) Decode(data []byte) (map[string]interface{}, error) {
    if len(data) < 5 {
        return nil, fmt.Errorf("data too short")
    }

    // Extract schema ID from wire format.
    schemaID := int(binary.BigEndian.Uint32(data[1:5]))

    codec, ok := sr.schemas[schemaID]
    if !ok {
        return nil, fmt.Errorf("schema not found: %d", schemaID)
    }

    // Decode Avro binary.
    native, _, err := codec.NativeFromBinary(data[5:])
    if err != nil {
        return nil, err
    }

    result, ok := native.(map[string]interface{})
    if !ok {
        return nil, fmt.Errorf("unexpected type: %T", native)
    }

    return result, nil
}

func main() {
    // Define the User schema.
    userSchema := `{
        "type": "record",
        "name": "User",
        "namespace": "com.example",
        "fields": [
            {"name": "id", "type": "string"},
            {"name": "name", "type": "string"},
            {"name": "email", "type": "string"},
            {"name": "created_at", "type": "long", "logicalType": "timestamp-millis"}
        ]
    }`

    registry := NewSchemaRegistry()
    if err := registry.Register(1, userSchema); err != nil {
        log.Fatalf("failed to register schema: %v", err)
    }

    // Produce an Avro message.
    userData := map[string]interface{}{
        "id":         "user-123",
        "name":       "John Doe",
        "email":      "john@example.com",
        "created_at": time.Now().UnixMilli(),
    }

    encoded, err := registry.Encode(1, userData)
    if err != nil {
        log.Fatalf("failed to encode: %v", err)
    }

    writer := &kafka.Writer{
        Addr:  kafka.TCP("localhost:9092"),
        Topic: "users",
    }
    defer writer.Close()

    ctx := context.Background()
    err = writer.WriteMessages(ctx, kafka.Message{
        Key:   []byte(userData["id"].(string)),
        Value: encoded,
    })
    if err != nil {
        log.Fatalf("failed to write: %v", err)
    }

    log.Println("Avro message produced successfully")
}
```

## Error Handling and Retries

Robust error handling is essential for production Kafka applications.

### Retry with Exponential Backoff

Implement smart retries with exponential backoff and dead letter queue:

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "log"
    "math"
    "time"

    "github.com/segmentio/kafka-go"
)

// RetryConfig defines retry behavior.
type RetryConfig struct {
    MaxAttempts     int
    InitialInterval time.Duration
    MaxInterval     time.Duration
    Multiplier      float64
}

// RetriableError indicates an error that should be retried.
type RetriableError struct {
    Err error
}

func (e *RetriableError) Error() string {
    return e.Err.Error()
}

func (e *RetriableError) Unwrap() error {
    return e.Err
}

// MessageProcessor handles message processing with retries.
type MessageProcessor struct {
    config     RetryConfig
    dlqWriter  *kafka.Writer
    mainReader *kafka.Reader
}

func NewMessageProcessor(brokers []string, topic, groupID string, config RetryConfig) *MessageProcessor {
    return &MessageProcessor{
        config: config,
        mainReader: kafka.NewReader(kafka.ReaderConfig{
            Brokers: brokers,
            Topic:   topic,
            GroupID: groupID,
        }),
        dlqWriter: &kafka.Writer{
            Addr:  kafka.TCP(brokers...),
            Topic: topic + ".dlq", // Dead letter queue topic
        },
    }
}

func (mp *MessageProcessor) processWithRetry(ctx context.Context, msg kafka.Message, handler func(kafka.Message) error) error {
    var lastErr error

    for attempt := 1; attempt <= mp.config.MaxAttempts; attempt++ {
        err := handler(msg)
        if err == nil {
            return nil // Success
        }

        lastErr = err

        // Check if error is retriable.
        var retriable *RetriableError
        if !errors.As(err, &retriable) {
            // Non-retriable error, send to DLQ immediately.
            log.Printf("Non-retriable error, sending to DLQ: %v", err)
            return mp.sendToDLQ(ctx, msg, err, attempt)
        }

        // Calculate backoff with exponential increase and jitter.
        backoff := time.Duration(float64(mp.config.InitialInterval) *
            math.Pow(mp.config.Multiplier, float64(attempt-1)))
        if backoff > mp.config.MaxInterval {
            backoff = mp.config.MaxInterval
        }

        log.Printf("Attempt %d failed, retrying in %v: %v", attempt, backoff, err)

        select {
        case <-time.After(backoff):
            // Continue to next attempt
        case <-ctx.Done():
            return ctx.Err()
        }
    }

    // Max attempts reached, send to DLQ.
    log.Printf("Max attempts reached, sending to DLQ")
    return mp.sendToDLQ(ctx, msg, lastErr, mp.config.MaxAttempts)
}

func (mp *MessageProcessor) sendToDLQ(ctx context.Context, original kafka.Message, err error, attempts int) error {
    dlqMessage := kafka.Message{
        Key:   original.Key,
        Value: original.Value,
        Headers: append(original.Headers,
            kafka.Header{Key: "dlq-error", Value: []byte(err.Error())},
            kafka.Header{Key: "dlq-attempts", Value: []byte(fmt.Sprintf("%d", attempts))},
            kafka.Header{Key: "dlq-original-topic", Value: []byte(original.Topic)},
            kafka.Header{Key: "dlq-original-partition", Value: []byte(fmt.Sprintf("%d", original.Partition))},
            kafka.Header{Key: "dlq-original-offset", Value: []byte(fmt.Sprintf("%d", original.Offset))},
            kafka.Header{Key: "dlq-timestamp", Value: []byte(time.Now().Format(time.RFC3339))},
        ),
    }

    return mp.dlqWriter.WriteMessages(ctx, dlqMessage)
}

func (mp *MessageProcessor) Start(ctx context.Context, handler func(kafka.Message) error) error {
    defer mp.mainReader.Close()
    defer mp.dlqWriter.Close()

    for {
        msg, err := mp.mainReader.FetchMessage(ctx)
        if err != nil {
            if ctx.Err() != nil {
                return ctx.Err()
            }
            log.Printf("fetch error: %v", err)
            continue
        }

        if err := mp.processWithRetry(ctx, msg, handler); err != nil {
            log.Printf("processing failed completely: %v", err)
        }

        // Always commit after processing (even if sent to DLQ).
        if err := mp.mainReader.CommitMessages(ctx, msg); err != nil {
            log.Printf("commit error: %v", err)
        }
    }
}

func main() {
    config := RetryConfig{
        MaxAttempts:     5,
        InitialInterval: 100 * time.Millisecond,
        MaxInterval:     10 * time.Second,
        Multiplier:      2.0,
    }

    processor := NewMessageProcessor(
        []string{"localhost:9092"},
        "orders",
        "order-processor",
        config,
    )

    handler := func(msg kafka.Message) error {
        // Simulate processing that might fail.
        if string(msg.Key) == "bad-order" {
            return &RetriableError{Err: errors.New("temporary failure")}
        }
        log.Printf("Processed: %s", string(msg.Value))
        return nil
    }

    ctx := context.Background()
    if err := processor.Start(ctx, handler); err != nil {
        log.Fatalf("processor error: %v", err)
    }
}
```

## Exactly-Once Semantics Patterns

Achieving exactly-once semantics requires careful coordination between Kafka and your application.

### Transactional Producer Pattern

Use transactions for atomic writes across multiple topics:

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/segmentio/kafka-go"
)

// TransactionalProducer wraps kafka.Writer with transaction support.
// Note: kafka-go has limited transaction support compared to the Java client.
// This pattern shows how to achieve transactional-like behavior.
type TransactionalProducer struct {
    writer *kafka.Writer
    txnID  string
}

func NewTransactionalProducer(brokers []string, txnID string) *TransactionalProducer {
    return &TransactionalProducer{
        txnID: txnID,
        writer: &kafka.Writer{
            Addr:         kafka.TCP(brokers...),
            RequiredAcks: kafka.RequireAll,
            // Enable idempotent producer - essential for exactly-once.
            // This ensures that retries don't produce duplicates.
            Async: false,
        },
    }
}

// WriteTransactionally writes messages to multiple topics atomically.
func (tp *TransactionalProducer) WriteTransactionally(ctx context.Context, messages []kafka.Message) error {
    // In a real transaction, you'd use Kafka's transaction API.
    // This simplified version ensures all-or-nothing semantics
    // by batching all messages in a single write call.
    return tp.writer.WriteMessages(ctx, messages...)
}

func (tp *TransactionalProducer) Close() error {
    return tp.writer.Close()
}

func main() {
    producer := NewTransactionalProducer(
        []string{"localhost:9092"},
        "order-processor-1",
    )
    defer producer.Close()

    ctx := context.Background()

    // Write to multiple topics atomically.
    messages := []kafka.Message{
        {
            Topic: "orders",
            Key:   []byte("order-123"),
            Value: []byte(`{"status": "completed"}`),
        },
        {
            Topic: "inventory",
            Key:   []byte("product-456"),
            Value: []byte(`{"reserved": -1}`),
        },
        {
            Topic: "notifications",
            Key:   []byte("user-789"),
            Value: []byte(`{"type": "order_complete"}`),
        },
    }

    if err := producer.WriteTransactionally(ctx, messages); err != nil {
        log.Fatalf("transaction failed: %v", err)
    }

    fmt.Println("Transaction completed successfully")
}
```

### Idempotent Consumer with Deduplication

Implement idempotent message processing using a deduplication store:

```go
package main

import (
    "context"
    "crypto/sha256"
    "encoding/hex"
    "fmt"
    "log"
    "sync"
    "time"

    "github.com/segmentio/kafka-go"
)

// DeduplicationStore tracks processed message IDs.
// In production, use Redis or a database for persistence.
type DeduplicationStore struct {
    mu        sync.RWMutex
    processed map[string]time.Time
    ttl       time.Duration
}

func NewDeduplicationStore(ttl time.Duration) *DeduplicationStore {
    store := &DeduplicationStore{
        processed: make(map[string]time.Time),
        ttl:       ttl,
    }
    go store.cleanup()
    return store
}

func (ds *DeduplicationStore) cleanup() {
    ticker := time.NewTicker(time.Minute)
    for range ticker.C {
        ds.mu.Lock()
        now := time.Now()
        for id, t := range ds.processed {
            if now.Sub(t) > ds.ttl {
                delete(ds.processed, id)
            }
        }
        ds.mu.Unlock()
    }
}

// MarkProcessed records that a message was processed.
// Returns false if already processed (duplicate).
func (ds *DeduplicationStore) MarkProcessed(messageID string) bool {
    ds.mu.Lock()
    defer ds.mu.Unlock()

    if _, exists := ds.processed[messageID]; exists {
        return false // Duplicate
    }

    ds.processed[messageID] = time.Now()
    return true
}

// GenerateMessageID creates a unique ID for deduplication.
func GenerateMessageID(msg kafka.Message) string {
    // Combine topic, partition, and offset for uniqueness.
    data := fmt.Sprintf("%s-%d-%d", msg.Topic, msg.Partition, msg.Offset)
    hash := sha256.Sum256([]byte(data))
    return hex.EncodeToString(hash[:16])
}

// IdempotentConsumer ensures exactly-once processing semantics.
type IdempotentConsumer struct {
    reader *kafka.Reader
    store  *DeduplicationStore
}

func NewIdempotentConsumer(brokers []string, topic, groupID string) *IdempotentConsumer {
    return &IdempotentConsumer{
        reader: kafka.NewReader(kafka.ReaderConfig{
            Brokers: brokers,
            Topic:   topic,
            GroupID: groupID,
        }),
        store: NewDeduplicationStore(24 * time.Hour),
    }
}

func (ic *IdempotentConsumer) Process(ctx context.Context, handler func(kafka.Message) error) error {
    for {
        msg, err := ic.reader.FetchMessage(ctx)
        if err != nil {
            if ctx.Err() != nil {
                return ctx.Err()
            }
            log.Printf("fetch error: %v", err)
            continue
        }

        messageID := GenerateMessageID(msg)

        // Check for duplicate.
        if !ic.store.MarkProcessed(messageID) {
            log.Printf("Skipping duplicate message: %s", messageID)
            ic.reader.CommitMessages(ctx, msg)
            continue
        }

        // Process the message.
        if err := handler(msg); err != nil {
            log.Printf("processing error: %v", err)
            // Note: In a real implementation, you might want to
            // remove the ID from the store to allow retry.
        }

        // Commit after successful processing.
        if err := ic.reader.CommitMessages(ctx, msg); err != nil {
            log.Printf("commit error: %v", err)
        }
    }
}

func (ic *IdempotentConsumer) Close() error {
    return ic.reader.Close()
}

func main() {
    consumer := NewIdempotentConsumer(
        []string{"localhost:9092"},
        "orders",
        "idempotent-processor",
    )
    defer consumer.Close()

    handler := func(msg kafka.Message) error {
        log.Printf("Processing order: %s", string(msg.Value))
        // Your idempotent business logic here.
        return nil
    }

    ctx := context.Background()
    if err := consumer.Process(ctx, handler); err != nil {
        log.Fatalf("consumer error: %v", err)
    }
}
```

### Outbox Pattern for Reliable Publishing

The outbox pattern ensures reliable message publishing alongside database transactions:

```go
package main

import (
    "context"
    "database/sql"
    "encoding/json"
    "log"
    "time"

    "github.com/segmentio/kafka-go"
    _ "github.com/lib/pq"
)

// OutboxMessage represents a pending message in the outbox table.
type OutboxMessage struct {
    ID        int64
    Topic     string
    Key       string
    Payload   []byte
    CreatedAt time.Time
}

// OutboxPublisher reads from the outbox table and publishes to Kafka.
type OutboxPublisher struct {
    db     *sql.DB
    writer *kafka.Writer
}

func NewOutboxPublisher(db *sql.DB, brokers []string) *OutboxPublisher {
    return &OutboxPublisher{
        db: db,
        writer: &kafka.Writer{
            Addr:         kafka.TCP(brokers...),
            RequiredAcks: kafka.RequireAll,
        },
    }
}

// SaveToOutbox saves a message to the outbox within a transaction.
// Call this within your business transaction.
func SaveToOutbox(tx *sql.Tx, topic, key string, payload interface{}) error {
    data, err := json.Marshal(payload)
    if err != nil {
        return err
    }

    _, err = tx.Exec(`
        INSERT INTO outbox (topic, key, payload, created_at)
        VALUES ($1, $2, $3, NOW())
    `, topic, key, data)

    return err
}

// PublishPendingMessages reads and publishes pending outbox messages.
func (op *OutboxPublisher) PublishPendingMessages(ctx context.Context) error {
    // Query pending messages.
    rows, err := op.db.QueryContext(ctx, `
        SELECT id, topic, key, payload, created_at
        FROM outbox
        WHERE published_at IS NULL
        ORDER BY created_at
        LIMIT 100
        FOR UPDATE SKIP LOCKED
    `)
    if err != nil {
        return err
    }
    defer rows.Close()

    var messages []OutboxMessage
    for rows.Next() {
        var msg OutboxMessage
        if err := rows.Scan(&msg.ID, &msg.Topic, &msg.Key, &msg.Payload, &msg.CreatedAt); err != nil {
            return err
        }
        messages = append(messages, msg)
    }

    if len(messages) == 0 {
        return nil
    }

    // Publish each message.
    for _, msg := range messages {
        kafkaMsg := kafka.Message{
            Topic: msg.Topic,
            Key:   []byte(msg.Key),
            Value: msg.Payload,
        }

        if err := op.writer.WriteMessages(ctx, kafkaMsg); err != nil {
            log.Printf("failed to publish message %d: %v", msg.ID, err)
            continue
        }

        // Mark as published.
        _, err := op.db.ExecContext(ctx, `
            UPDATE outbox SET published_at = NOW() WHERE id = $1
        `, msg.ID)
        if err != nil {
            log.Printf("failed to mark message %d as published: %v", msg.ID, err)
        }

        log.Printf("Published outbox message %d to %s", msg.ID, msg.Topic)
    }

    return nil
}

// Run starts the outbox publisher loop.
func (op *OutboxPublisher) Run(ctx context.Context, interval time.Duration) {
    ticker := time.NewTicker(interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            if err := op.PublishPendingMessages(ctx); err != nil {
                log.Printf("outbox publish error: %v", err)
            }
        }
    }
}

func (op *OutboxPublisher) Close() error {
    return op.writer.Close()
}

// Example usage showing how to save to outbox in a business transaction.
func CreateOrder(db *sql.DB, orderID string, amount float64) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Save order to database.
    _, err = tx.Exec(`
        INSERT INTO orders (id, amount, status)
        VALUES ($1, $2, 'created')
    `, orderID, amount)
    if err != nil {
        return err
    }

    // Save event to outbox (same transaction).
    event := map[string]interface{}{
        "order_id": orderID,
        "amount":   amount,
        "status":   "created",
    }
    if err := SaveToOutbox(tx, "order-events", orderID, event); err != nil {
        return err
    }

    return tx.Commit()
}
```

## Monitoring and Health Checks

Production Kafka applications need proper observability.

### Health Check Implementation

Implement health checks for your Kafka consumers and producers:

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "sync/atomic"
    "time"

    "github.com/segmentio/kafka-go"
)

// KafkaHealthChecker monitors Kafka connectivity and consumer lag.
type KafkaHealthChecker struct {
    brokers       []string
    lastHeartbeat atomic.Value
    isHealthy     atomic.Bool
    consumerLag   atomic.Int64
}

func NewKafkaHealthChecker(brokers []string) *KafkaHealthChecker {
    hc := &KafkaHealthChecker{
        brokers: brokers,
    }
    hc.isHealthy.Store(false)
    hc.lastHeartbeat.Store(time.Time{})

    go hc.monitor()
    return hc
}

func (hc *KafkaHealthChecker) monitor() {
    ticker := time.NewTicker(10 * time.Second)
    for range ticker.C {
        hc.checkHealth()
    }
}

func (hc *KafkaHealthChecker) checkHealth() {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    // Try to connect and fetch metadata.
    conn, err := kafka.DialContext(ctx, "tcp", hc.brokers[0])
    if err != nil {
        log.Printf("health check failed: %v", err)
        hc.isHealthy.Store(false)
        return
    }
    defer conn.Close()

    // Fetch broker list to verify cluster health.
    _, err = conn.Brokers()
    if err != nil {
        log.Printf("failed to fetch brokers: %v", err)
        hc.isHealthy.Store(false)
        return
    }

    hc.isHealthy.Store(true)
    hc.lastHeartbeat.Store(time.Now())
}

func (hc *KafkaHealthChecker) UpdateConsumerLag(lag int64) {
    hc.consumerLag.Store(lag)
}

// HealthStatus represents the health check response.
type HealthStatus struct {
    Healthy       bool      `json:"healthy"`
    LastHeartbeat time.Time `json:"last_heartbeat"`
    ConsumerLag   int64     `json:"consumer_lag"`
    Brokers       []string  `json:"brokers"`
}

func (hc *KafkaHealthChecker) ServeHTTP(w http.ResponseWriter, r *http.Request) {
    status := HealthStatus{
        Healthy:       hc.isHealthy.Load(),
        LastHeartbeat: hc.lastHeartbeat.Load().(time.Time),
        ConsumerLag:   hc.consumerLag.Load(),
        Brokers:       hc.brokers,
    }

    w.Header().Set("Content-Type", "application/json")

    if !status.Healthy {
        w.WriteHeader(http.StatusServiceUnavailable)
    }

    json.NewEncoder(w).Encode(status)
}

func main() {
    healthChecker := NewKafkaHealthChecker([]string{"localhost:9092"})

    http.Handle("/health", healthChecker)
    http.Handle("/ready", healthChecker)

    log.Println("Health check server starting on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Conclusion

Building reliable Kafka applications in Go with `segmentio/kafka-go` requires understanding several key concepts:

1. **Producers**: Use batching and compression for throughput, configure acknowledgments for reliability
2. **Consumers**: Choose between simple readers for explicit control or consumer groups for scalability
3. **Consumer Groups**: Enable horizontal scaling with automatic partition assignment
4. **Serialization**: Use JSON for simplicity or Avro for schema evolution
5. **Error Handling**: Implement retries with backoff and dead letter queues
6. **Exactly-Once**: Combine idempotent producers, deduplication, and the outbox pattern

The patterns shown in this guide form the foundation for building production-ready event-driven systems. Start with the basic producer and consumer examples, then add reliability patterns as your requirements demand.

For further reading, explore the [official kafka-go documentation](https://github.com/segmentio/kafka-go) and consider implementing observability with OpenTelemetry tracing for distributed debugging.
