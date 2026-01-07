# How to Use NATS in Go for Microservice Communication

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, NATS, Messaging, Microservices, Distributed Systems

Description: Build lightweight microservice communication in Go using NATS for pub/sub, request/reply patterns, and JetStream for persistence.

---

NATS is a high-performance, lightweight messaging system designed for cloud-native applications, IoT messaging, and microservices architectures. Unlike heavier message brokers, NATS emphasizes simplicity and speed, making it an excellent choice for building distributed systems in Go.

In this comprehensive guide, we'll explore how to use NATS in Go for microservice communication, covering core messaging patterns, JetStream for persistence, and production-ready connection management.

## Why NATS for Microservices?

Before diving into code, let's understand why NATS is particularly well-suited for microservice architectures:

- **Lightweight**: NATS server binary is only about 15MB and starts in milliseconds
- **High Performance**: Capable of handling millions of messages per second
- **Simple Protocol**: Text-based protocol that's easy to debug and understand
- **Built-in Patterns**: Native support for pub/sub, request/reply, and queue groups
- **JetStream**: Persistent messaging with exactly-once delivery semantics
- **Go-Native**: Written in Go with an excellent Go client library

## Prerequisites

Before we begin, ensure you have:

- Go 1.21 or later installed
- Docker for running NATS server (or install NATS directly)
- Basic understanding of Go and microservices concepts

## Setting Up NATS

### Running NATS Server with Docker

The easiest way to get started is running NATS with Docker. This command starts NATS with JetStream enabled.

```bash
# Run NATS server with JetStream enabled
docker run -d --name nats \
  -p 4222:4222 \
  -p 8222:8222 \
  nats:latest -js -m 8222

# Verify NATS is running
curl http://localhost:8222/healthz
```

### Installing the Go Client

Initialize your Go module and install the NATS client library.

```bash
# Initialize a new Go module
go mod init nats-microservices

# Install the NATS Go client
go get github.com/nats-io/nats.go
```

## NATS Core Concepts

NATS uses a simple subject-based addressing system. Subjects are strings that publishers send messages to and subscribers listen on. Here are the key concepts:

- **Subjects**: Hierarchical addresses like `orders.created` or `users.profile.updated`
- **Wildcards**: `*` matches a single token, `>` matches one or more tokens
- **Publishers**: Send messages to subjects
- **Subscribers**: Receive messages from subjects they're interested in

## Basic Connection Management

Let's start with establishing a connection to NATS. This example shows basic connection with error handling.

```go
package main

import (
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS server with default options
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect to NATS: %v", err)
    }
    defer nc.Close()

    log.Printf("Connected to NATS at %s", nc.ConnectedUrl())

    // Check if connection is active
    if nc.IsConnected() {
        log.Println("Connection is active")
    }
}
```

## Pub/Sub Pattern Implementation

The publish/subscribe pattern is the foundation of NATS messaging. Publishers send messages to subjects without knowing who will receive them, and subscribers receive all messages published to subjects they're interested in.

### Simple Publisher

This publisher sends order events to a subject. Each message contains order information in JSON format.

```go
package main

import (
    "encoding/json"
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

// Order represents an order in our system
type Order struct {
    ID        string    `json:"id"`
    CustomerID string   `json:"customer_id"`
    Amount    float64   `json:"amount"`
    Status    string    `json:"status"`
    CreatedAt time.Time `json:"created_at"`
}

func main() {
    // Connect to NATS
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Create a sample order
    order := Order{
        ID:         "ORD-12345",
        CustomerID: "CUST-789",
        Amount:     99.99,
        Status:     "created",
        CreatedAt:  time.Now(),
    }

    // Serialize the order to JSON
    data, err := json.Marshal(order)
    if err != nil {
        log.Fatalf("Failed to marshal order: %v", err)
    }

    // Publish the order to the "orders.created" subject
    err = nc.Publish("orders.created", data)
    if err != nil {
        log.Fatalf("Failed to publish: %v", err)
    }

    // Flush ensures the message is sent before we exit
    nc.Flush()

    log.Printf("Published order %s to orders.created", order.ID)
}
```

### Simple Subscriber

