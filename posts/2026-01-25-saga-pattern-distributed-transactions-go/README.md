# How to Implement the Saga Pattern for Distributed Transactions in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Saga Pattern, Distributed Systems, Microservices, Transactions

Description: Learn how to implement the Saga pattern in Go to manage distributed transactions across microservices, with practical code examples for both choreography and orchestration approaches.

---

Distributed transactions are hard. When your monolith becomes microservices, you lose the comfort of ACID transactions that span multiple operations. The Saga pattern is one of the most practical solutions to this problem - it breaks a transaction into a sequence of local transactions, each with a compensating action that can undo its effects if something goes wrong.

This guide walks through implementing the Saga pattern in Go with real, working code.

## Why Sagas?

Traditional distributed transactions using two-phase commit (2PC) have serious drawbacks: they require locks across services, create single points of failure, and don't scale well. Sagas take a different approach - they accept that failures will happen and plan for them with compensation logic.

Consider an e-commerce order flow:
1. Reserve inventory
2. Process payment
3. Ship order

If payment fails after inventory is reserved, you need to release that inventory. A Saga handles this by defining both the forward action and its compensating rollback.

## Two Approaches: Choreography vs Orchestration

**Choreography**: Each service publishes events and listens for events from other services. No central coordinator. Works well for simple flows but gets messy as complexity grows.

**Orchestration**: A central orchestrator tells each service what to do and tracks the overall state. Easier to understand and debug, but introduces a single point of coordination.

We'll focus on orchestration since it's more practical for most real-world scenarios.

## Defining the Saga Structure

First, let's define the core types. A Saga consists of steps, where each step has an action and a compensating action.

```go
package saga

import (
    "context"
    "fmt"
    "sync"
)

// Step represents a single step in a saga with its compensation
type Step struct {
    Name       string
    Action     func(ctx context.Context, data map[string]interface{}) error
    Compensate func(ctx context.Context, data map[string]interface{}) error
}

// Saga orchestrates a sequence of steps with rollback capability
type Saga struct {
    name  string
    steps []Step
    mu    sync.Mutex
}

// New creates a new Saga with the given name
func New(name string) *Saga {
    return &Saga{
        name:  name,
        steps: make([]Step, 0),
    }
}

// AddStep appends a step to the saga
func (s *Saga) AddStep(step Step) *Saga {
    s.mu.Lock()
    defer s.mu.Unlock()
    s.steps = append(s.steps, step)
    return s
}
```

## Implementing the Execution Engine

The execution engine runs each step in order. When a step fails, it runs compensating actions for all previously completed steps in reverse order.

```go
// ExecutionResult holds the outcome of saga execution
type ExecutionResult struct {
    Success        bool
    FailedStep     string
    Error          error
    CompletedSteps []string
    RolledBack     bool
}

// Execute runs the saga and handles compensation on failure
func (s *Saga) Execute(ctx context.Context, data map[string]interface{}) ExecutionResult {
    s.mu.Lock()
    defer s.mu.Unlock()

    completedSteps := make([]string, 0, len(s.steps))
    result := ExecutionResult{Success: true}

    // Execute each step in order
    for _, step := range s.steps {
        select {
        case <-ctx.Done():
            // Context cancelled - trigger rollback
            result.Success = false
            result.Error = ctx.Err()
            result.FailedStep = step.Name
            s.rollback(ctx, completedSteps, data)
            result.RolledBack = true
            result.CompletedSteps = completedSteps
            return result
        default:
        }

        if err := step.Action(ctx, data); err != nil {
            result.Success = false
            result.Error = err
            result.FailedStep = step.Name

            // Rollback completed steps in reverse order
            s.rollback(ctx, completedSteps, data)
            result.RolledBack = true
            result.CompletedSteps = completedSteps
            return result
        }

        completedSteps = append(completedSteps, step.Name)
    }

    result.CompletedSteps = completedSteps
    return result
}

// rollback executes compensating actions in reverse order
func (s *Saga) rollback(ctx context.Context, completedSteps []string, data map[string]interface{}) {
    // Build a map for quick step lookup
    stepMap := make(map[string]Step)
    for _, step := range s.steps {
        stepMap[step.Name] = step
    }

    // Execute compensations in reverse order
    for i := len(completedSteps) - 1; i >= 0; i-- {
        stepName := completedSteps[i]
        step := stepMap[stepName]

        if step.Compensate != nil {
            // Log but don't fail on compensation errors
            // In production, you'd want retry logic here
            if err := step.Compensate(ctx, data); err != nil {
                fmt.Printf("compensation failed for step %s: %v\n", stepName, err)
            }
        }
    }
}
```

