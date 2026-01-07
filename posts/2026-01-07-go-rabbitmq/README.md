# How to Use RabbitMQ in Go with amqp091-go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, RabbitMQ, Messaging, Distributed Systems, Event-Driven

Description: Build reliable message-driven systems in Go using RabbitMQ with amqp091-go, covering queues, exchanges, and guaranteed message delivery.

---

RabbitMQ is one of the most popular open-source message brokers, enabling applications to communicate asynchronously through message queues. When building distributed systems in Go, the `amqp091-go` library provides a robust, well-maintained client for interacting with RabbitMQ using the AMQP 0.9.1 protocol.

This guide covers everything you need to build reliable message-driven systems: from basic setup through advanced patterns like dead letter queues and connection recovery.

## Prerequisites

Before we begin, ensure you have:

- Go 1.21 or later installed
- RabbitMQ server running (locally or via Docker)
- Basic understanding of Go and message queue concepts

To quickly spin up RabbitMQ with Docker:

```bash
docker run -d --name rabbitmq \
  -p 5672:5672 \
  -p 15672:15672 \
  rabbitmq:3-management
```

The management UI will be available at `http://localhost:15672` (guest/guest).

## Installing amqp091-go

The amqp091-go library is the official Go client maintained by the RabbitMQ team. Install it with:

```bash
go get github.com/rabbitmq/amqp091-go
```

## Connection Management

Establishing a reliable connection to RabbitMQ is the foundation of your messaging system. Here we create a connection and channel with proper error handling.

```go
package main

import (
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// failOnError is a helper function to handle errors consistently
// It logs the error with context and terminates the program
func failOnError(err error, msg string) {
	if err != nil {
		log.Fatalf("%s: %s", msg, err)
	}
}

func main() {
	// Establish connection to RabbitMQ server
	// The connection string format: amqp://user:password@host:port/vhost
	conn, err := amqp.Dial("amqp://guest:guest@localhost:5672/")
	failOnError(err, "Failed to connect to RabbitMQ")
	defer conn.Close()

	// Create a channel - most operations happen on channels, not connections
	// Channels are lightweight and meant to be created per-goroutine
	ch, err := conn.Channel()
	failOnError(err, "Failed to open a channel")
	defer ch.Close()

	log.Println("Successfully connected to RabbitMQ")
}
```

## Understanding Exchange Types

RabbitMQ uses exchanges to route messages to queues. There are four main exchange types, each with different routing behavior.

### Direct Exchange

Direct exchanges route messages to queues based on an exact routing key match. Perfect for task distribution or RPC-style messaging.

```go
package main

import (
	"context"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

func setupDirectExchange(ch *amqp.Channel) error {
	// Declare a direct exchange
	// Parameters:
	// - name: exchange name
	// - kind: exchange type (direct, topic, fanout, headers)
	// - durable: survive broker restart
	// - autoDelete: delete when no queues are bound
	// - internal: used only for exchange-to-exchange binding
	// - noWait: don't wait for server confirmation
	// - args: additional arguments
	err := ch.ExchangeDeclare(
		"orders_direct", // name
		"direct",        // type
		true,            // durable
		false,           // auto-deleted
		false,           // internal
		false,           // no-wait
		nil,             // arguments
	)
	if err != nil {
		return err
	}

	// Declare queues for different order priorities
	priorities := []string{"high", "normal", "low"}
	for _, priority := range priorities {
		// Each queue handles orders of a specific priority
		_, err := ch.QueueDeclare(
			"orders_"+priority, // queue name
			true,               // durable
			false,              // delete when unused
			false,              // exclusive
			false,              // no-wait
			nil,                // arguments
		)
		if err != nil {
			return err
		}

		// Bind queue to exchange with routing key matching priority
		err = ch.QueueBind(
			"orders_"+priority, // queue name
			priority,           // routing key
			"orders_direct",    // exchange
			false,              // no-wait
			nil,                // arguments
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func publishToDirectExchange(ch *amqp.Channel, priority, message string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Publish message with routing key matching the desired queue
	return ch.PublishWithContext(
		ctx,
		"orders_direct", // exchange
		priority,        // routing key - determines which queue receives the message
		false,           // mandatory
		false,           // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         []byte(message),
			DeliveryMode: amqp.Persistent, // message survives broker restart
		},
	)
}
```

