# How to Build Event-Driven Applications in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Event-Driven, Architecture, Events, Async, Patterns

Description: A practical guide to building event-driven applications in Go using channels, event buses, and message brokers.

---

## What is Event-Driven Architecture?

Event-driven architecture (EDA) is a design pattern where the flow of your program is determined by events - significant changes in state that other parts of your system care about. Instead of components calling each other directly, they communicate by emitting and reacting to events.

Think of it like a notification system. When something happens (a user signs up, an order is placed, a file is uploaded), an event is published. Other components that care about this event can subscribe to it and react accordingly - without the original component needing to know anything about them.

In traditional request-response architectures, component A calls component B, waits for a response, then calls component C. This creates tight coupling and makes the system harder to scale and modify. With event-driven architecture, component A simply says "this happened" and moves on. Components B and C independently decide whether they care about that event.

## Why Go is Great for Event-Driven Systems

Go has several features that make it particularly well-suited for event-driven applications:

**Goroutines and Channels**: Go's lightweight concurrency primitives are perfect for handling asynchronous event processing. You can spawn thousands of goroutines without significant overhead.

**Simple Concurrency Model**: The "share memory by communicating" philosophy aligns naturally with event-driven patterns.

**Strong Standard Library**: Go's standard library provides excellent support for networking, which is essential when integrating with message brokers.

**Performance**: Go's compiled nature and efficient runtime make it ideal for high-throughput event processing systems.

## Building an In-Process Event Bus

Let's start with a simple event bus that works within a single process. This pattern is useful for decoupling components in your application before you need distributed messaging.

First, define the basic types for your event system:

```go
package eventbus

import (
    "sync"
)

// Event represents something that happened in your system
type Event struct {
    Type    string
    Payload interface{}
    Time    int64
}

// Handler is a function that processes an event
type Handler func(Event)

// EventBus manages event subscriptions and publishing
type EventBus struct {
    handlers map[string][]Handler
    mu       sync.RWMutex
}

// New creates a new EventBus instance
func New() *EventBus {
    return &EventBus{
        handlers: make(map[string][]Handler),
    }
}
```

Now add the subscribe and publish methods:

```go
// Subscribe registers a handler for a specific event type
func (eb *EventBus) Subscribe(eventType string, handler Handler) {
    eb.mu.Lock()
    defer eb.mu.Unlock()
    
    eb.handlers[eventType] = append(eb.handlers[eventType], handler)
}

// Publish sends an event to all registered handlers
// Handlers are called in separate goroutines for async processing
func (eb *EventBus) Publish(event Event) {
    eb.mu.RLock()
    handlers := eb.handlers[event.Type]
    eb.mu.RUnlock()
    
    for _, handler := range handlers {
        // Run each handler in its own goroutine
        go handler(event)
    }
}

// PublishSync sends an event and waits for all handlers to complete
func (eb *EventBus) PublishSync(event Event) {
    eb.mu.RLock()
    handlers := eb.handlers[event.Type]
    eb.mu.RUnlock()
    
    var wg sync.WaitGroup
    for _, handler := range handlers {
        wg.Add(1)
        go func(h Handler) {
            defer wg.Done()
            h(event)
        }(handler)
    }
    wg.Wait()
}
```

## Using Channels for Event Streaming

For more control over event flow, you can use Go channels directly. This approach gives you backpressure handling and the ability to buffer events.

Create a channel-based event processor:

```go
package events

import (
    "context"
    "log"
)

// EventProcessor handles events from a channel
type EventProcessor struct {
    events chan Event
    done   chan struct{}
}

// NewProcessor creates a processor with a buffered channel
// bufferSize controls how many events can queue up before blocking
func NewProcessor(bufferSize int) *EventProcessor {
    return &EventProcessor{
        events: make(chan Event, bufferSize),
        done:   make(chan struct{}),
    }
}

// Start begins processing events with the given handler
func (p *EventProcessor) Start(ctx context.Context, handler Handler) {
    go func() {
        for {
            select {
            case event := <-p.events:
                handler(event)
            case <-ctx.Done():
                close(p.done)
                return
            }
        }
    }()
}

// Send queues an event for processing
// Returns false if the context is cancelled
func (p *EventProcessor) Send(ctx context.Context, event Event) bool {
    select {
    case p.events <- event:
        return true
    case <-ctx.Done():
        return false
    }
}

// Wait blocks until the processor stops
func (p *EventProcessor) Wait() {
    <-p.done
}
```

You can also fan out events to multiple workers for parallel processing:

```go
// StartWorkers spawns multiple goroutines to process events concurrently
func (p *EventProcessor) StartWorkers(ctx context.Context, handler Handler, numWorkers int) {
    for i := 0; i < numWorkers; i++ {
        go func(workerID int) {
            for {
                select {
                case event := <-p.events:
                    log.Printf("Worker %d processing event: %s", workerID, event.Type)
                    handler(event)
                case <-ctx.Done():
                    return
                }
            }
        }(i)
    }
}
```

