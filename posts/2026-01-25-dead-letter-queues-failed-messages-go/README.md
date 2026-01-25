# How to Handle Failed Messages with Dead Letter Queues in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Dead Letter Queue, Message Queue, Error Handling, Reliability

Description: Learn how to implement dead letter queues in Go to handle failed messages gracefully, prevent message loss, and build more resilient message-driven applications.

---

Message queues are the backbone of distributed systems. They decouple services, smooth out traffic spikes, and enable asynchronous processing. But what happens when a message fails to process? Maybe the payload is malformed, a downstream service is unavailable, or the handler throws an unexpected error. Without proper handling, that message could be lost forever or worse - stuck in an infinite retry loop that brings your system to its knees.

This is where dead letter queues come in. A dead letter queue (DLQ) is a separate queue that catches messages that cannot be processed successfully. Instead of losing the message or retrying indefinitely, you move it to the DLQ for later inspection, debugging, or reprocessing.

## The Problem with Failed Messages

Consider a payment processing service that consumes messages from a queue. Each message contains an order ID and payment details. Most messages process fine, but occasionally one fails:

- The order ID does not exist in the database
- The payment gateway returns an unexpected error
- The message JSON is corrupted
- A race condition causes a constraint violation

Without a DLQ, you have limited options. You can acknowledge the message and lose it. You can negative-acknowledge and let the broker redeliver it, which may create an infinite loop. Or you can crash the consumer, which blocks all other messages behind it.

None of these options are good. A DLQ gives you a fourth option: move the problematic message aside and keep processing.

## Basic DLQ Implementation

Let's build a simple DLQ system. The core idea is straightforward - wrap your message handler with retry logic, and when retries are exhausted, push to a DLQ.

First, define the types we need:

```go
package dlq

import (
    "context"
    "encoding/json"
    "fmt"
    "time"
)

// Message represents a message from the queue
type Message struct {
    ID        string          `json:"id"`
    Payload   json.RawMessage `json:"payload"`
    Timestamp time.Time       `json:"timestamp"`
    Retries   int             `json:"retries"`
}

// DeadLetter wraps a failed message with error information
type DeadLetter struct {
    OriginalMessage Message   `json:"original_message"`
    Error           string    `json:"error"`
    FailedAt        time.Time `json:"failed_at"`
    ConsumerID      string    `json:"consumer_id"`
}

// Handler processes a message and returns an error if it fails
type Handler func(ctx context.Context, msg Message) error

// Queue interface abstracts the underlying message broker
type Queue interface {
    Publish(ctx context.Context, msg []byte) error
    Consume(ctx context.Context) (<-chan Message, error)
    Ack(ctx context.Context, msgID string) error
}
```

Now implement the processor that ties everything together:

```go
// Processor handles messages with DLQ support
type Processor struct {
    mainQueue   Queue
    dlq         Queue
    handler     Handler
    maxRetries  int
    consumerID  string
}

// NewProcessor creates a processor with DLQ support
func NewProcessor(main, dlq Queue, handler Handler, maxRetries int, consumerID string) *Processor {
    return &Processor{
        mainQueue:  main,
        dlq:        dlq,
        handler:    handler,
        maxRetries: maxRetries,
        consumerID: consumerID,
    }
}

// Start begins consuming messages
func (p *Processor) Start(ctx context.Context) error {
    messages, err := p.mainQueue.Consume(ctx)
    if err != nil {
        return fmt.Errorf("failed to start consuming: %w", err)
    }

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case msg := <-messages:
            p.processMessage(ctx, msg)
        }
    }
}

func (p *Processor) processMessage(ctx context.Context, msg Message) {
    // Try to process the message
    err := p.handler(ctx, msg)

    if err == nil {
        // Success - acknowledge the message
        if ackErr := p.mainQueue.Ack(ctx, msg.ID); ackErr != nil {
            // Log but don't fail - message will be redelivered
            fmt.Printf("failed to ack message %s: %v\n", msg.ID, ackErr)
        }
        return
    }

    // Handler failed - check retry count
    if msg.Retries >= p.maxRetries {
        // Max retries exceeded - send to DLQ
        p.sendToDLQ(ctx, msg, err)
        p.mainQueue.Ack(ctx, msg.ID)
        return
    }

    // Still have retries left - the message will be redelivered
    // by the broker after nack or timeout
    fmt.Printf("message %s failed (attempt %d/%d): %v\n",
        msg.ID, msg.Retries+1, p.maxRetries, err)
}

func (p *Processor) sendToDLQ(ctx context.Context, msg Message, handlerErr error) {
    deadLetter := DeadLetter{
        OriginalMessage: msg,
        Error:           handlerErr.Error(),
        FailedAt:        time.Now(),
        ConsumerID:      p.consumerID,
    }

    data, err := json.Marshal(deadLetter)
    if err != nil {
        fmt.Printf("failed to marshal dead letter: %v\n", err)
        return
    }

    if err := p.dlq.Publish(ctx, data); err != nil {
        fmt.Printf("failed to publish to DLQ: %v\n", err)
        // This is bad - we might lose the message
        // Consider writing to a local file as fallback
    }
}
```