### Topic Exchange

Topic exchanges route messages based on pattern matching with wildcards. Use `*` to match exactly one word and `#` to match zero or more words.

```go
func setupTopicExchange(ch *amqp.Channel) error {
	// Declare a topic exchange for event routing
	err := ch.ExchangeDeclare(
		"events_topic", // name
		"topic",        // type
		true,           // durable
		false,          // auto-deleted
		false,          // internal
		false,          // no-wait
		nil,            // arguments
	)
	if err != nil {
		return err
	}

	// Queue for all user events (user.created, user.updated, user.deleted)
	_, err = ch.QueueDeclare("all_user_events", true, false, false, false, nil)
	if err != nil {
		return err
	}

	// Bind with pattern: user.* matches user.created, user.deleted, etc.
	err = ch.QueueBind(
		"all_user_events",
		"user.*",       // pattern: matches any single word after user.
		"events_topic",
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Queue for all audit events across all domains
	_, err = ch.QueueDeclare("audit_events", true, false, false, false, nil)
	if err != nil {
		return err
	}

	// Bind with pattern: *.audit matches order.audit, user.audit, etc.
	err = ch.QueueBind(
		"audit_events",
		"*.audit",      // pattern: matches any domain with .audit suffix
		"events_topic",
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Queue for all events (catch-all for logging)
	_, err = ch.QueueDeclare("all_events", true, false, false, false, nil)
	if err != nil {
		return err
	}

	// Bind with pattern: # matches everything
	err = ch.QueueBind(
		"all_events",
		"#",            // pattern: matches all routing keys
		"events_topic",
		false,
		nil,
	)

	return err
}

func publishEvent(ch *amqp.Channel, routingKey, event string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Routing key examples: user.created, order.shipped, payment.audit
	return ch.PublishWithContext(
		ctx,
		"events_topic",
		routingKey,     // e.g., "user.created" or "order.audit"
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(event),
		},
	)
}
```

### Fanout Exchange

Fanout exchanges broadcast messages to all bound queues, ignoring routing keys. Ideal for pub/sub scenarios.

```go
func setupFanoutExchange(ch *amqp.Channel) error {
	// Declare a fanout exchange for broadcasting notifications
	err := ch.ExchangeDeclare(
		"notifications_fanout",
		"fanout",       // fanout type ignores routing key
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Create multiple subscriber queues
	// Each subscriber receives a copy of every message
	subscribers := []string{"email_service", "sms_service", "push_service", "webhook_service"}

	for _, subscriber := range subscribers {
		_, err := ch.QueueDeclare(
			"notifications_"+subscriber,
			true,
			false,
			false,
			false,
			nil,
		)
		if err != nil {
			return err
		}

		// Routing key is ignored for fanout, but still required (use empty string)
		err = ch.QueueBind(
			"notifications_"+subscriber,
			"",                       // routing key ignored for fanout
			"notifications_fanout",
			false,
			nil,
		)
		if err != nil {
			return err
		}
	}

	return nil
}

func broadcastNotification(ch *amqp.Channel, notification string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// All bound queues receive this message regardless of routing key
	return ch.PublishWithContext(
		ctx,
		"notifications_fanout",
		"",             // routing key ignored for fanout
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(notification),
		},
	)
}
```

### Headers Exchange

Headers exchanges route based on message headers rather than routing key. More flexible but less performant than other types.

```go
func setupHeadersExchange(ch *amqp.Channel) error {
	// Declare a headers exchange for complex routing scenarios
	err := ch.ExchangeDeclare(
		"documents_headers",
		"headers",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Queue for PDF documents from the finance department
	_, err = ch.QueueDeclare("finance_pdfs", true, false, false, false, nil)
	if err != nil {
		return err
	}

	// Bind with header matching arguments
	// x-match: all means ALL headers must match
	// x-match: any means ANY header can match
	err = ch.QueueBind(
		"finance_pdfs",
		"",                       // routing key ignored for headers exchange
		"documents_headers",
		false,
		amqp.Table{
			"x-match":    "all",  // all headers must match
			"format":     "pdf",
			"department": "finance",
		},
	)

	return err
}

func publishDocument(ch *amqp.Channel, format, department string, document []byte) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Headers determine routing, not the routing key
	return ch.PublishWithContext(
		ctx,
		"documents_headers",
		"",             // routing key ignored
		false,
		false,
		amqp.Publishing{
			ContentType: "application/octet-stream",
			Headers: amqp.Table{
				"format":     format,     // e.g., "pdf", "docx"
				"department": department, // e.g., "finance", "hr"
			},
			Body: document,
		},
	)
}
```