This subscriber listens for order events and processes them. It uses an asynchronous callback pattern.

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/nats-io/nats.go"
)

type Order struct {
    ID         string  `json:"id"`
    CustomerID string  `json:"customer_id"`
    Amount     float64 `json:"amount"`
    Status     string  `json:"status"`
}

func main() {
    // Connect to NATS
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Subscribe to orders.created subject
    // The callback is invoked for each message received
    sub, err := nc.Subscribe("orders.created", func(msg *nats.Msg) {
        var order Order
        if err := json.Unmarshal(msg.Data, &order); err != nil {
            log.Printf("Failed to unmarshal order: %v", err)
            return
        }

        log.Printf("Received order: ID=%s, Customer=%s, Amount=$%.2f",
            order.ID, order.CustomerID, order.Amount)

        // Process the order here...
    })
    if err != nil {
        log.Fatalf("Failed to subscribe: %v", err)
    }
    defer sub.Unsubscribe()

    log.Println("Listening for orders on 'orders.created'...")

    // Wait for interrupt signal to gracefully shutdown
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    log.Println("Shutting down...")
}
```

### Wildcard Subscriptions

NATS supports wildcards for flexible subscription patterns. This is useful for monitoring or aggregating events.

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/nats-io/nats.go"
)

func main() {
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Single-token wildcard: matches orders.created, orders.updated, etc.
    nc.Subscribe("orders.*", func(msg *nats.Msg) {
        log.Printf("[orders.*] Subject: %s, Data: %s", msg.Subject, string(msg.Data))
    })

    // Multi-token wildcard: matches orders.us.created, orders.eu.shipped, etc.
    nc.Subscribe("orders.>", func(msg *nats.Msg) {
        log.Printf("[orders.>] Subject: %s, Data: %s", msg.Subject, string(msg.Data))
    })

    log.Println("Listening with wildcard subscriptions...")

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan
}
```

## Request/Reply Pattern

The request/reply pattern enables synchronous communication between services. One service sends a request and waits for a response, similar to HTTP but over NATS.

### Service (Responder)

This service handles requests for user information. It listens on a subject and responds to each request.

```go
package main

import (
    "encoding/json"
    "log"
    "os"
    "os/signal"
    "syscall"

    "github.com/nats-io/nats.go"
)

type UserRequest struct {
    UserID string `json:"user_id"`
}

type UserResponse struct {
    UserID string `json:"user_id"`
    Name   string `json:"name"`
    Email  string `json:"email"`
    Found  bool   `json:"found"`
}

// Simulated user database
var users = map[string]UserResponse{
    "user-1": {UserID: "user-1", Name: "Alice Smith", Email: "alice@example.com", Found: true},
    "user-2": {UserID: "user-2", Name: "Bob Johnson", Email: "bob@example.com", Found: true},
}

func main() {
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Subscribe to user.get requests
    // msg.Reply contains the subject to send the response to
    nc.Subscribe("user.get", func(msg *nats.Msg) {
        var req UserRequest
        if err := json.Unmarshal(msg.Data, &req); err != nil {
            log.Printf("Invalid request: %v", err)
            return
        }

        log.Printf("Received request for user: %s", req.UserID)

        // Look up user in our "database"
        response, found := users[req.UserID]
        if !found {
            response = UserResponse{UserID: req.UserID, Found: false}
        }

        // Serialize and send the response
        data, _ := json.Marshal(response)
        msg.Respond(data)

        log.Printf("Sent response for user: %s", req.UserID)
    })

    log.Println("User service listening on 'user.get'...")

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan
}
```

### Client (Requester)

This client sends requests and waits for responses with a timeout.