## Event Sourcing Basics

Event sourcing takes the event-driven approach further by storing all changes to application state as a sequence of events. Instead of storing the current state, you store the events that led to that state.

Here is a simple event sourcing implementation for an account balance:

```go
package eventsourcing

import (
    "errors"
    "sync"
    "time"
)

// DomainEvent represents a change in the domain
type DomainEvent interface {
    EventType() string
    OccurredAt() time.Time
}

// AccountCreated is emitted when a new account is created
type AccountCreated struct {
    AccountID string
    Owner     string
    Timestamp time.Time
}

func (e AccountCreated) EventType() string    { return "AccountCreated" }
func (e AccountCreated) OccurredAt() time.Time { return e.Timestamp }

// MoneyDeposited is emitted when money is added to an account
type MoneyDeposited struct {
    AccountID string
    Amount    int64
    Timestamp time.Time
}

func (e MoneyDeposited) EventType() string    { return "MoneyDeposited" }
func (e MoneyDeposited) OccurredAt() time.Time { return e.Timestamp }

// MoneyWithdrawn is emitted when money is removed from an account
type MoneyWithdrawn struct {
    AccountID string
    Amount    int64
    Timestamp time.Time
}

func (e MoneyWithdrawn) EventType() string    { return "MoneyWithdrawn" }
func (e MoneyWithdrawn) OccurredAt() time.Time { return e.Timestamp }
```

Now create the aggregate that rebuilds state from events:

```go
// Account is an aggregate that rebuilds its state from events
type Account struct {
    ID      string
    Owner   string
    Balance int64
    events  []DomainEvent
    mu      sync.RWMutex
}

// Apply processes an event and updates the account state
func (a *Account) Apply(event DomainEvent) {
    a.mu.Lock()
    defer a.mu.Unlock()
    
    switch e := event.(type) {
    case AccountCreated:
        a.ID = e.AccountID
        a.Owner = e.Owner
        a.Balance = 0
    case MoneyDeposited:
        a.Balance += e.Amount
    case MoneyWithdrawn:
        a.Balance -= e.Amount
    }
    
    a.events = append(a.events, event)
}

// Deposit adds money and returns the event (or error)
func (a *Account) Deposit(amount int64) (DomainEvent, error) {
    if amount <= 0 {
        return nil, errors.New("deposit amount must be positive")
    }
    
    event := MoneyDeposited{
        AccountID: a.ID,
        Amount:    amount,
        Timestamp: time.Now(),
    }
    a.Apply(event)
    return event, nil
}

// Withdraw removes money and returns the event (or error)
func (a *Account) Withdraw(amount int64) (DomainEvent, error) {
    a.mu.RLock()
    currentBalance := a.Balance
    a.mu.RUnlock()
    
    if amount <= 0 {
        return nil, errors.New("withdrawal amount must be positive")
    }
    if amount > currentBalance {
        return nil, errors.New("insufficient funds")
    }
    
    event := MoneyWithdrawn{
        AccountID: a.ID,
        Amount:    amount,
        Timestamp: time.Now(),
    }
    a.Apply(event)
    return event, nil
}

// Rebuild recreates account state from a list of events
func (a *Account) Rebuild(events []DomainEvent) {
    for _, event := range events {
        a.Apply(event)
    }
}
```

## Integrating with Message Brokers

For distributed systems, you'll want to use a message broker. Here's a quick overview of popular options with Go:

**NATS**: Lightweight and simple. Great for cloud-native applications. The `nats.go` client is straightforward:

```go
package main

import (
    "log"
    "github.com/nats-io/nats.go"
)

func main() {
    // Connect to NATS server
    nc, err := nats.Connect(nats.DefaultURL)
    if err != nil {
        log.Fatal(err)
    }
    defer nc.Close()
    
    // Subscribe to events
    nc.Subscribe("user.created", func(m *nats.Msg) {
        log.Printf("Received user created event: %s", string(m.Data))
    })
    
    // Publish an event
    nc.Publish("user.created", []byte(`{"id": "123", "email": "user@example.com"}`))
}
```

**Apache Kafka**: Best for high-throughput scenarios where you need event replay and exactly-once semantics. Use the `segmentio/kafka-go` or `confluent-kafka-go` libraries.

**RabbitMQ**: Feature-rich with support for complex routing patterns. The `streadway/amqp` library (now `rabbitmq/amqp091-go`) is the standard choice.

Each broker has different trade-offs. NATS is simple and fast but historically had at-most-once delivery (NATS JetStream now offers persistence). Kafka excels at high-volume event streaming with durability. RabbitMQ offers flexible routing and is well-established.