## Queue Declaration and Configuration

Queues hold messages until consumers process them. Proper configuration ensures reliability and optimal performance.

```go
func declareQueues(ch *amqp.Channel) error {
	// Standard durable queue - survives broker restart
	_, err := ch.QueueDeclare(
		"tasks",
		true,   // durable: queue survives restart
		false,  // autoDelete: don't delete when consumers disconnect
		false,  // exclusive: can be accessed by other connections
		false,  // noWait: wait for confirmation
		nil,    // args: no additional arguments
	)
	if err != nil {
		return err
	}

	// Queue with message TTL - messages expire after 60 seconds
	_, err = ch.QueueDeclare(
		"short_lived_tasks",
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-message-ttl": int32(60000), // TTL in milliseconds
		},
	)
	if err != nil {
		return err
	}

	// Queue with max length - oldest messages dropped when limit reached
	_, err = ch.QueueDeclare(
		"bounded_queue",
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-max-length":         int32(10000),    // max 10000 messages
			"x-overflow":           "drop-head",     // drop oldest when full
		},
	)
	if err != nil {
		return err
	}

	// Priority queue - messages with higher priority consumed first
	_, err = ch.QueueDeclare(
		"priority_tasks",
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-max-priority": int32(10), // priority levels 0-10
		},
	)

	return err
}

func publishWithPriority(ch *amqp.Channel, message string, priority uint8) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	return ch.PublishWithContext(
		ctx,
		"",              // default exchange
		"priority_tasks",
		false,
		false,
		amqp.Publishing{
			ContentType:  "text/plain",
			Body:         []byte(message),
			Priority:     priority, // 0-10, higher = more urgent
			DeliveryMode: amqp.Persistent,
		},
	)
}
```

## Publishing Messages with Confirmations

Publisher confirms ensure messages reach RabbitMQ. Without confirms, you cannot know if a message was successfully received.

```go
package main

import (
	"context"
	"errors"
	"log"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// Publisher handles reliable message publishing with confirmations
type Publisher struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	mu      sync.Mutex
}

func NewPublisher(url string) (*Publisher, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	// Enable publisher confirms on this channel
	// This is required before publishing with confirmation
	if err := ch.Confirm(false); err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	return &Publisher{
		conn:    conn,
		channel: ch,
	}, nil
}

// PublishWithConfirm publishes a message and waits for broker confirmation
func (p *Publisher) PublishWithConfirm(ctx context.Context, exchange, routingKey string, body []byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Create a confirmation listener for this publish
	// DeferredConfirmation allows async waiting for the confirm
	confirmation, err := p.channel.PublishWithDeferredConfirmWithContext(
		ctx,
		exchange,
		routingKey,
		false, // mandatory
		false, // immediate
		amqp.Publishing{
			ContentType:  "application/json",
			Body:         body,
			DeliveryMode: amqp.Persistent,
			Timestamp:    time.Now(),
			MessageId:    generateMessageID(), // unique identifier for tracking
		},
	)
	if err != nil {
		return err
	}

	// Wait for confirmation with timeout
	// This blocks until RabbitMQ confirms receipt
	select {
	case <-ctx.Done():
		return ctx.Err()
	default:
		confirmed, err := confirmation.WaitContext(ctx)
		if err != nil {
			return err
		}
		if !confirmed {
			return errors.New("message was nacked by broker")
		}
	}

	return nil
}

// PublishBatch publishes multiple messages and confirms them efficiently
func (p *Publisher) PublishBatch(ctx context.Context, exchange, routingKey string, messages [][]byte) error {
	p.mu.Lock()
	defer p.mu.Unlock()

	// Collect all deferred confirmations
	confirmations := make([]*amqp.DeferredConfirmation, 0, len(messages))

	// Publish all messages first
	for _, body := range messages {
		confirmation, err := p.channel.PublishWithDeferredConfirmWithContext(
			ctx,
			exchange,
			routingKey,
			false,
			false,
			amqp.Publishing{
				ContentType:  "application/json",
				Body:         body,
				DeliveryMode: amqp.Persistent,
			},
		)
		if err != nil {
			return err
		}
		confirmations = append(confirmations, confirmation)
	}

	// Wait for all confirmations
	for i, confirmation := range confirmations {
		confirmed, err := confirmation.WaitContext(ctx)
		if err != nil {
			return err
		}
		if !confirmed {
			return errors.New("message " + string(rune(i)) + " was nacked")
		}
	}

	return nil
}

func (p *Publisher) Close() {
	p.channel.Close()
	p.conn.Close()
}

func generateMessageID() string {
	return time.Now().Format("20060102150405.000000000")
}
```