```go
package main

import (
    "encoding/json"
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

type UserRequest struct {
    UserID string `json:"user_id"`
}

type UserResponse struct {
    UserID string `json:"user_id"`
    Name   string `json:"name"`
    Email  string `json:"email"`
    Found  bool   `json:"found"`
}

func main() {
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Create request payload
    req := UserRequest{UserID: "user-1"}
    reqData, _ := json.Marshal(req)

    // Send request and wait for reply with 2-second timeout
    msg, err := nc.Request("user.get", reqData, 2*time.Second)
    if err != nil {
        if err == nats.ErrTimeout {
            log.Fatalf("Request timed out - is the user service running?")
        }
        log.Fatalf("Request failed: %v", err)
    }

    // Parse the response
    var resp UserResponse
    if err := json.Unmarshal(msg.Data, &resp); err != nil {
        log.Fatalf("Failed to parse response: %v", err)
    }

    if resp.Found {
        log.Printf("User found: %s <%s>", resp.Name, resp.Email)
    } else {
        log.Printf("User not found: %s", req.UserID)
    }
}
```

## Queue Groups for Load Balancing

Queue groups allow multiple subscribers to share the workload. When multiple subscribers join the same queue group, NATS distributes messages among them, ensuring each message is processed by only one subscriber.

### Worker with Queue Group

This example shows how to create workers that share the processing load.

```go
package main

import (
    "encoding/json"
    "flag"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/nats-io/nats.go"
)

type Task struct {
    ID      string `json:"id"`
    Payload string `json:"payload"`
}

func main() {
    // Accept worker ID from command line
    workerID := flag.String("id", "worker-1", "Worker ID")
    flag.Parse()

    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Subscribe with queue group "task-workers"
    // Only one worker in the group will receive each message
    nc.QueueSubscribe("tasks.process", "task-workers", func(msg *nats.Msg) {
        var task Task
        if err := json.Unmarshal(msg.Data, &task); err != nil {
            log.Printf("[%s] Invalid task: %v", *workerID, err)
            return
        }

        log.Printf("[%s] Processing task: %s", *workerID, task.ID)

        // Simulate work
        time.Sleep(500 * time.Millisecond)

        log.Printf("[%s] Completed task: %s", *workerID, task.ID)
    })

    log.Printf("[%s] Ready to process tasks...", *workerID)

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan
}
```

### Task Publisher

This publisher sends multiple tasks that will be distributed among workers.

```go
package main

import (
    "encoding/json"
    "fmt"
    "log"
    "time"

    "github.com/nats-io/nats.go"
)

type Task struct {
    ID      string `json:"id"`
    Payload string `json:"payload"`
}

func main() {
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Publish 10 tasks
    for i := 1; i <= 10; i++ {
        task := Task{
            ID:      fmt.Sprintf("task-%d", i),
            Payload: fmt.Sprintf("Process item %d", i),
        }

        data, _ := json.Marshal(task)
        nc.Publish("tasks.process", data)

        log.Printf("Published task: %s", task.ID)
        time.Sleep(100 * time.Millisecond)
    }

    nc.Flush()
    log.Println("All tasks published")
}
```

## JetStream for Persistence

JetStream adds persistence, exactly-once delivery, and stream processing capabilities to NATS. It's essential for scenarios where you cannot afford to lose messages.

### Creating Streams and Consumers

This example shows how to set up JetStream streams and consumers for order processing.

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/nats-io/nats.go"
    "github.com/nats-io/nats.go/jetstream"
)

type Order struct {
    ID     string  `json:"id"`
    Amount float64 `json:"amount"`
    Status string  `json:"status"`
}

