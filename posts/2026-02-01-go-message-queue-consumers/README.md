# How to Implement Message Queue Consumers in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Message Queue, RabbitMQ, NATS, Async, Consumer Patterns

Description: A practical guide to building reliable message queue consumers in Go with proper error handling, retries, and graceful shutdown.

---

Message queues are the backbone of distributed systems. They decouple services, handle traffic spikes, and enable async processing. But writing a consumer that actually works in production requires more than just pulling messages off a queue. You need connection recovery, proper acknowledgment, retry logic, and graceful shutdown.

This post walks through building production-ready message queue consumers in Go using RabbitMQ and NATS.

## Why Go for Message Queue Consumers?

Go's concurrency model makes it particularly well-suited for message queue consumers. Goroutines are cheap, channels provide clean communication patterns, and the standard library includes everything you need for signal handling and graceful shutdown. Most message queue client libraries in Go are also mature and battle-tested.

## Consumer Patterns

There are two main patterns for consuming messages: push-based and pull-based.

**Push-based consumers** receive messages as they arrive. The broker pushes messages to your consumer, which processes them as fast as it can. This is the default mode for most AMQP consumers.

**Pull-based consumers** explicitly request messages from the queue. This gives you more control over processing rate but adds complexity.

For most use cases, push-based consumption with proper prefetch limits works well.

## Setting Up a RabbitMQ Consumer

Here's a basic RabbitMQ consumer structure. We'll build on this throughout the post.

The following code sets up a connection to RabbitMQ and creates a channel for consuming messages:

```go
package main

import (
    "log"
    "os"
    "os/signal"
    "syscall"

    amqp "github.com/rabbitmq/amqp091-go"
)

// Consumer holds the RabbitMQ connection and channel
type Consumer struct {
    conn    *amqp.Connection
    channel *amqp.Channel
    queue   string
    done    chan struct{}
}

// NewConsumer creates a new RabbitMQ consumer instance
func NewConsumer(url, queue string) (*Consumer, error) {
    conn, err := amqp.Dial(url)
    if err != nil {
        return nil, err
    }

    ch, err := conn.Channel()
    if err != nil {
        conn.Close()
        return nil, err
    }

    // Set prefetch count to limit unacknowledged messages
    // This prevents one slow consumer from hogging all messages
    err = ch.Qos(10, 0, false)
    if err != nil {
        ch.Close()
        conn.Close()
        return nil, err
    }

    return &Consumer{
        conn:    conn,
        channel: ch,
        queue:   queue,
        done:    make(chan struct{}),
    }, nil
}
```

## Connection Handling and Recovery

Connections fail. Networks hiccup, brokers restart, and containers get rescheduled. Your consumer needs to handle this gracefully.

RabbitMQ connections expose a notification channel that fires when the connection closes. Use this to trigger reconnection logic:

```go
// handleReconnect monitors the connection and attempts to reconnect on failure
func (c *Consumer) handleReconnect(url string) {
    for {
        // NotifyClose returns a channel that receives connection close events
        notifyClose := c.conn.NotifyClose(make(chan *amqp.Error))

        select {
        case <-c.done:
            return
        case err := <-notifyClose:
            if err != nil {
                log.Printf("Connection closed: %v. Reconnecting...", err)
            }

            // Attempt reconnection with exponential backoff
            for i := 0; i < 5; i++ {
                conn, err := amqp.Dial(url)
                if err != nil {
                    log.Printf("Reconnect attempt %d failed: %v", i+1, err)
                    time.Sleep(time.Duration(i+1) * time.Second)
                    continue
                }

                ch, err := conn.Channel()
                if err != nil {
                    conn.Close()
                    continue
                }

                c.conn = conn
                c.channel = ch
                log.Println("Reconnected successfully")
                break
            }
        }
    }
}
```

## Message Acknowledgment

Proper acknowledgment is critical. Acknowledge too early and you lose messages on crashes. Acknowledge too late and you process duplicates.

RabbitMQ supports three acknowledgment modes:

1. **Auto-ack**: Messages are removed immediately upon delivery. Fast but risky.
2. **Manual ack**: You explicitly acknowledge after processing. Safe and recommended.
3. **Nack with requeue**: Reject a message and optionally put it back in the queue.

This example shows manual acknowledgment with proper error handling:

```go
// Start begins consuming messages from the queue
func (c *Consumer) Start(handler func([]byte) error) error {
    // Consume returns a channel that delivers messages
    // autoAck is false - we acknowledge manually after processing
    msgs, err := c.channel.Consume(
        c.queue,
        "",    // consumer tag - empty means auto-generated
        false, // autoAck - we handle ack manually
        false, // exclusive
        false, // noLocal
        false, // noWait
        nil,   // args
    )
    if err != nil {
        return err
    }

    go func() {
        for msg := range msgs {
            // Process the message
            err := handler(msg.Body)

            if err != nil {
                log.Printf("Failed to process message: %v", err)
                // Nack with requeue=false sends to dead letter queue if configured
                // requeue=true would put the message back in the queue
                msg.Nack(false, false)
                continue
            }

            // Acknowledge successful processing
            // multiple=false means only ack this specific message
            msg.Ack(false)
        }
    }()

    return nil
}
```