## Consuming Messages with Acknowledgments

Proper acknowledgment handling ensures messages are not lost and failed messages can be retried.

```go
package main

import (
	"context"
	"encoding/json"
	"log"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// MessageHandler processes a single message
type MessageHandler func(body []byte) error

// Consumer handles reliable message consumption
type Consumer struct {
	conn    *amqp.Connection
	channel *amqp.Channel
	queue   string
	handler MessageHandler
}

func NewConsumer(url, queue string, handler MessageHandler) (*Consumer, error) {
	conn, err := amqp.Dial(url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	// Set prefetch count - limits unacknowledged messages per consumer
	// This enables fair dispatch and prevents memory issues
	err = ch.Qos(
		10,    // prefetch count: process 10 messages at a time
		0,     // prefetch size: no limit
		false, // global: apply per-consumer, not per-channel
	)
	if err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	return &Consumer{
		conn:    conn,
		channel: ch,
		queue:   queue,
		handler: handler,
	}, nil
}

// Start begins consuming messages from the queue
func (c *Consumer) Start(ctx context.Context) error {
	// Register as a consumer
	// autoAck=false means we manually acknowledge messages
	deliveries, err := c.channel.Consume(
		c.queue,
		"",    // consumer tag (auto-generated if empty)
		false, // autoAck: we will manually ack
		false, // exclusive: allow other consumers
		false, // noLocal: not supported by RabbitMQ
		false, // noWait: wait for confirmation
		nil,   // args
	)
	if err != nil {
		return err
	}

	log.Printf("Consumer started, waiting for messages on queue: %s", c.queue)

	for {
		select {
		case <-ctx.Done():
			log.Println("Consumer shutting down...")
			return ctx.Err()

		case delivery, ok := <-deliveries:
			if !ok {
				log.Println("Delivery channel closed")
				return nil
			}

			c.processDelivery(delivery)
		}
	}
}

func (c *Consumer) processDelivery(delivery amqp.Delivery) {
	log.Printf("Received message: %s", delivery.MessageId)

	// Process the message
	err := c.handler(delivery.Body)

	if err != nil {
		log.Printf("Error processing message: %v", err)

		// Check if we should retry
		retryCount := getRetryCount(delivery.Headers)

		if retryCount < 3 {
			// Reject and requeue for retry
			// Message goes back to the queue
			log.Printf("Requeueing message (retry %d/3)", retryCount+1)
			delivery.Nack(false, true) // multiple=false, requeue=true
		} else {
			// Max retries exceeded, reject without requeue
			// Message goes to dead letter queue if configured
			log.Printf("Max retries exceeded, rejecting message")
			delivery.Reject(false) // requeue=false
		}
		return
	}

	// Success - acknowledge the message
	// This removes it from the queue
	if err := delivery.Ack(false); err != nil {
		log.Printf("Failed to ack message: %v", err)
	}
}

func getRetryCount(headers amqp.Table) int {
	if headers == nil {
		return 0
	}
	if deaths, ok := headers["x-death"].([]interface{}); ok && len(deaths) > 0 {
		if death, ok := deaths[0].(amqp.Table); ok {
			if count, ok := death["count"].(int64); ok {
				return int(count)
			}
		}
	}
	return 0
}

func (c *Consumer) Close() {
	c.channel.Close()
	c.conn.Close()
}

// Example usage with a JSON message handler
type OrderMessage struct {
	OrderID   string    `json:"order_id"`
	CustomerID string   `json:"customer_id"`
	Amount    float64   `json:"amount"`
	CreatedAt time.Time `json:"created_at"`
}

func orderHandler(body []byte) error {
	var order OrderMessage
	if err := json.Unmarshal(body, &order); err != nil {
		return err
	}

	log.Printf("Processing order %s for customer %s, amount: $%.2f",
		order.OrderID, order.CustomerID, order.Amount)

	// Simulate processing
	time.Sleep(100 * time.Millisecond)

	return nil
}
```