func main() {
    // Connect to NATS
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    // Create JetStream context
    js, err := jetstream.New(nc)
    if err != nil {
        log.Fatalf("Failed to create JetStream context: %v", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    // Create or update a stream for orders
    // Streams persist messages and can have multiple consumers
    stream, err := js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
        Name:        "ORDERS",
        Description: "Order events stream",
        Subjects:    []string{"orders.>"},  // Capture all order subjects
        Storage:     jetstream.FileStorage, // Persist to disk
        Retention:   jetstream.LimitsPolicy,
        MaxAge:      24 * time.Hour,        // Keep messages for 24 hours
        MaxMsgs:     100000,                // Maximum messages to keep
        Replicas:    1,                     // Number of replicas (1 for dev)
    })
    if err != nil {
        log.Fatalf("Failed to create stream: %v", err)
    }

    log.Printf("Stream created: %s with subjects %v",
        stream.CachedInfo().Config.Name,
        stream.CachedInfo().Config.Subjects)

    // Publish some orders to the stream
    for i := 1; i <= 5; i++ {
        order := Order{
            ID:     fmt.Sprintf("ORD-%d", i),
            Amount: float64(i) * 25.50,
            Status: "pending",
        }
        data, _ := json.Marshal(order)

        // Publish with acknowledgment
        ack, err := js.Publish(ctx, "orders.created", data)
        if err != nil {
            log.Printf("Failed to publish order %d: %v", i, err)
            continue
        }

        log.Printf("Published order %s, sequence: %d", order.ID, ack.Sequence)
    }
}
```

### Durable Consumer

Durable consumers remember their position in the stream, allowing them to resume after restarts.

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

    "github.com/nats-io/nats.go"
    "github.com/nats-io/nats.go/jetstream"
)

type Order struct {
    ID     string  `json:"id"`
    Amount float64 `json:"amount"`
    Status string  `json:"status"`
}

func main() {
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    js, err := jetstream.New(nc)
    if err != nil {
        log.Fatalf("Failed to create JetStream context: %v", err)
    }

    ctx := context.Background()

    // Create a durable consumer
    // Durable consumers persist their state and can resume after disconnect
    cons, err := js.CreateOrUpdateConsumer(ctx, "ORDERS", jetstream.ConsumerConfig{
        Durable:       "order-processor",     // Name that persists across restarts
        AckPolicy:     jetstream.AckExplicitPolicy,
        DeliverPolicy: jetstream.DeliverAllPolicy, // Start from beginning
        AckWait:       30 * time.Second,      // Time to wait for ack
        MaxDeliver:    3,                     // Max redelivery attempts
        FilterSubject: "orders.created",     // Only process created orders
    })
    if err != nil {
        log.Fatalf("Failed to create consumer: %v", err)
    }

    log.Println("Starting order processor...")

    // Consume messages with automatic fetch
    consumeCtx, consumeCancel := context.WithCancel(ctx)
    defer consumeCancel()

    // Start consuming messages
    cc, err := cons.Consume(func(msg jetstream.Msg) {
        var order Order
        if err := json.Unmarshal(msg.Data(), &order); err != nil {
            log.Printf("Failed to unmarshal: %v", err)
            msg.Nak() // Negative acknowledgment - will redeliver
            return
        }

        log.Printf("Processing order: %s, Amount: $%.2f", order.ID, order.Amount)

        // Simulate processing
        time.Sleep(100 * time.Millisecond)

        // Acknowledge successful processing
        if err := msg.Ack(); err != nil {
            log.Printf("Failed to ack: %v", err)
        }

        log.Printf("Order %s processed successfully", order.ID)
    })
    if err != nil {
        log.Fatalf("Failed to start consumer: %v", err)
    }
    defer cc.Stop()

    log.Println("Order processor running. Press Ctrl+C to exit.")

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    consumeCancel()
    log.Println("Shutting down...")
}
```

## Key-Value Store

JetStream includes a distributed key-value store, perfect for configuration, caching, and service discovery.

### Using the Key-Value Store

This example demonstrates CRUD operations on the KV store.

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "time"

    "github.com/nats-io/nats.go"
    "github.com/nats-io/nats.go/jetstream"
)

type ServiceConfig struct {
    Endpoint    string   `json:"endpoint"`
    Timeout     int      `json:"timeout_ms"`
    MaxRetries  int      `json:"max_retries"`
    Features    []string `json:"features"`
    LastUpdated string   `json:"last_updated"`
}

