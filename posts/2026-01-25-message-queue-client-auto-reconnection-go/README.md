# How to Build a Message Queue Client with Auto-Reconnection in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Message Queue, Auto-Reconnection, RabbitMQ, Reliability

Description: Learn how to build a resilient message queue client in Go that automatically reconnects after failures, with practical examples using RabbitMQ and production-ready patterns.

---

Message queues are the backbone of distributed systems. They decouple services, buffer traffic spikes, and enable asynchronous processing. But network connections drop, brokers restart, and services fail. A message queue client that cannot handle disconnections will bring your entire system to a halt.

This guide walks through building a robust RabbitMQ client in Go with automatic reconnection, channel recovery, and graceful shutdown handling.

## Why Auto-Reconnection Matters

Consider a typical production scenario: your RabbitMQ cluster undergoes a rolling upgrade. Each node restarts for about 30 seconds. Without auto-reconnection, your services would crash or hang, requiring manual intervention. With proper reconnection logic, your services simply wait for the broker to return and resume processing as if nothing happened.

The key challenges are:

- Detecting connection loss quickly
- Backing off appropriately to avoid overwhelming a recovering broker
- Restoring channel state after reconnection
- Handling in-flight messages during disconnection

## Basic Connection Structure

Start with a struct that holds the connection state and provides methods for reconnection. The key insight is separating the connection management from the actual message handling.

```go
package mqclient

import (
    "context"
    "log"
    "sync"
    "time"

    amqp "github.com/rabbitmq/amqp091-go"
)

// Client wraps a RabbitMQ connection with auto-reconnection
type Client struct {
    url           string
    conn          *amqp.Connection
    channel       *amqp.Channel
    done          chan struct{}
    notifyClose   chan *amqp.Error
    notifyConfirm chan amqp.Confirmation
    isConnected   bool
    mu            sync.RWMutex
}

// NewClient creates a new client and establishes the initial connection
func NewClient(url string) (*Client, error) {
    client := &Client{
        url:  url,
        done: make(chan struct{}),
    }

    // Attempt initial connection
    if err := client.connect(); err != nil {
        return nil, err
    }

    // Start the reconnection handler in the background
    go client.handleReconnect()

    return client, nil
}
```

## Implementing the Connection Logic

The connect method establishes both the connection and channel. RabbitMQ uses channels for actual operations - publishing, consuming, declaring queues. Keep the channel setup here so it gets restored on reconnection.

```go
// connect establishes a connection and channel to RabbitMQ
func (c *Client) connect() error {
    conn, err := amqp.Dial(c.url)
    if err != nil {
        return err
    }

    ch, err := conn.Channel()
    if err != nil {
        conn.Close()
        return err
    }

    // Enable publisher confirms for reliable publishing
    if err := ch.Confirm(false); err != nil {
        ch.Close()
        conn.Close()
        return err
    }

    c.mu.Lock()
    c.conn = conn
    c.channel = ch
    c.isConnected = true
    c.mu.Unlock()

    // Set up notification channels for connection closure
    c.notifyClose = make(chan *amqp.Error, 1)
    c.notifyConfirm = make(chan amqp.Confirmation, 1)
    c.channel.NotifyClose(c.notifyClose)
    c.channel.NotifyPublish(c.notifyConfirm)

    log.Println("Connected to RabbitMQ")
    return nil
}
```

## The Reconnection Loop

The heart of auto-reconnection is a goroutine that watches for disconnections and attempts to reconnect with exponential backoff. The backoff prevents hammering a recovering broker with connection attempts.