## Dead Letter Queues

Dead letter queues capture messages that cannot be processed, enabling debugging and reprocessing.

```go
package main

import (
	"log"

	amqp "github.com/rabbitmq/amqp091-go"
)

// SetupDeadLetterQueue configures a main queue with dead letter routing
func SetupDeadLetterQueue(ch *amqp.Channel) error {
	// First, declare the dead letter exchange
	// This receives messages that are rejected, expired, or exceed queue length
	err := ch.ExchangeDeclare(
		"dlx",      // dead letter exchange name
		"direct",   // type
		true,       // durable
		false,      // auto-delete
		false,      // internal
		false,      // no-wait
		nil,        // args
	)
	if err != nil {
		return err
	}

	// Declare the dead letter queue
	// Failed messages end up here for inspection or reprocessing
	_, err = ch.QueueDeclare(
		"orders_dlq",  // dead letter queue name
		true,          // durable
		false,         // auto-delete
		false,         // exclusive
		false,         // no-wait
		nil,           // args
	)
	if err != nil {
		return err
	}

	// Bind dead letter queue to dead letter exchange
	err = ch.QueueBind(
		"orders_dlq",
		"orders",      // routing key matches original queue name
		"dlx",
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Now declare the main queue with dead letter configuration
	// When messages are rejected (requeue=false) or expire, they go to dlx
	_, err = ch.QueueDeclare(
		"orders",
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-dead-letter-exchange":    "dlx",    // send to this exchange on death
			"x-dead-letter-routing-key": "orders", // use this routing key
			"x-message-ttl":             int32(300000), // optional: 5 min TTL
		},
	)

	return err
}

// SetupRetryWithBackoff creates a delay queue pattern for retry with backoff
func SetupRetryWithBackoff(ch *amqp.Channel) error {
	// Create a delay exchange - messages go here when they need to wait
	err := ch.ExchangeDeclare(
		"retry_exchange",
		"direct",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		return err
	}

	// Create delay queues with different TTLs
	// Messages wait here, then return to main queue
	delays := []struct {
		name     string
		ttl      int32
		routeKey string
	}{
		{"retry_1s", 1000, "retry.1s"},
		{"retry_5s", 5000, "retry.5s"},
		{"retry_30s", 30000, "retry.30s"},
		{"retry_60s", 60000, "retry.60s"},
	}

	for _, delay := range delays {
		// Delay queue - messages sit here until TTL expires
		_, err := ch.QueueDeclare(
			delay.name,
			true,
			false,
			false,
			false,
			amqp.Table{
				"x-message-ttl":             delay.ttl,
				"x-dead-letter-exchange":    "",        // default exchange
				"x-dead-letter-routing-key": "orders",  // back to main queue
			},
		)
		if err != nil {
			return err
		}

		// Bind delay queue to retry exchange
		err = ch.QueueBind(
			delay.name,
			delay.routeKey,
			"retry_exchange",
			false,
			nil,
		)
		if err != nil {
			return err
		}
	}

	log.Println("Retry queues with backoff configured")
	return nil
}

// RequeueWithDelay sends a failed message to a delay queue
func RequeueWithDelay(ch *amqp.Channel, delivery amqp.Delivery, retryCount int) error {
	// Select delay based on retry count (exponential backoff)
	var routingKey string
	switch {
	case retryCount <= 1:
		routingKey = "retry.1s"
	case retryCount == 2:
		routingKey = "retry.5s"
	case retryCount == 3:
		routingKey = "retry.30s"
	default:
		routingKey = "retry.60s"
	}

	// Update retry count in headers
	headers := delivery.Headers
	if headers == nil {
		headers = amqp.Table{}
	}
	headers["x-retry-count"] = int32(retryCount)

	// Publish to delay queue
	return ch.Publish(
		"retry_exchange",
		routingKey,
		false,
		false,
		amqp.Publishing{
			ContentType:  delivery.ContentType,
			Body:         delivery.Body,
			Headers:      headers,
			DeliveryMode: amqp.Persistent,
		},
	)
}
```