## Error Handling in Async Flows

Error handling in event-driven systems requires careful thought. When a handler fails, you need to decide: retry, dead-letter, or ignore?

Build error handling into your event bus:

```go
package eventbus

import (
    "log"
    "time"
)

// HandlerWithError is a handler that can return an error
type HandlerWithError func(Event) error

// RetryConfig defines retry behavior
type RetryConfig struct {
    MaxAttempts int
    Delay       time.Duration
    Multiplier  float64 // For exponential backoff
}

// SubscribeWithRetry registers a handler that will be retried on failure
func (eb *EventBus) SubscribeWithRetry(eventType string, handler HandlerWithError, config RetryConfig) {
    wrappedHandler := func(event Event) {
        var err error
        delay := config.Delay
        
        for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
            err = handler(event)
            if err == nil {
                return // Success
            }
            
            log.Printf("Handler failed (attempt %d/%d): %v", attempt, config.MaxAttempts, err)
            
            if attempt < config.MaxAttempts {
                time.Sleep(delay)
                delay = time.Duration(float64(delay) * config.Multiplier)
            }
        }
        
        // All retries exhausted - send to dead letter queue
        log.Printf("Event failed after %d attempts, sending to DLQ: %+v", config.MaxAttempts, event)
        eb.Publish(Event{
            Type: "dead_letter",
            Payload: map[string]interface{}{
                "original_event": event,
                "error":          err.Error(),
            },
            Time: time.Now().Unix(),
        })
    }
    
    eb.Subscribe(eventType, wrappedHandler)
}
```

For channels, use a separate error channel:

```go
// Result wraps an event processing outcome
type Result struct {
    Event Event
    Error error
}

// ProcessWithErrors returns both success and error channels
func ProcessWithErrors(ctx context.Context, events <-chan Event, handler HandlerWithError) (<-chan Event, <-chan Result) {
    success := make(chan Event)
    failures := make(chan Result)
    
    go func() {
        defer close(success)
        defer close(failures)
        
        for event := range events {
            select {
            case <-ctx.Done():
                return
            default:
                if err := handler(event); err != nil {
                    failures <- Result{Event: event, Error: err}
                } else {
                    success <- event
                }
            }
        }
    }()
    
    return success, failures
}
```

## Practical Example: User Signup Flow

Let's build a realistic example - a user signup that triggers multiple actions: sending a welcome email, creating an audit log, and initializing user preferences.

Define your events and handlers:

```go
package main

import (
    "context"
    "encoding/json"
    "fmt"
    "log"
    "sync"
    "time"
)

// UserSignedUp is published when a new user completes registration
type UserSignedUp struct {
    UserID    string    `json:"user_id"`
    Email     string    `json:"email"`
    Name      string    `json:"name"`
    Timestamp time.Time `json:"timestamp"`
}

// EventBus implementation (simplified for this example)
type EventBus struct {
    handlers map[string][]func([]byte)
    mu       sync.RWMutex
}

func NewEventBus() *EventBus {
    return &EventBus{handlers: make(map[string][]func([]byte))}
}

func (eb *EventBus) Subscribe(topic string, handler func([]byte)) {
    eb.mu.Lock()
    defer eb.mu.Unlock()
    eb.handlers[topic] = append(eb.handlers[topic], handler)
}

func (eb *EventBus) Publish(topic string, data []byte) {
    eb.mu.RLock()
    handlers := eb.handlers[topic]
    eb.mu.RUnlock()
    
    var wg sync.WaitGroup
    for _, h := range handlers {
        wg.Add(1)
        go func(handler func([]byte)) {
            defer wg.Done()
            handler(data)
        }(h)
    }
    wg.Wait()
}
```

Create the handlers for different concerns:

```go
// EmailService handles sending emails
type EmailService struct{}

func (s *EmailService) HandleUserSignedUp(data []byte) {
    var event UserSignedUp
    if err := json.Unmarshal(data, &event); err != nil {
        log.Printf("EmailService: failed to parse event: %v", err)
        return
    }
    
    // In production, this would call your email provider
    log.Printf("EmailService: Sending welcome email to %s", event.Email)
    time.Sleep(100 * time.Millisecond) // Simulate API call
    log.Printf("EmailService: Welcome email sent to %s", event.Email)
}

// AuditService handles audit logging
type AuditService struct{}

func (s *AuditService) HandleUserSignedUp(data []byte) {
    var event UserSignedUp
    if err := json.Unmarshal(data, &event); err != nil {
        log.Printf("AuditService: failed to parse event: %v", err)
        return
    }
    
    // In production, this would write to your audit log storage
    log.Printf("AuditService: Recording signup for user %s at %v", event.UserID, event.Timestamp)
}

// PreferencesService initializes default user preferences
type PreferencesService struct{}

func (s *PreferencesService) HandleUserSignedUp(data []byte) {
    var event UserSignedUp
    if err := json.Unmarshal(data, &event); err != nil {
        log.Printf("PreferencesService: failed to parse event: %v", err)
        return
    }
    
    // In production, this would insert default preferences into your database
    log.Printf("PreferencesService: Creating default preferences for user %s", event.UserID)
}
```