func main() {
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer nc.Close()

    js, err := jetstream.New(nc)
    if err != nil {
        log.Fatalf("Failed to create JetStream context: %v", err)
    }

    ctx := context.Background()

    // Create a key-value bucket for service configurations
    kv, err := js.CreateOrUpdateKeyValue(ctx, jetstream.KeyValueConfig{
        Bucket:      "service-config",
        Description: "Service configuration store",
        TTL:         24 * time.Hour,    // Optional TTL for entries
        History:     5,                  // Keep 5 versions of each key
        Storage:     jetstream.FileStorage,
    })
    if err != nil {
        log.Fatalf("Failed to create KV bucket: %v", err)
    }

    log.Println("Created KV bucket: service-config")

    // Store a configuration
    config := ServiceConfig{
        Endpoint:    "https://api.example.com",
        Timeout:     5000,
        MaxRetries:  3,
        Features:    []string{"caching", "compression", "retry"},
        LastUpdated: time.Now().Format(time.RFC3339),
    }

    data, _ := json.Marshal(config)
    revision, err := kv.Put(ctx, "payment-service", data)
    if err != nil {
        log.Fatalf("Failed to put config: %v", err)
    }
    log.Printf("Stored config at revision: %d", revision)

    // Retrieve the configuration
    entry, err := kv.Get(ctx, "payment-service")
    if err != nil {
        log.Fatalf("Failed to get config: %v", err)
    }

    var retrieved ServiceConfig
    json.Unmarshal(entry.Value(), &retrieved)
    log.Printf("Retrieved config: endpoint=%s, timeout=%dms",
        retrieved.Endpoint, retrieved.Timeout)

    // Update with optimistic locking using revision
    config.Timeout = 10000
    config.LastUpdated = time.Now().Format(time.RFC3339)
    data, _ = json.Marshal(config)

    // Update only succeeds if revision matches
    newRevision, err := kv.Update(ctx, "payment-service", data, entry.Revision())
    if err != nil {
        log.Printf("Update failed (concurrent modification?): %v", err)
    } else {
        log.Printf("Updated config to revision: %d", newRevision)
    }

    // List all keys
    keys, err := kv.Keys(ctx)
    if err != nil {
        log.Fatalf("Failed to list keys: %v", err)
    }
    log.Printf("Keys in bucket: %v", keys)

    // Watch for changes
    log.Println("Watching for configuration changes...")
    watcher, err := kv.Watch(ctx, "payment-service")
    if err != nil {
        log.Fatalf("Failed to create watcher: %v", err)
    }
    defer watcher.Stop()

    // Simulate a config update in a goroutine
    go func() {
        time.Sleep(1 * time.Second)
        config.MaxRetries = 5
        data, _ := json.Marshal(config)
        kv.Put(ctx, "payment-service", data)
    }()

    // Wait for update
    for update := range watcher.Updates() {
        if update == nil {
            continue
        }
        log.Printf("Config updated: key=%s, revision=%d",
            update.Key(), update.Revision())
        break
    }
}
```

## Connection Management and Reconnection

Production applications need robust connection handling. NATS provides comprehensive options for managing connections, handling disconnects, and automatic reconnection.

### Production-Ready Connection

This example shows how to configure connections for production use.

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/nats-io/nats.go"
)

func main() {
    // Configure connection options for production
    opts := []nats.Option{
        // Connection name for monitoring
        nats.Name("order-service"),

        // Reconnection settings
        nats.MaxReconnects(-1),                    // Unlimited reconnection attempts
        nats.ReconnectWait(2 * time.Second),       // Wait between reconnect attempts
        nats.ReconnectBufSize(5 * 1024 * 1024),    // 5MB buffer during reconnect

        // Timeouts
        nats.Timeout(5 * time.Second),             // Connection timeout
        nats.PingInterval(20 * time.Second),       // Ping interval
        nats.MaxPingsOutstanding(3),               // Max pings without response

        // Event handlers
        nats.DisconnectErrHandler(func(nc *nats.Conn, err error) {
            if err != nil {
                log.Printf("Disconnected due to error: %v", err)
            } else {
                log.Println("Disconnected from NATS")
            }
        }),

        nats.ReconnectHandler(func(nc *nats.Conn) {
            log.Printf("Reconnected to %s", nc.ConnectedUrl())
        }),

        nats.ClosedHandler(func(nc *nats.Conn) {
            log.Println("Connection closed")
        }),

        nats.ErrorHandler(func(nc *nats.Conn, sub *nats.Subscription, err error) {
            if sub != nil {
                log.Printf("Error on subscription %s: %v", sub.Subject, err)
            } else {
                log.Printf("Error: %v", err)
            }
        }),

        // Drain timeout for graceful shutdown
        nats.DrainTimeout(30 * time.Second),
    }

    // Connect with multiple servers for high availability
    servers := "nats://localhost:4222,nats://localhost:4223,nats://localhost:4224"
    nc, err := nats.Connect(servers, opts...)
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }

    log.Printf("Connected to NATS cluster, server: %s", nc.ConnectedUrl())

    // Subscribe to demonstrate connection remains active
    nc.Subscribe("heartbeat", func(msg *nats.Msg) {
        log.Printf("Received heartbeat: %s", string(msg.Data))
    })

    // Publish periodic heartbeats
    go func() {
        ticker := time.NewTicker(5 * time.Second)
        defer ticker.Stop()

        for range ticker.C {
            if nc.IsConnected() {
                nc.Publish("heartbeat", []byte(time.Now().Format(time.RFC3339)))
            }
        }
    }()

    log.Println("Service running. Press Ctrl+C for graceful shutdown.")

    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    // Graceful shutdown with drain
    // Drain stops new subscriptions, processes pending messages, then closes
    log.Println("Initiating graceful shutdown...")
    if err := nc.Drain(); err != nil {
        log.Printf("Error during drain: %v", err)
    }

    log.Println("Shutdown complete")
}
```