```go
// handleReconnect watches for disconnections and reconnects
func (c *Client) handleReconnect() {
    for {
        select {
        case <-c.done:
            return
        case err := <-c.notifyClose:
            if err != nil {
                log.Printf("Connection closed: %v", err)
            }

            c.mu.Lock()
            c.isConnected = false
            c.mu.Unlock()

            // Reconnect with exponential backoff
            c.reconnectWithBackoff()
        }
    }
}

// reconnectWithBackoff attempts to reconnect with increasing delays
func (c *Client) reconnectWithBackoff() {
    backoff := time.Second
    maxBackoff := 30 * time.Second

    for {
        select {
        case <-c.done:
            return
        default:
        }

        log.Printf("Attempting to reconnect in %v...", backoff)
        time.Sleep(backoff)

        if err := c.connect(); err != nil {
            log.Printf("Failed to reconnect: %v", err)

            // Exponential backoff with cap
            backoff *= 2
            if backoff > maxBackoff {
                backoff = maxBackoff
            }
            continue
        }

        // Successfully reconnected, reset backoff
        log.Println("Reconnected successfully")
        return
    }
}
```

## Safe Publishing with Reconnection Awareness

Publishing must handle the case where the connection drops mid-publish. This implementation waits for the connection to be restored and retries the publish.

```go
// Publish sends a message to the specified exchange and routing key
// It blocks until the message is confirmed or the context is cancelled
func (c *Client) Publish(ctx context.Context, exchange, routingKey string, body []byte) error {
    for {
        // Check if we're connected
        c.mu.RLock()
        connected := c.isConnected
        ch := c.channel
        c.mu.RUnlock()

        if !connected || ch == nil {
            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(100 * time.Millisecond):
                continue
            }
        }

        // Attempt to publish
        err := ch.PublishWithContext(
            ctx,
            exchange,
            routingKey,
            false, // mandatory
            false, // immediate
            amqp.Publishing{
                ContentType:  "application/json",
                Body:         body,
                DeliveryMode: amqp.Persistent,
            },
        )

        if err != nil {
            // Connection might have dropped, wait and retry
            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(100 * time.Millisecond):
                continue
            }
        }

        // Wait for confirmation
        select {
        case <-ctx.Done():
            return ctx.Err()
        case confirm := <-c.notifyConfirm:
            if confirm.Ack {
                return nil
            }
            log.Println("Message was nacked, retrying...")
            continue
        case <-c.notifyClose:
            // Connection dropped, loop will retry after reconnect
            continue
        }
    }
}
```

## Building a Resilient Consumer

Consumers need special handling because they maintain server-side state (the consumer tag). When the connection drops, the server-side consumer is gone. You must re-register after reconnection.

```go
// Consumer handles message consumption with auto-reconnection
type Consumer struct {
    client    *Client
    queue     string
    handler   func([]byte) error
    done      chan struct{}
}

// NewConsumer creates a consumer that automatically recovers from disconnections
func NewConsumer(client *Client, queue string, handler func([]byte) error) *Consumer {
    return &Consumer{
        client:  client,
        queue:   queue,
        handler: handler,
        done:    make(chan struct{}),
    }
}

// Start begins consuming messages, automatically recovering from disconnections
func (c *Consumer) Start() {
    go c.consumeLoop()
}

func (c *Consumer) consumeLoop() {
    for {
        select {
        case <-c.done:
            return
        default:
        }

        // Wait for connection
        c.client.mu.RLock()
        connected := c.client.isConnected
        ch := c.client.channel
        c.client.mu.RUnlock()

        if !connected || ch == nil {
            time.Sleep(100 * time.Millisecond)
            continue
        }

        // Declare the queue (idempotent operation)
        _, err := ch.QueueDeclare(
            c.queue,
            true,  // durable
            false, // auto-delete
            false, // exclusive
            false, // no-wait
            nil,   // args
        )
        if err != nil {
            log.Printf("Failed to declare queue: %v", err)
            time.Sleep(time.Second)
            continue
        }

        // Start consuming
        msgs, err := ch.Consume(
            c.queue,
            "",    // consumer tag (auto-generated)
            false, // auto-ack
            false, // exclusive
            false, // no-local
            false, // no-wait
            nil,   // args
        )
        if err != nil {
            log.Printf("Failed to start consuming: %v", err)
            time.Sleep(time.Second)
            continue
        }

        log.Printf("Started consuming from %s", c.queue)

        // Process messages until disconnection
        c.processMessages(msgs)

        log.Println("Consumer disconnected, will retry...")
    }
}

func (c *Consumer) processMessages(msgs <-chan amqp.Delivery) {
    for {
        select {
        case <-c.done:
            return
        case msg, ok := <-msgs:
            if !ok {
                // Channel closed, need to reconnect
                return
            }

            // Process the message
            if err := c.handler(msg.Body); err != nil {
                log.Printf("Error processing message: %v", err)
                msg.Nack(false, true) // requeue
                continue
            }

            msg.Ack(false)
        }
    }
}

// Stop gracefully stops the consumer
func (c *Consumer) Stop() {
    close(c.done)
}
```