## Error Handling and Retries

Not all errors are equal. Some are transient (network timeouts, temporary unavailability) and worth retrying. Others are permanent (malformed data, business logic violations) and should be moved to a dead letter queue.

Here's a retry pattern using message headers to track attempt count:

```go
// MaxRetries defines how many times we attempt to process a message
const MaxRetries = 3

// processWithRetry handles message processing with retry logic
func (c *Consumer) processWithRetry(msg amqp.Delivery, handler func([]byte) error) {
    // Extract retry count from message headers
    retryCount := 0
    if msg.Headers != nil {
        if count, ok := msg.Headers["x-retry-count"].(int32); ok {
            retryCount = int(count)
        }
    }

    err := handler(msg.Body)
    if err == nil {
        msg.Ack(false)
        return
    }

    log.Printf("Processing failed (attempt %d/%d): %v", retryCount+1, MaxRetries, err)

    if retryCount >= MaxRetries-1 {
        // Max retries exceeded - send to dead letter queue
        log.Printf("Max retries exceeded, moving to DLQ")
        msg.Nack(false, false)
        return
    }

    // Republish with incremented retry count
    // This allows the message to be processed again with backoff
    headers := msg.Headers
    if headers == nil {
        headers = make(amqp.Table)
    }
    headers["x-retry-count"] = int32(retryCount + 1)

    err = c.channel.Publish(
        "",      // exchange
        c.queue, // routing key
        false,   // mandatory
        false,   // immediate
        amqp.Publishing{
            Headers:     headers,
            ContentType: msg.ContentType,
            Body:        msg.Body,
        },
    )

    if err != nil {
        log.Printf("Failed to republish: %v", err)
    }

    // Ack the original message since we republished it
    msg.Ack(false)
}
```

## Dead Letter Queues

When a message fails all retry attempts, it should go somewhere for inspection rather than being lost. Dead letter queues (DLQs) capture these failed messages.

Configure DLQ in RabbitMQ by setting queue arguments when declaring the main queue:

```go
// declareQueueWithDLQ creates a queue with dead letter exchange configured
func (c *Consumer) declareQueueWithDLQ(queueName string) error {
    // First, declare the dead letter queue
    _, err := c.channel.QueueDeclare(
        queueName+".dlq",
        true,  // durable
        false, // autoDelete
        false, // exclusive
        false, // noWait
        nil,
    )
    if err != nil {
        return err
    }

    // Declare the main queue with DLQ configuration
    // x-dead-letter-exchange routes rejected messages to the DLQ
    args := amqp.Table{
        "x-dead-letter-exchange":    "",
        "x-dead-letter-routing-key": queueName + ".dlq",
    }

    _, err = c.channel.QueueDeclare(
        queueName,
        true,  // durable
        false, // autoDelete
        false, // exclusive
        false, // noWait
        args,
    )

    return err
}
```

## Graceful Shutdown

A consumer needs to shut down cleanly when receiving SIGTERM or SIGINT. This means:

1. Stop accepting new messages
2. Finish processing in-flight messages
3. Close connections

Here's the complete graceful shutdown implementation:

```go
// Shutdown gracefully stops the consumer
func (c *Consumer) Shutdown() error {
    // Signal the done channel to stop reconnection attempts
    close(c.done)

    // Cancel the consumer - this stops new message delivery
    // The empty string matches our consumer tag
    if err := c.channel.Cancel("", false); err != nil {
        return err
    }

    // Close channel and connection
    if err := c.channel.Close(); err != nil {
        return err
    }

    return c.conn.Close()
}

func main() {
    consumer, err := NewConsumer("amqp://localhost:5672", "tasks")
    if err != nil {
        log.Fatal(err)
    }

    // Start consuming in a goroutine
    err = consumer.Start(func(body []byte) error {
        log.Printf("Processing: %s", body)
        // Your processing logic here
        return nil
    })
    if err != nil {
        log.Fatal(err)
    }

    // Set up signal handling for graceful shutdown
    // This catches SIGINT (Ctrl+C) and SIGTERM (container orchestrators)
    sigChan := make(chan os.Signal, 1)
    signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)

    log.Println("Consumer started. Press Ctrl+C to exit.")
    <-sigChan

    log.Println("Shutting down...")
    if err := consumer.Shutdown(); err != nil {
        log.Printf("Error during shutdown: %v", err)
    }
    log.Println("Shutdown complete")
}
```

## NATS Consumer Example

NATS provides a simpler, lighter-weight alternative to RabbitMQ. Here's an equivalent consumer using NATS JetStream for persistence:

```go
package main

import (
    "context"
    "log"
    "os"
    "os/signal"
    "syscall"
    "time"

    "github.com/nats-io/nats.go"
    "github.com/nats-io/nats.go/jetstream"
)

// NATSConsumer wraps the NATS connection and JetStream consumer
type NATSConsumer struct {
    nc       *nats.Conn
    js       jetstream.JetStream
    consumer jetstream.Consumer
    ctx      context.Context
    cancel   context.CancelFunc
}

// NewNATSConsumer creates a NATS JetStream consumer
func NewNATSConsumer(url, stream, consumer string) (*NATSConsumer, error) {
    // Connect with automatic reconnection enabled
    nc, err := nats.Connect(url,
        nats.ReconnectWait(time.Second),
        nats.MaxReconnects(-1), // unlimited reconnects
        nats.DisconnectErrHandler(func(_ *nats.Conn, err error) {
            log.Printf("Disconnected: %v", err)
        }),
        nats.ReconnectHandler(func(_ *nats.Conn) {
            log.Println("Reconnected to NATS")
        }),
    )
    if err != nil {
        return nil, err
    }

    // Create JetStream context for persistent messaging
    js, err := jetstream.New(nc)
    if err != nil {
        nc.Close()
        return nil, err
    }

    ctx, cancel := context.WithCancel(context.Background())

    // Get or create the consumer
    // Durable consumers survive restarts and remember their position
    cons, err := js.Consumer(ctx, stream, consumer)
    if err != nil {
        cancel()
        nc.Close()
        return nil, err
    }

    return &NATSConsumer{
        nc:       nc,
        js:       js,
        consumer: cons,
        ctx:      ctx,
        cancel:   cancel,
    }, nil
}

// Start begins consuming messages with the provided handler
func (c *NATSConsumer) Start(handler func([]byte) error) error {
    // Consume returns a MessageHandler that processes messages
    // Messages are automatically fetched in batches
    _, err := c.consumer.Consume(func(msg jetstream.Msg) {
        err := handler(msg.Data())
        if err != nil {
            log.Printf("Processing failed: %v", err)
            // Nak tells NATS to redeliver the message
            // WithDelay adds backoff before redelivery
            msg.Nak()
            return
        }

        // Ack confirms successful processing
        msg.Ack()
    })

    return err
}

// Shutdown gracefully stops the NATS consumer
func (c *NATSConsumer) Shutdown() {
    c.cancel()
    c.nc.Drain() // Drain waits for in-flight messages to complete
}
```

## Monitoring Your Consumers

You need visibility into your consumers in production. Key metrics to track:

- **Processing rate**: Messages processed per second
- **Error rate**: Failed messages vs successful ones
- **Queue depth**: How many messages are waiting
- **Processing latency**: Time from enqueue to completion
- **Consumer lag**: How far behind real-time your consumer is

Instrument your consumer with metrics:

```go
import (
    "github.com/prometheus/client_golang/prometheus"
    "github.com/prometheus/client_golang/prometheus/promauto"
)

// Define Prometheus metrics for observability
var (
    messagesProcessed = promauto.NewCounterVec(
        prometheus.CounterOpts{
            Name: "consumer_messages_processed_total",
            Help: "Total number of messages processed",
        },
        []string{"status"}, // "success" or "failure"
    )

    processingDuration = promauto.NewHistogram(
        prometheus.HistogramOpts{
            Name:    "consumer_processing_duration_seconds",
            Help:    "Time spent processing messages",
            Buckets: prometheus.DefBuckets,
        },
    )
)

// processWithMetrics wraps the handler with metric collection
func processWithMetrics(handler func([]byte) error) func([]byte) error {
    return func(body []byte) error {
        start := time.Now()

        err := handler(body)

        // Record processing duration regardless of outcome
        processingDuration.Observe(time.Since(start).Seconds())

        if err != nil {
            messagesProcessed.WithLabelValues("failure").Inc()
            return err
        }

        messagesProcessed.WithLabelValues("success").Inc()
        return nil
    }
}
```

## Best Practices Summary

1. **Always use manual acknowledgment** - Auto-ack loses messages on crashes
2. **Set prefetch limits** - Prevents one slow consumer from blocking others
3. **Implement connection recovery** - Networks fail, plan for it
4. **Use dead letter queues** - Failed messages need somewhere to go
5. **Add retry with backoff** - Transient errors often resolve themselves
6. **Handle shutdown signals** - Kubernetes sends SIGTERM before killing pods
7. **Instrument everything** - You cannot fix what you cannot measure
8. **Make processing idempotent** - Messages may be delivered more than once

## Conclusion

Building reliable message queue consumers requires handling the edge cases that only appear in production. Connection failures, message acknowledgment, retry logic, and graceful shutdown are not optional features - they are requirements for any system that needs to run reliably.

The patterns shown here work for both RabbitMQ and NATS, and the concepts translate to other message brokers like Kafka or Redis Streams. Start with the basics, add observability early, and iterate based on what you learn from production behavior.

---

*Monitor your message queue consumers with [OneUptime](https://oneuptime.com) - track processing rates, failures, and queue depths in real-time.*