## Connection Recovery Patterns

Network issues and broker restarts are inevitable. Proper recovery ensures your application stays resilient.

```go
package main

import (
	"context"
	"log"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

// ResilientConnection manages automatic reconnection to RabbitMQ
type ResilientConnection struct {
	url             string
	conn            *amqp.Connection
	channel         *amqp.Channel
	mu              sync.RWMutex
	notifyClose     chan *amqp.Error
	notifyChanClose chan *amqp.Error
	isReady         bool
	done            chan struct{}
	reconnectDelay  time.Duration
	maxReconnect    int
}

func NewResilientConnection(url string) *ResilientConnection {
	rc := &ResilientConnection{
		url:            url,
		done:           make(chan struct{}),
		reconnectDelay: time.Second,
		maxReconnect:   5,
	}
	go rc.handleReconnect()
	return rc
}

// handleReconnect waits for connection errors and reconnects
func (rc *ResilientConnection) handleReconnect() {
	for {
		rc.mu.Lock()
		rc.isReady = false
		rc.mu.Unlock()

		log.Println("Attempting to connect to RabbitMQ...")

		conn, err := rc.connect()
		if err != nil {
			log.Printf("Failed to connect: %v. Retrying...", err)
			select {
			case <-rc.done:
				return
			case <-time.After(rc.reconnectDelay):
				continue
			}
		}

		// Setup complete, mark as ready
		rc.mu.Lock()
		rc.conn = conn
		rc.isReady = true
		rc.mu.Unlock()

		log.Println("Connected to RabbitMQ successfully")

		// Wait for connection to close
		select {
		case <-rc.done:
			return
		case err := <-rc.notifyClose:
			if err != nil {
				log.Printf("Connection closed: %v. Reconnecting...", err)
			}
		case err := <-rc.notifyChanClose:
			if err != nil {
				log.Printf("Channel closed: %v. Reconnecting...", err)
			}
		}
	}
}

func (rc *ResilientConnection) connect() (*amqp.Connection, error) {
	conn, err := amqp.Dial(rc.url)
	if err != nil {
		return nil, err
	}

	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return nil, err
	}

	// Enable confirms
	if err := ch.Confirm(false); err != nil {
		ch.Close()
		conn.Close()
		return nil, err
	}

	// Set up notification channels
	rc.notifyClose = make(chan *amqp.Error, 1)
	rc.notifyChanClose = make(chan *amqp.Error, 1)
	conn.NotifyClose(rc.notifyClose)
	ch.NotifyClose(rc.notifyChanClose)

	rc.mu.Lock()
	rc.channel = ch
	rc.mu.Unlock()

	return conn, nil
}

// Channel returns the current channel, waiting if not ready
func (rc *ResilientConnection) Channel() (*amqp.Channel, error) {
	// Wait for connection with timeout
	timeout := time.After(30 * time.Second)
	for {
		rc.mu.RLock()
		if rc.isReady && rc.channel != nil {
			ch := rc.channel
			rc.mu.RUnlock()
			return ch, nil
		}
		rc.mu.RUnlock()

		select {
		case <-timeout:
			return nil, amqp.ErrClosed
		case <-time.After(100 * time.Millisecond):
			continue
		}
	}
}

// Publish sends a message with automatic retry on failure
func (rc *ResilientConnection) Publish(ctx context.Context, exchange, key string, body []byte) error {
	var lastErr error

	for attempt := 0; attempt < rc.maxReconnect; attempt++ {
		ch, err := rc.Channel()
		if err != nil {
			lastErr = err
			time.Sleep(rc.reconnectDelay)
			continue
		}

		confirmation, err := ch.PublishWithDeferredConfirmWithContext(
			ctx,
			exchange,
			key,
			false,
			false,
			amqp.Publishing{
				ContentType:  "application/json",
				Body:         body,
				DeliveryMode: amqp.Persistent,
			},
		)
		if err != nil {
			lastErr = err
			log.Printf("Publish failed (attempt %d): %v", attempt+1, err)
			time.Sleep(rc.reconnectDelay)
			continue
		}

		// Wait for confirmation
		confirmed, err := confirmation.WaitContext(ctx)
		if err != nil {
			lastErr = err
			continue
		}
		if !confirmed {
			lastErr = amqp.ErrClosed
			continue
		}

		return nil
	}

	return lastErr
}

func (rc *ResilientConnection) Close() {
	close(rc.done)
	rc.mu.Lock()
	defer rc.mu.Unlock()
	if rc.channel != nil {
		rc.channel.Close()
	}
	if rc.conn != nil {
		rc.conn.Close()
	}
}
```