## Building a Real Example: Order Processing

Let's build a complete order processing saga. This example shows how the pieces fit together.

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "time"
)

// OrderService handles order creation
type OrderService struct{}

func (o *OrderService) CreateOrder(ctx context.Context, data map[string]interface{}) error {
    orderID := data["order_id"].(string)
    fmt.Printf("Creating order %s\n", orderID)
    // Simulate DB insert
    data["order_created"] = true
    return nil
}

func (o *OrderService) CancelOrder(ctx context.Context, data map[string]interface{}) error {
    orderID := data["order_id"].(string)
    fmt.Printf("Cancelling order %s\n", orderID)
    return nil
}

// InventoryService handles stock reservation
type InventoryService struct{}

func (i *InventoryService) ReserveStock(ctx context.Context, data map[string]interface{}) error {
    productID := data["product_id"].(string)
    quantity := data["quantity"].(int)
    fmt.Printf("Reserving %d units of product %s\n", quantity, productID)
    data["stock_reserved"] = true
    return nil
}

func (i *InventoryService) ReleaseStock(ctx context.Context, data map[string]interface{}) error {
    productID := data["product_id"].(string)
    quantity := data["quantity"].(int)
    fmt.Printf("Releasing %d units of product %s\n", quantity, productID)
    return nil
}

// PaymentService handles payment processing
type PaymentService struct {
    shouldFail bool // For testing failure scenarios
}

func (p *PaymentService) ProcessPayment(ctx context.Context, data map[string]interface{}) error {
    amount := data["amount"].(float64)

    if p.shouldFail {
        return errors.New("payment declined: insufficient funds")
    }

    fmt.Printf("Processing payment of $%.2f\n", amount)
    data["payment_id"] = "pay_123456"
    return nil
}

func (p *PaymentService) RefundPayment(ctx context.Context, data map[string]interface{}) error {
    if paymentID, ok := data["payment_id"].(string); ok {
        fmt.Printf("Refunding payment %s\n", paymentID)
    }
    return nil
}

func main() {
    // Initialize services
    orderSvc := &OrderService{}
    inventorySvc := &InventoryService{}
    paymentSvc := &PaymentService{shouldFail: false}

    // Build the saga
    orderSaga := New("order-processing").
        AddStep(Step{
            Name:       "create-order",
            Action:     orderSvc.CreateOrder,
            Compensate: orderSvc.CancelOrder,
        }).
        AddStep(Step{
            Name:       "reserve-inventory",
            Action:     inventorySvc.ReserveStock,
            Compensate: inventorySvc.ReleaseStock,
        }).
        AddStep(Step{
            Name:       "process-payment",
            Action:     paymentSvc.ProcessPayment,
            Compensate: paymentSvc.RefundPayment,
        })

    // Execute with order data
    ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
    defer cancel()

    orderData := map[string]interface{}{
        "order_id":   "ord_789",
        "product_id": "prod_456",
        "quantity":   2,
        "amount":     99.99,
    }

    result := orderSaga.Execute(ctx, orderData)

    if result.Success {
        fmt.Println("Order completed successfully!")
    } else {
        fmt.Printf("Order failed at step '%s': %v\n", result.FailedStep, result.Error)
        if result.RolledBack {
            fmt.Println("All completed steps have been rolled back")
        }
    }
}
```

## Adding Retry Logic

Network failures happen. Adding retry logic to your saga steps makes the system more resilient.

```go
// RetryConfig defines retry behavior
type RetryConfig struct {
    MaxAttempts int
    InitialWait time.Duration
    MaxWait     time.Duration
    Multiplier  float64
}