## Adding Exponential Backoff

Immediate retries often fail for the same reason. Adding exponential backoff gives transient issues time to resolve.

```go
// RetryConfig controls retry behavior
type RetryConfig struct {
    MaxRetries     int
    InitialBackoff time.Duration
    MaxBackoff     time.Duration
    Multiplier     float64
}

// DefaultRetryConfig returns sensible defaults
func DefaultRetryConfig() RetryConfig {
    return RetryConfig{
        MaxRetries:     3,
        InitialBackoff: 100 * time.Millisecond,
        MaxBackoff:     30 * time.Second,
        Multiplier:     2.0,
    }
}

// ProcessWithBackoff wraps a handler with exponential backoff retry
func ProcessWithBackoff(ctx context.Context, msg Message, handler Handler, cfg RetryConfig) error {
    var lastErr error
    backoff := cfg.InitialBackoff

    for attempt := 0; attempt <= cfg.MaxRetries; attempt++ {
        // Wait before retry (skip on first attempt)
        if attempt > 0 {
            select {
            case <-ctx.Done():
                return ctx.Err()
            case <-time.After(backoff):
            }

            // Increase backoff for next attempt
            backoff = time.Duration(float64(backoff) * cfg.Multiplier)
            if backoff > cfg.MaxBackoff {
                backoff = cfg.MaxBackoff
            }
        }

        lastErr = handler(ctx, msg)
        if lastErr == nil {
            return nil
        }

        fmt.Printf("attempt %d failed: %v, backing off %v\n",
            attempt+1, lastErr, backoff)
    }

    return fmt.Errorf("all %d attempts failed, last error: %w",
        cfg.MaxRetries+1, lastErr)
}
```

## Classifying Errors

Not all errors deserve retries. A malformed message will fail every time. A database constraint violation will not fix itself. You should classify errors and skip retries for permanent failures.

```go
// ErrorType classifies whether an error is retryable
type ErrorType int

const (
    // Transient errors might succeed on retry
    Transient ErrorType = iota
    // Permanent errors will always fail
    Permanent
)

// ClassifiedError wraps an error with retry information
type ClassifiedError struct {
    Err  error
    Type ErrorType
}

func (e ClassifiedError) Error() string {
    return e.Err.Error()
}

// NewTransientError creates a retryable error
func NewTransientError(err error) ClassifiedError {
    return ClassifiedError{Err: err, Type: Transient}
}

// NewPermanentError creates a non-retryable error
func NewPermanentError(err error) ClassifiedError {
    return ClassifiedError{Err: err, Type: Permanent}
}

// IsRetryable checks if an error should be retried
func IsRetryable(err error) bool {
    if classified, ok := err.(ClassifiedError); ok {
        return classified.Type == Transient
    }
    // Default to retryable for unknown errors
    return true
}
```

Update your handler to use classified errors:

```go
func paymentHandler(ctx context.Context, msg Message) error {
    var payment PaymentRequest
    if err := json.Unmarshal(msg.Payload, &payment); err != nil {
        // Bad JSON will never succeed - permanent failure
        return NewPermanentError(fmt.Errorf("invalid payload: %w", err))
    }

    // Validate the payment
    if payment.Amount <= 0 {
        return NewPermanentError(fmt.Errorf("invalid amount: %d", payment.Amount))
    }

    // Call payment gateway
    err := processPayment(ctx, payment)
    if err != nil {
        // Gateway errors are usually transient
        return NewTransientError(fmt.Errorf("gateway error: %w", err))
    }

    return nil
}
```

## DLQ Consumer for Reprocessing

Messages in the DLQ need attention. You might fix a bug and want to replay them, or you might need to manually investigate. Here is a simple DLQ consumer that logs failed messages and optionally republishes them:

```go
// DLQConsumer processes dead letters
type DLQConsumer struct {
    dlq         Queue
    mainQueue   Queue
    onDeadLetter func(DeadLetter) Action
}

// Action determines what to do with a dead letter
type Action int

const (
    // Discard removes the message permanently
    Discard Action = iota
    // Retry republishes to the main queue
    Retry
    // Hold keeps the message in the DLQ
    Hold
)

// NewDLQConsumer creates a DLQ consumer
func NewDLQConsumer(dlq, main Queue, handler func(DeadLetter) Action) *DLQConsumer {
    return &DLQConsumer{
        dlq:          dlq,
        mainQueue:    main,
        onDeadLetter: handler,
    }
}

// Process handles dead letters based on the handler's decision
func (c *DLQConsumer) Process(ctx context.Context) error {
    messages, err := c.dlq.Consume(ctx)
    if err != nil {
        return err
    }

    for {
        select {
        case <-ctx.Done():
            return ctx.Err()
        case msg := <-messages:
            var dl DeadLetter
            if err := json.Unmarshal(msg.Payload, &dl); err != nil {
                fmt.Printf("invalid dead letter format: %v\n", err)
                c.dlq.Ack(ctx, msg.ID)
                continue
            }

            action := c.onDeadLetter(dl)

            switch action {
            case Discard:
                c.dlq.Ack(ctx, msg.ID)
            case Retry:
                // Reset retry count and republish
                dl.OriginalMessage.Retries = 0
                data, _ := json.Marshal(dl.OriginalMessage)
                c.mainQueue.Publish(ctx, data)
                c.dlq.Ack(ctx, msg.ID)
            case Hold:
                // Leave in DLQ for manual inspection
            }
        }
    }
}
```

## Best Practices

**Set appropriate TTLs.** Messages in the DLQ should not live forever. Set a time-to-live based on your SLAs. If nobody investigates a failed message in 30 days, it probably does not matter anymore.

**Monitor DLQ depth.** A growing DLQ indicates a problem. Set up alerts when the queue exceeds a threshold. If you normally have zero messages in the DLQ and suddenly have 1000, something is wrong.

**Include context in dead letters.** The more information you capture, the easier debugging becomes. Include the consumer ID, timestamp, all retry attempts, and the full error chain.

**Test your DLQ path.** It is easy to forget about error handling until production. Write tests that intentionally fail messages and verify they land in the DLQ correctly.

**Consider idempotency.** When you replay messages from the DLQ, they might be processed twice. Design your handlers to be idempotent so duplicate processing does not cause issues.

## Summary

Dead letter queues are essential for building reliable message-driven systems. They prevent message loss, stop infinite retry loops, and give you visibility into failures. The key components are:

- A wrapper that catches failed messages after max retries
- Error classification to distinguish permanent from transient failures
- Exponential backoff to handle transient issues
- A DLQ consumer for inspection and replay

Start simple with basic retry logic and a DLQ, then add sophistication as needed. The goal is not to prevent all failures - that is impossible. The goal is to handle failures gracefully so they do not cascade into larger problems.