## Complete Example: Order Processing System

Here is a complete example that ties together all the concepts for a production-ready order processing system.

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

	amqp "github.com/rabbitmq/amqp091-go"
)

// Order represents an order to be processed
type Order struct {
	ID         string    `json:"id"`
	CustomerID string    `json:"customer_id"`
	Items      []Item    `json:"items"`
	Total      float64   `json:"total"`
	CreatedAt  time.Time `json:"created_at"`
}

type Item struct {
	ProductID string  `json:"product_id"`
	Quantity  int     `json:"quantity"`
	Price     float64 `json:"price"`
}

// OrderProcessor handles the complete order processing pipeline
type OrderProcessor struct {
	conn    *ResilientConnection
	ctx     context.Context
	cancel  context.CancelFunc
}

func NewOrderProcessor(url string) (*OrderProcessor, error) {
	ctx, cancel := context.WithCancel(context.Background())

	rc := NewResilientConnection(url)

	// Wait for initial connection
	time.Sleep(2 * time.Second)

	op := &OrderProcessor{
		conn:   rc,
		ctx:    ctx,
		cancel: cancel,
	}

	if err := op.setupQueues(); err != nil {
		cancel()
		rc.Close()
		return nil, err
	}

	return op, nil
}

func (op *OrderProcessor) setupQueues() error {
	ch, err := op.conn.Channel()
	if err != nil {
		return err
	}

	// Setup dead letter exchange
	if err := ch.ExchangeDeclare("orders_dlx", "direct", true, false, false, false, nil); err != nil {
		return err
	}

	// Dead letter queue
	if _, err := ch.QueueDeclare("orders_dlq", true, false, false, false, nil); err != nil {
		return err
	}

	if err := ch.QueueBind("orders_dlq", "orders", "orders_dlx", false, nil); err != nil {
		return err
	}

	// Main orders queue with DLQ configuration
	_, err = ch.QueueDeclare(
		"orders",
		true,
		false,
		false,
		false,
		amqp.Table{
			"x-dead-letter-exchange":    "orders_dlx",
			"x-dead-letter-routing-key": "orders",
		},
	)
	if err != nil {
		return err
	}

	// Notifications fanout for order events
	if err := ch.ExchangeDeclare("order_events", "fanout", true, false, false, false, nil); err != nil {
		return err
	}

	log.Println("Queues and exchanges configured successfully")
	return nil
}

// SubmitOrder publishes a new order for processing
func (op *OrderProcessor) SubmitOrder(order Order) error {
	order.CreatedAt = time.Now()

	body, err := json.Marshal(order)
	if err != nil {
		return err
	}

	ctx, cancel := context.WithTimeout(op.ctx, 10*time.Second)
	defer cancel()

	return op.conn.Publish(ctx, "", "orders", body)
}

// StartConsumer begins processing orders from the queue
func (op *OrderProcessor) StartConsumer(workerID int) {
	log.Printf("Worker %d starting...", workerID)

	for {
		select {
		case <-op.ctx.Done():
			log.Printf("Worker %d shutting down", workerID)
			return
		default:
		}

		ch, err := op.conn.Channel()
		if err != nil {
			log.Printf("Worker %d: failed to get channel: %v", workerID, err)
			time.Sleep(time.Second)
			continue
		}

		// Set QoS
		ch.Qos(5, 0, false)

		deliveries, err := ch.Consume("orders", "", false, false, false, false, nil)
		if err != nil {
			log.Printf("Worker %d: failed to start consuming: %v", workerID, err)
			time.Sleep(time.Second)
			continue
		}

		op.consumeLoop(workerID, deliveries, ch)
	}
}