Wire everything together:

```go
func main() {
    bus := NewEventBus()
    
    // Initialize services
    emailSvc := &EmailService{}
    auditSvc := &AuditService{}
    prefsSvc := &PreferencesService{}
    
    // Subscribe handlers to the user.signed_up topic
    bus.Subscribe("user.signed_up", emailSvc.HandleUserSignedUp)
    bus.Subscribe("user.signed_up", auditSvc.HandleUserSignedUp)
    bus.Subscribe("user.signed_up", prefsSvc.HandleUserSignedUp)
    
    // Simulate a user signing up
    event := UserSignedUp{
        UserID:    "user-12345",
        Email:     "newuser@example.com",
        Name:      "Jane Doe",
        Timestamp: time.Now(),
    }
    
    data, _ := json.Marshal(event)
    
    log.Println("Publishing user.signed_up event...")
    bus.Publish("user.signed_up", data)
    log.Println("All handlers completed")
}
```

## Testing Event-Driven Code

Testing asynchronous code can be tricky. Here are patterns that work well:

Use synchronous execution for unit tests:

```go
package eventbus_test

import (
    "encoding/json"
    "testing"
    "time"
)

// TestEventBus uses synchronous publishing for deterministic tests
func TestUserSignupFlow(t *testing.T) {
    bus := NewEventBus()
    
    // Track which handlers were called
    var emailCalled, auditCalled bool
    
    bus.Subscribe("user.signed_up", func(data []byte) {
        emailCalled = true
    })
    
    bus.Subscribe("user.signed_up", func(data []byte) {
        auditCalled = true
    })
    
    event := UserSignedUp{
        UserID:    "test-user",
        Email:     "test@example.com",
        Name:      "Test User",
        Timestamp: time.Now(),
    }
    data, _ := json.Marshal(event)
    
    // PublishSync waits for all handlers
    bus.Publish("user.signed_up", data)
    
    if !emailCalled {
        t.Error("Email handler was not called")
    }
    if !auditCalled {
        t.Error("Audit handler was not called")
    }
}
```

For integration tests with channels, use timeouts:

```go
func TestChannelProcessor(t *testing.T) {
    ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel()
    
    processor := NewProcessor(10)
    
    received := make(chan Event, 1)
    processor.Start(ctx, func(e Event) {
        received <- e
    })
    
    testEvent := Event{Type: "test", Payload: "data"}
    processor.Send(ctx, testEvent)
    
    select {
    case got := <-received:
        if got.Type != testEvent.Type {
            t.Errorf("got event type %s, want %s", got.Type, testEvent.Type)
        }
    case <-ctx.Done():
        t.Fatal("timeout waiting for event")
    }
}
```

Create test doubles for message brokers:

```go
// MockBroker implements your broker interface for testing
type MockBroker struct {
    published []Message
    mu        sync.Mutex
}

func (m *MockBroker) Publish(topic string, data []byte) error {
    m.mu.Lock()
    defer m.mu.Unlock()
    m.published = append(m.published, Message{Topic: topic, Data: data})
    return nil
}

func (m *MockBroker) GetPublished() []Message {
    m.mu.Lock()
    defer m.mu.Unlock()
    return m.published
}

// Use in tests
func TestServicePublishesEvent(t *testing.T) {
    broker := &MockBroker{}
    service := NewUserService(broker)
    
    service.SignUp("user@example.com", "password")
    
    published := broker.GetPublished()
    if len(published) != 1 {
        t.Fatalf("expected 1 published event, got %d", len(published))
    }
    if published[0].Topic != "user.signed_up" {
        t.Errorf("wrong topic: %s", published[0].Topic)
    }
}
```

## Key Takeaways

Event-driven architecture in Go works well because of the language's built-in concurrency primitives. Start with a simple in-process event bus before adding a message broker - you might not need one yet.

Remember:

- Keep events immutable and include all necessary data
- Handle errors explicitly with retries and dead-letter queues
- Use synchronous execution in tests for predictability
- Choose your message broker based on actual requirements, not hype

The patterns here scale from single-process applications to distributed microservices. Start simple, measure, then add complexity only when needed.

---

*Need to monitor your event-driven Go applications? [OneUptime](https://oneuptime.com) provides comprehensive observability for your distributed systems. Track event processing latency, monitor handler failures, and get alerted when your async workflows break down. With OpenTelemetry support, you can trace events as they flow through your system and quickly identify bottlenecks.*