## Complete Microservice Example

Let's put it all together with a complete example showing an order processing microservice using JetStream.

### Order Service

This service publishes orders to JetStream and handles order status updates.

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "net/http"
    "time"

    "github.com/nats-io/nats.go"
    "github.com/nats-io/nats.go/jetstream"
)

type Order struct {
    ID        string    `json:"id"`
    Customer  string    `json:"customer"`
    Items     []string  `json:"items"`
    Total     float64   `json:"total"`
    Status    string    `json:"status"`
    CreatedAt time.Time `json:"created_at"`
}

type OrderService struct {
    nc     *nats.Conn
    js     jetstream.JetStream
    stream jetstream.Stream
}

func NewOrderService(natsURL string) (*OrderService, error) {
    // Connect to NATS with reconnection options
    nc, err := nats.Connect(natsURL,
        nats.MaxReconnects(-1),
        nats.ReconnectWait(time.Second),
    )
    if err != nil {
        return nil, fmt.Errorf("failed to connect to NATS: %w", err)
    }

    // Create JetStream context
    js, err := jetstream.New(nc)
    if err != nil {
        nc.Close()
        return nil, fmt.Errorf("failed to create JetStream context: %w", err)
    }

    ctx := context.Background()

    // Create stream for orders
    stream, err := js.CreateOrUpdateStream(ctx, jetstream.StreamConfig{
        Name:      "ORDERS",
        Subjects:  []string{"orders.>"},
        Storage:   jetstream.FileStorage,
        Retention: jetstream.WorkQueuePolicy,
        MaxAge:    7 * 24 * time.Hour,
    })
    if err != nil {
        nc.Close()
        return nil, fmt.Errorf("failed to create stream: %w", err)
    }

    return &OrderService{nc: nc, js: js, stream: stream}, nil
}

func (s *OrderService) CreateOrder(order Order) error {
    order.CreatedAt = time.Now()
    order.Status = "pending"

    data, err := json.Marshal(order)
    if err != nil {
        return fmt.Errorf("failed to marshal order: %w", err)
    }

    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()

    _, err = s.js.Publish(ctx, "orders.created", data)
    if err != nil {
        return fmt.Errorf("failed to publish order: %w", err)
    }

    log.Printf("Order %s created and published", order.ID)
    return nil
}

func (s *OrderService) Close() {
    s.nc.Drain()
}

