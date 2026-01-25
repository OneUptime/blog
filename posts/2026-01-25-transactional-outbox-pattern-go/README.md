# How to Implement the Transactional Outbox Pattern in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Outbox Pattern, Distributed Systems, Database, Messaging

Description: Learn how to implement the transactional outbox pattern in Go to guarantee reliable message delivery between your database and message broker without distributed transactions.

---

If you have ever lost messages between your database and message broker, you know the pain. A user places an order, your service writes to the database, then tries to publish an event to Kafka or RabbitMQ - and the publish fails. Now your database says the order exists, but downstream services never heard about it. The transactional outbox pattern solves this problem elegantly, and Go makes it straightforward to implement.

## The Problem: Dual Writes Are Dangerous

Consider this common scenario:

```go
func CreateOrder(ctx context.Context, order Order) error {
    // Step 1: Save to database
    err := db.CreateOrder(ctx, order)
    if err != nil {
        return err
    }

    // Step 2: Publish event to message broker
    // What if this fails? The order exists but no event was sent.
    err = broker.Publish(ctx, "orders", OrderCreatedEvent{OrderID: order.ID})
    if err != nil {
        // Too late - the order is already committed
        return err
    }

    return nil
}
```

This is a dual write problem. You are writing to two systems (database and message broker) without transactional guarantees across both. If step 2 fails, you have inconsistent state. Rolling back the database insert after a publish failure is also risky - what if the rollback fails?

## The Solution: Outbox Table

The transactional outbox pattern uses a simple idea: instead of publishing directly to the message broker, write the event to an outbox table in the same database transaction as your business data. A separate process then reads from the outbox and publishes to the message broker.

Since the business data and the outbox record are written in the same transaction, they either both succeed or both fail. No more lost messages.

## Setting Up the Outbox Table

First, create the outbox table in PostgreSQL:

```sql
CREATE TABLE outbox (
    id BIGSERIAL PRIMARY KEY,
    aggregate_type VARCHAR(255) NOT NULL,
    aggregate_id VARCHAR(255) NOT NULL,
    event_type VARCHAR(255) NOT NULL,
    payload JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE
);

CREATE INDEX idx_outbox_unprocessed ON outbox (created_at)
    WHERE processed_at IS NULL;
```

The `processed_at` column tracks which messages have been published. The partial index makes it efficient to query only unprocessed messages.

## Defining the Outbox Message

In Go, define a struct for outbox messages:

```go
package outbox

import (
    "encoding/json"
    "time"
)

type Message struct {
    ID            int64           `db:"id"`
    AggregateType string          `db:"aggregate_type"`
    AggregateID   string          `db:"aggregate_id"`
    EventType     string          `db:"event_type"`
    Payload       json.RawMessage `db:"payload"`
    CreatedAt     time.Time       `db:"created_at"`
    ProcessedAt   *time.Time      `db:"processed_at"`
}

// NewMessage creates an outbox message from any payload
func NewMessage(aggregateType, aggregateID, eventType string, payload any) (*Message, error) {
    data, err := json.Marshal(payload)
    if err != nil {
        return nil, err
    }

    return &Message{
        AggregateType: aggregateType,
        AggregateID:   aggregateID,
        EventType:     eventType,
        Payload:       data,
        CreatedAt:     time.Now(),
    }, nil
}
```

## Writing to the Outbox in a Transaction

Here is the critical part - writing your business data and the outbox message in a single transaction:

```go
package orders

import (
    "context"
    "database/sql"

    "yourapp/outbox"
)

type Repository struct {
    db *sql.DB
}

func (r *Repository) CreateOrder(ctx context.Context, order Order) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    // Insert the order
    _, err = tx.ExecContext(ctx, `
        INSERT INTO orders (id, customer_id, total, status, created_at)
        VALUES ($1, $2, $3, $4, $5)
    `, order.ID, order.CustomerID, order.Total, order.Status, order.CreatedAt)
    if err != nil {
        return err
    }

    // Create the outbox message
    event := OrderCreatedEvent{
        OrderID:    order.ID,
        CustomerID: order.CustomerID,
        Total:      order.Total,
    }

    msg, err := outbox.NewMessage("order", order.ID, "order.created", event)
    if err != nil {
        return err
    }

    // Insert into outbox in the same transaction
    _, err = tx.ExecContext(ctx, `
        INSERT INTO outbox (aggregate_type, aggregate_id, event_type, payload, created_at)
        VALUES ($1, $2, $3, $4, $5)
    `, msg.AggregateType, msg.AggregateID, msg.EventType, msg.Payload, msg.CreatedAt)
    if err != nil {
        return err
    }

    // Both writes succeed or both fail
    return tx.Commit()
}
```

Now if anything fails, the entire transaction rolls back. No orphaned orders, no lost events.

## The Outbox Relay: Publishing Messages