## Graceful Shutdown

Proper shutdown prevents message loss and ensures in-flight messages complete processing. This is especially important in Kubernetes environments where pods receive SIGTERM during rollouts.

```go
// Close gracefully shuts down the client
func (c *Client) Close() error {
    close(c.done)

    c.mu.Lock()
    defer c.mu.Unlock()

    if c.channel != nil {
        if err := c.channel.Close(); err != nil {
            log.Printf("Error closing channel: %v", err)
        }
    }

    if c.conn != nil {
        if err := c.conn.Close(); err != nil {
            return err
        }
    }

    c.isConnected = false
    log.Println("Client closed")
    return nil
}
```

## Complete Usage Example

Here is how to use the client in a real application with proper signal handling.

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
)

type OrderEvent struct {
    OrderID string `json:"order_id"`
    Status  string `json:"status"`
}

func main() {
    // Create the client
    client, err := NewClient("amqp://guest:guest@localhost:5672/")
    if err != nil {
        log.Fatalf("Failed to connect: %v", err)
    }
    defer client.Close()

    // Set up a consumer
    consumer := NewConsumer(client, "orders", func(body []byte) error {
        var event OrderEvent
        if err := json.Unmarshal(body, &event); err != nil {
            return err
        }
        log.Printf("Processing order %s with status %s", event.OrderID, event.Status)
        return nil
    })
    consumer.Start()

    // Publish some test messages
    go func() {
        for i := 0; i < 100; i++ {
            event := OrderEvent{
                OrderID: fmt.Sprintf("order-%d", i),
                Status:  "pending",
            }
            body, _ := json.Marshal(event)

            ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
            if err := client.Publish(ctx, "", "orders", body); err != nil {
                log.Printf("Failed to publish: %v", err)
            }
            cancel()

            time.Sleep(100 * time.Millisecond)
        }
    }()

    // Wait for shutdown signal
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
    <-sigChan

    log.Println("Shutting down...")
    consumer.Stop()
}
```

## Testing Reconnection

Test your reconnection logic by stopping and starting RabbitMQ while your application runs. You should see logs like:

```
Connected to RabbitMQ
Started consuming from orders
Processing order order-0 with status pending
Processing order order-1 with status pending
Connection closed: Exception (320) Reason: "CONNECTION_FORCED - broker forced connection closure"
Attempting to reconnect in 1s...
Reconnected successfully
Started consuming from orders
Processing order order-2 with status pending
```

The messages continue flowing after reconnection with no manual intervention required.

## Summary

Building a resilient message queue client requires:

| Component | Purpose |
|-----------|---------|
| Connection wrapper | Holds state and provides thread-safe access |
| Reconnection loop | Watches for disconnections and reconnects |
| Exponential backoff | Prevents overwhelming recovering brokers |
| Consumer recovery | Re-registers consumers after reconnection |
| Publisher retry | Waits for connection and retries publishes |
| Graceful shutdown | Ensures clean disconnect and message completion |

These patterns apply to any message broker, not just RabbitMQ. The same principles work for Kafka, NATS, Redis Pub/Sub, or any other messaging system where connections can fail.

Building auto-reconnection into your message queue clients from the start saves you from debugging production outages at 3 AM. The extra code is worth it.