func (op *OrderProcessor) consumeLoop(workerID int, deliveries <-chan amqp.Delivery, ch *amqp.Channel) {
	for {
		select {
		case <-op.ctx.Done():
			return

		case delivery, ok := <-deliveries:
			if !ok {
				log.Printf("Worker %d: delivery channel closed", workerID)
				return
			}

			op.processOrder(workerID, delivery, ch)
		}
	}
}

func (op *OrderProcessor) processOrder(workerID int, delivery amqp.Delivery, ch *amqp.Channel) {
	var order Order
	if err := json.Unmarshal(delivery.Body, &order); err != nil {
		log.Printf("Worker %d: failed to parse order: %v", workerID, err)
		delivery.Reject(false) // Send to DLQ
		return
	}

	log.Printf("Worker %d: processing order %s (total: $%.2f)", workerID, order.ID, order.Total)

	// Simulate processing
	time.Sleep(500 * time.Millisecond)

	// Publish order processed event
	event := map[string]interface{}{
		"event":      "order_processed",
		"order_id":   order.ID,
		"worker_id":  workerID,
		"processed_at": time.Now(),
	}
	eventBody, _ := json.Marshal(event)

	ch.Publish("order_events", "", false, false, amqp.Publishing{
		ContentType: "application/json",
		Body:        eventBody,
	})

	// Acknowledge successful processing
	if err := delivery.Ack(false); err != nil {
		log.Printf("Worker %d: failed to ack: %v", workerID, err)
	}

	log.Printf("Worker %d: order %s completed", workerID, order.ID)
}

func (op *OrderProcessor) Shutdown() {
	op.cancel()
	op.conn.Close()
}

func main() {
	url := os.Getenv("RABBITMQ_URL")
	if url == "" {
		url = "amqp://guest:guest@localhost:5672/"
	}

	processor, err := NewOrderProcessor(url)
	if err != nil {
		log.Fatalf("Failed to create order processor: %v", err)
	}

	// Start multiple workers
	numWorkers := 3
	for i := 1; i <= numWorkers; i++ {
		go processor.StartConsumer(i)
	}

	// Submit some test orders
	go func() {
		time.Sleep(2 * time.Second)
		for i := 0; i < 10; i++ {
			order := Order{
				ID:         time.Now().Format("20060102150405") + "-" + string(rune('A'+i)),
				CustomerID: "CUST-001",
				Items: []Item{
					{ProductID: "PROD-001", Quantity: 2, Price: 29.99},
				},
				Total: 59.98,
			}
			if err := processor.SubmitOrder(order); err != nil {
				log.Printf("Failed to submit order: %v", err)
			}
			time.Sleep(200 * time.Millisecond)
		}
	}()

	// Wait for shutdown signal
	sigChan := make(chan os.Signal, 1)
	signal.Notify(sigChan, syscall.SIGINT, syscall.SIGTERM)
	<-sigChan

	log.Println("Shutting down...")
	processor.Shutdown()
	log.Println("Shutdown complete")
}
```

## Best Practices Summary

When working with RabbitMQ in Go, keep these practices in mind:

1. **Always use publisher confirms** for critical messages to ensure delivery guarantees.

2. **Set appropriate prefetch counts** to balance throughput and memory usage. Start with 10-20 and tune based on your workload.

3. **Implement connection recovery** using notification channels and automatic reconnection logic.

4. **Use dead letter queues** for messages that fail processing to enable debugging and reprocessing.

5. **Make messages persistent** (DeliveryMode: 2) for durability across broker restarts.

6. **Handle acknowledgments properly** - only ack after successful processing and use nack/reject appropriately.

7. **Use separate channels for publishing and consuming** to avoid blocking issues.

8. **Implement graceful shutdown** to finish processing in-flight messages before closing connections.

9. **Monitor queue depths** and consumer counts to detect backpressure early.

10. **Use meaningful routing keys** that allow for flexible message routing as your system evolves.

## Conclusion

Building reliable message-driven systems with RabbitMQ and Go requires understanding the core AMQP concepts and implementing proper error handling. The amqp091-go library provides all the tools needed for production-grade messaging.

Start with simple direct exchanges and queues, then expand to topic or fanout patterns as your needs grow. Always implement publisher confirms, proper acknowledgments, and dead letter queues from the beginning - retrofitting reliability is much harder than building it in from the start.

With the patterns shown in this guide, you can build resilient, scalable messaging systems that handle failures gracefully and keep your distributed applications communicating reliably.