// WithRetry wraps an action with exponential backoff retry
func WithRetry(action func(ctx context.Context, data map[string]interface{}) error, config RetryConfig) func(ctx context.Context, data map[string]interface{}) error {
    return func(ctx context.Context, data map[string]interface{}) error {
        var lastErr error
        wait := config.InitialWait

        for attempt := 1; attempt <= config.MaxAttempts; attempt++ {
            if err := action(ctx, data); err != nil {
                lastErr = err

                if attempt == config.MaxAttempts {
                    break
                }

                // Wait with exponential backoff
                select {
                case <-time.After(wait):
                    wait = time.Duration(float64(wait) * config.Multiplier)
                    if wait > config.MaxWait {
                        wait = config.MaxWait
                    }
                case <-ctx.Done():
                    return ctx.Err()
                }
                continue
            }
            return nil
        }
        return fmt.Errorf("failed after %d attempts: %w", config.MaxAttempts, lastErr)
    }
}

// Usage example
retryConfig := RetryConfig{
    MaxAttempts: 3,
    InitialWait: 100 * time.Millisecond,
    MaxWait:     2 * time.Second,
    Multiplier:  2.0,
}

saga := New("order-with-retry").
    AddStep(Step{
        Name:       "reserve-inventory",
        Action:     WithRetry(inventorySvc.ReserveStock, retryConfig),
        Compensate: inventorySvc.ReleaseStock,
    })
```

## Persisting Saga State

For production systems, you need to persist saga state so you can recover from crashes. Here's a simple interface and implementation.

```go
// SagaState represents the persisted state of a saga execution
type SagaState struct {
    ID             string                 `json:"id"`
    Name           string                 `json:"name"`
    Status         string                 `json:"status"` // running, completed, failed, compensating
    CurrentStep    int                    `json:"current_step"`
    CompletedSteps []string               `json:"completed_steps"`
    Data           map[string]interface{} `json:"data"`
    Error          string                 `json:"error,omitempty"`
    CreatedAt      time.Time              `json:"created_at"`
    UpdatedAt      time.Time              `json:"updated_at"`
}

// StateStore interface for persisting saga state
type StateStore interface {
    Save(ctx context.Context, state *SagaState) error
    Load(ctx context.Context, id string) (*SagaState, error)
    Update(ctx context.Context, state *SagaState) error
}

// PersistentSaga wraps a saga with state persistence
type PersistentSaga struct {
    *Saga
    store StateStore
}

// NewPersistent creates a saga with state persistence
func NewPersistent(name string, store StateStore) *PersistentSaga {
    return &PersistentSaga{
        Saga:  New(name),
        store: store,
    }
}
```

## Common Pitfalls to Avoid

**1. Non-idempotent compensations**: Your compensating actions might run multiple times if there's a crash during rollback. Make them idempotent - running them twice should have the same effect as running once.

**2. Missing compensations**: Every action that changes state needs a compensation. It's easy to forget to add one when you're focused on the happy path.

**3. Compensation ordering**: Always compensate in reverse order. If you created A, then B, you need to delete B before A to maintain referential integrity.

**4. Ignoring partial failures**: When compensation itself fails, you need a strategy. Log it, alert on it, and consider a dead letter queue for manual intervention.

**5. Shared mutable state**: Pass data between steps via the data map, not through shared memory. This makes it easier to persist and recover state.

## Best Practices

- Keep saga steps small and focused on a single service
- Use correlation IDs to trace saga execution across services
- Add observability with metrics for saga success rates and durations
- Set reasonable timeouts on each step
- Consider using a message queue for async saga execution in high-throughput systems
- Test your compensations as thoroughly as your actions

## Conclusion

The Saga pattern isn't a silver bullet, but it's one of the most practical approaches to distributed transactions. The orchestration approach shown here gives you clear visibility into transaction state and straightforward debugging when things go wrong.

Start simple, add complexity only when needed, and always make sure your compensations are bulletproof. Your future self will thank you when you're debugging a failed transaction at 2 AM.