The relay is a background process that polls the outbox table and publishes messages to your broker. Here is a basic implementation:

```go
package outbox

import (
    "context"
    "database/sql"
    "log"
    "time"
)

type Publisher interface {
    Publish(ctx context.Context, topic string, key string, value []byte) error
}

type Relay struct {
    db        *sql.DB
    publisher Publisher
    batchSize int
    interval  time.Duration
}

func NewRelay(db *sql.DB, publisher Publisher) *Relay {
    return &Relay{
        db:        db,
        publisher: publisher,
        batchSize: 100,
        interval:  time.Second,
    }
}

func (r *Relay) Start(ctx context.Context) {
    ticker := time.NewTicker(r.interval)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-ticker.C:
            if err := r.processBatch(ctx); err != nil {
                log.Printf("outbox relay error: %v", err)
            }
        }
    }
}

func (r *Relay) processBatch(ctx context.Context) error {
    // Fetch unprocessed messages
    rows, err := r.db.QueryContext(ctx, `
        SELECT id, aggregate_type, aggregate_id, event_type, payload
        FROM outbox
        WHERE processed_at IS NULL
        ORDER BY created_at
        LIMIT $1
        FOR UPDATE SKIP LOCKED
    `, r.batchSize)
    if err != nil {
        return err
    }
    defer rows.Close()

    var messages []Message
    for rows.Next() {
        var m Message
        if err := rows.Scan(&m.ID, &m.AggregateType, &m.AggregateID,
                           &m.EventType, &m.Payload); err != nil {
            return err
        }
        messages = append(messages, m)
    }

    // Publish each message
    for _, msg := range messages {
        topic := msg.AggregateType + "-events"

        if err := r.publisher.Publish(ctx, topic, msg.AggregateID, msg.Payload); err != nil {
            log.Printf("failed to publish message %d: %v", msg.ID, err)
            continue
        }

        // Mark as processed
        _, err := r.db.ExecContext(ctx, `
            UPDATE outbox SET processed_at = NOW() WHERE id = $1
        `, msg.ID)
        if err != nil {
            log.Printf("failed to mark message %d as processed: %v", msg.ID, err)
        }
    }

    return nil
}
```

The `FOR UPDATE SKIP LOCKED` clause is important. It allows multiple relay instances to run concurrently without processing the same messages. Each instance locks rows it is working on, and others skip those locked rows.

## Handling Failures and Retries

What happens if the relay crashes after publishing but before marking a message as processed? The message gets published again when the relay restarts. This is why your consumers must be idempotent - they need to handle duplicate messages gracefully.

You can add retry logic with exponential backoff for failed publishes:

```go
func (r *Relay) publishWithRetry(ctx context.Context, msg Message) error {
    maxRetries := 3
    backoff := time.Second

    for attempt := 0; attempt < maxRetries; attempt++ {
        err := r.publisher.Publish(ctx, msg.AggregateType+"-events",
                                   msg.AggregateID, msg.Payload)
        if err == nil {
            return nil
        }

        log.Printf("publish attempt %d failed: %v", attempt+1, err)

        select {
        case <-ctx.Done():
            return ctx.Err()
        case <-time.After(backoff):
            backoff *= 2
        }
    }

    return fmt.Errorf("failed after %d retries", maxRetries)
}
```

## Cleanup: Pruning Old Messages

Over time, the outbox table grows. Add a cleanup job to remove old processed messages:

```go
func (r *Relay) Cleanup(ctx context.Context, retention time.Duration) error {
    cutoff := time.Now().Add(-retention)

    result, err := r.db.ExecContext(ctx, `
        DELETE FROM outbox
        WHERE processed_at IS NOT NULL
          AND processed_at < $1
    `, cutoff)
    if err != nil {
        return err
    }

    deleted, _ := result.RowsAffected()
    log.Printf("cleaned up %d old outbox messages", deleted)
    return nil
}
```

Run this periodically - once a day is usually enough. A 7-day retention gives you time to debug issues while keeping the table manageable.

## Why This Works

The transactional outbox pattern trades the complexity of distributed transactions for eventual consistency with guaranteed delivery. Your messages will reach the broker, though there may be a slight delay. For most systems, this tradeoff is excellent.

The pattern also decouples your application from the message broker's availability. If Kafka is down, your service keeps accepting requests. Messages queue up in the outbox and flow out once the broker recovers.

## When to Use This Pattern

Use the transactional outbox when:

- You need guaranteed message delivery from database changes
- Your message broker does not support transactions with your database
- You want to decouple your application from broker availability
- You are building event-driven microservices

Skip it when your use case tolerates occasional lost messages, or when you can use a database that supports native change data capture.

The transactional outbox pattern has been battle-tested at companies like Shopify and Segment. It is a reliable foundation for event-driven architectures, and Go's concurrency primitives make the relay implementation clean and efficient.