func main() {
    svc, err := NewOrderService(nats.DefaultURL)
    if err != nil {
        log.Fatalf("Failed to create order service: %v", err)
    }
    defer svc.Close()

    // Simple HTTP endpoint for creating orders
    http.HandleFunc("/orders", func(w http.ResponseWriter, r *http.Request) {
        if r.Method != http.MethodPost {
            http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
            return
        }

        var order Order
        if err := json.NewDecoder(r.Body).Decode(&order); err != nil {
            http.Error(w, "Invalid request body", http.StatusBadRequest)
            return
        }

        order.ID = fmt.Sprintf("ORD-%d", time.Now().UnixNano())

        if err := svc.CreateOrder(order); err != nil {
            http.Error(w, err.Error(), http.StatusInternalServerError)
            return
        }

        w.Header().Set("Content-Type", "application/json")
        json.NewEncoder(w).Encode(order)
    })

    log.Println("Order service running on :8080")
    log.Fatal(http.ListenAndServe(":8080", nil))
}
```

## Best Practices

When using NATS in production microservices, keep these best practices in mind:

### Subject Naming Conventions

Use hierarchical, descriptive subject names that follow a consistent pattern.

```go
// Good subject naming examples
"orders.created"          // Entity + action
"orders.us.west.created"  // Region-specific
"payments.v2.processed"   // Versioned subjects
"notifications.email.sent" // Service + channel + action
```

### Error Handling

Always handle errors appropriately and implement retry logic for critical operations.

```go
// Publish with retry logic
func publishWithRetry(js jetstream.JetStream, subject string, data []byte, maxRetries int) error {
    var lastErr error
    for i := 0; i < maxRetries; i++ {
        ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
        _, err := js.Publish(ctx, subject, data)
        cancel()

        if err == nil {
            return nil
        }

        lastErr = err
        log.Printf("Publish attempt %d failed: %v", i+1, err)
        time.Sleep(time.Duration(i+1) * 100 * time.Millisecond)
    }
    return fmt.Errorf("failed after %d attempts: %w", maxRetries, lastErr)
}
```

### Message Acknowledgment

Use appropriate acknowledgment strategies based on your requirements.

```go
// Different acknowledgment strategies in JetStream consumers
func handleMessage(msg jetstream.Msg) {
    // Process message...

    // Acknowledge successful processing
    msg.Ack()

    // Negative acknowledge - message will be redelivered
    msg.Nak()

    // Negative acknowledge with delay
    msg.NakWithDelay(5 * time.Second)

    // Terminate - don't redeliver (e.g., poison message)
    msg.Term()

    // Request more time for processing
    msg.InProgress()
}
```

### Graceful Shutdown

Always implement graceful shutdown to prevent message loss.

```go
// Graceful shutdown pattern
func gracefulShutdown(nc *nats.Conn) {
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    <-sigChan
    log.Println("Received shutdown signal")

    // Drain stops accepting new messages, processes pending ones, then closes
    if err := nc.Drain(); err != nil {
        log.Printf("Error during drain: %v", err)
    }

    // Wait for drain to complete
    for nc.IsDraining() {
        time.Sleep(100 * time.Millisecond)
    }

    log.Println("Graceful shutdown complete")
}
```

## Monitoring and Observability

NATS provides built-in monitoring endpoints. Access them at `http://localhost:8222`:

- `/varz` - General server information
- `/connz` - Connection information
- `/subz` - Subscription information
- `/jsz` - JetStream information

You can also integrate NATS metrics with Prometheus using the nats-exporter.

## Conclusion

NATS provides a powerful yet simple foundation for microservice communication in Go. With its core pub/sub and request/reply patterns, you can build loosely coupled services that communicate efficiently. JetStream adds the persistence and exactly-once delivery guarantees needed for critical business operations.

Key takeaways:

1. **Start simple**: Use core NATS pub/sub for basic messaging needs
2. **Use queue groups**: Distribute work among multiple instances of a service
3. **Add JetStream when needed**: Use JetStream for persistence and guaranteed delivery
4. **Handle connections properly**: Implement reconnection logic and graceful shutdown
5. **Follow naming conventions**: Use clear, hierarchical subject names
6. **Monitor your system**: Use NATS monitoring endpoints to track system health

NATS's lightweight nature and Go-native design make it an excellent choice for building scalable, resilient microservice architectures. Whether you're building a simple event-driven system or a complex distributed application, NATS provides the tools you need to succeed.

## Additional Resources

- [NATS Documentation](https://docs.nats.io/)
- [NATS Go Client GitHub](https://github.com/nats-io/nats.go)
- [JetStream Documentation](https://docs.nats.io/nats-concepts/jetstream)
- [NATS by Example](https://natsbyexample.com/)
