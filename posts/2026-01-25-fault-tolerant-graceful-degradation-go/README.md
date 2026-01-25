# How to Build Fault-Tolerant Services with Graceful Degradation in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Fault Tolerance, Graceful Degradation, Resilience, Microservices

Description: A practical guide to building Go services that stay functional when things break, with real code patterns for circuit breakers, fallbacks, and partial responses.

---

Your service will fail. A database will go down. An external API will timeout. A downstream dependency will start returning errors. The question isn't whether these failures happen - it's whether your service handles them gracefully or takes everything down with it.

This guide walks through practical patterns for building Go services that degrade gracefully instead of falling over completely.

## What Graceful Degradation Actually Means

Graceful degradation is about providing reduced functionality instead of complete failure. When your recommendation engine is down, you show popular items instead of personalized ones. When your payment processor is slow, you queue transactions instead of timing out. When your cache is unavailable, you hit the database directly (with some rate limiting).

The goal is keeping your service useful even when parts of it are broken.

## The Circuit Breaker Pattern

Circuit breakers prevent cascading failures by stopping calls to a failing service. Think of it like an electrical circuit breaker - when too many failures occur, the circuit "opens" and stops letting requests through.

Here's a practical implementation:

```go
package resilience

import (
    "errors"
    "sync"
    "time"
)

type State int

const (
    StateClosed State = iota  // Normal operation
    StateOpen                  // Blocking all calls
    StateHalfOpen             // Testing if service recovered
)

type CircuitBreaker struct {
    mu              sync.RWMutex
    state           State
    failures        int
    successes       int
    lastFailureTime time.Time

    // Configuration
    maxFailures     int           // Failures before opening
    timeout         time.Duration // Time before trying again
    successThreshold int          // Successes needed to close
}

func NewCircuitBreaker(maxFailures int, timeout time.Duration) *CircuitBreaker {
    return &CircuitBreaker{
        state:            StateClosed,
        maxFailures:      maxFailures,
        timeout:          timeout,
        successThreshold: 2,
    }
}

var ErrCircuitOpen = errors.New("circuit breaker is open")

func (cb *CircuitBreaker) Execute(fn func() error) error {
    if !cb.canExecute() {
        return ErrCircuitOpen
    }

    err := fn()
    cb.recordResult(err)
    return err
}

func (cb *CircuitBreaker) canExecute() bool {
    cb.mu.RLock()
    defer cb.mu.RUnlock()

    switch cb.state {
    case StateClosed:
        return true
    case StateOpen:
        // Check if timeout has passed
        if time.Since(cb.lastFailureTime) > cb.timeout {
            cb.mu.RUnlock()
            cb.mu.Lock()
            cb.state = StateHalfOpen
            cb.mu.Unlock()
            cb.mu.RLock()
            return true
        }
        return false
    case StateHalfOpen:
        return true
    }
    return false
}

func (cb *CircuitBreaker) recordResult(err error) {
    cb.mu.Lock()
    defer cb.mu.Unlock()

    if err != nil {
        cb.failures++
        cb.lastFailureTime = time.Now()
        cb.successes = 0

        if cb.failures >= cb.maxFailures {
            cb.state = StateOpen
        }
    } else {
        cb.successes++

        if cb.state == StateHalfOpen && cb.successes >= cb.successThreshold {
            cb.state = StateClosed
            cb.failures = 0
        }
    }
}
```

Using it looks like this:

```go
var userServiceBreaker = NewCircuitBreaker(5, 30*time.Second)

func GetUserProfile(userID string) (*User, error) {
    var user *User

    err := userServiceBreaker.Execute(func() error {
        var err error
        user, err = userServiceClient.GetUser(userID)
        return err
    })

    if errors.Is(err, ErrCircuitOpen) {
        // Return cached data or a default response
        return getCachedUser(userID)
    }

    return user, err
}
```

## Implementing Fallback Strategies

Circuit breakers tell you when something is broken. Fallbacks tell you what to do about it. Here's a pattern for chaining fallbacks:

```go
package resilience

type FallbackChain[T any] struct {
    primary   func() (T, error)
    fallbacks []func() (T, error)
}

func NewFallbackChain[T any](primary func() (T, error)) *FallbackChain[T] {
    return &FallbackChain[T]{primary: primary}
}

func (fc *FallbackChain[T]) AddFallback(fn func() (T, error)) *FallbackChain[T] {
    fc.fallbacks = append(fc.fallbacks, fn)
    return fc
}

func (fc *FallbackChain[T]) Execute() (T, error) {
    result, err := fc.primary()
    if err == nil {
        return result, nil
    }

    // Try each fallback in order
    for _, fallback := range fc.fallbacks {
        result, err = fallback()
        if err == nil {
            return result, nil
        }
    }

    // All fallbacks failed
    var zero T
    return zero, err
}
```

Real-world usage:

```go
func GetProductRecommendations(userID string) ([]Product, error) {
    chain := NewFallbackChain(func() ([]Product, error) {
        // Primary: personalized ML recommendations
        return mlService.GetPersonalizedProducts(userID)
    }).AddFallback(func() ([]Product, error) {
        // Fallback 1: user's purchase history
        return getRecentlyViewedProducts(userID)
    }).AddFallback(func() ([]Product, error) {
        // Fallback 2: popular products (always available)
        return getPopularProducts()
    })

    return chain.Execute()
}
```

## Partial Responses with Timeouts

Sometimes you want to return whatever data you managed to gather, even if some sources failed. This pattern is useful for aggregator services:

```go
package resilience

import (
    "context"
    "sync"
    "time"
)

type PartialResult[T any] struct {
    Data    T
    Source  string
    Error   error
}

func GatherWithTimeout[T any](
    ctx context.Context,
    timeout time.Duration,
    sources map[string]func(context.Context) (T, error),
) []PartialResult[T] {
    ctx, cancel := context.WithTimeout(ctx, timeout)
    defer cancel()

    results := make([]PartialResult[T], 0, len(sources))
    resultChan := make(chan PartialResult[T], len(sources))

    var wg sync.WaitGroup
    for name, fn := range sources {
        wg.Add(1)
        go func(name string, fn func(context.Context) (T, error)) {
            defer wg.Done()

            data, err := fn(ctx)
            resultChan <- PartialResult[T]{
                Data:   data,
                Source: name,
                Error:  err,
            }
        }(name, fn)
    }

    // Close channel when all goroutines complete
    go func() {
        wg.Wait()
        close(resultChan)
    }()

    // Collect results until timeout or all complete
    for result := range resultChan {
        results = append(results, result)
    }

    return results
}
```

Using it for a dashboard that aggregates multiple data sources:

```go
func GetDashboardData(ctx context.Context, userID string) *Dashboard {
    sources := map[string]func(context.Context) (interface{}, error){
        "metrics": func(ctx context.Context) (interface{}, error) {
            return metricsService.GetUserMetrics(ctx, userID)
        },
        "alerts": func(ctx context.Context) (interface{}, error) {
            return alertService.GetActiveAlerts(ctx, userID)
        },
        "activity": func(ctx context.Context) (interface{}, error) {
            return activityService.GetRecentActivity(ctx, userID)
        },
    }

    results := GatherWithTimeout(ctx, 2*time.Second, sources)

    dashboard := &Dashboard{}
    for _, result := range results {
        if result.Error != nil {
            // Log the error but continue
            log.Printf("Failed to fetch %s: %v", result.Source, result.Error)
            continue
        }

        switch result.Source {
        case "metrics":
            dashboard.Metrics = result.Data.(*Metrics)
        case "alerts":
            dashboard.Alerts = result.Data.([]Alert)
        case "activity":
            dashboard.Activity = result.Data.([]Activity)
        }
    }

    return dashboard
}
```

## Bulkhead Pattern for Resource Isolation

Bulkheads prevent one slow dependency from consuming all your resources. In Go, you can implement this with semaphores:

```go
package resilience

import (
    "context"
    "errors"
)

type Bulkhead struct {
    sem chan struct{}
}

var ErrBulkheadFull = errors.New("bulkhead capacity reached")

func NewBulkhead(maxConcurrent int) *Bulkhead {
    return &Bulkhead{
        sem: make(chan struct{}, maxConcurrent),
    }
}

func (b *Bulkhead) Execute(ctx context.Context, fn func() error) error {
    select {
    case b.sem <- struct{}{}:
        defer func() { <-b.sem }()
        return fn()
    case <-ctx.Done():
        return ctx.Err()
    default:
        return ErrBulkheadFull
    }
}
```

Use separate bulkheads for different dependencies:

```go
var (
    paymentBulkhead   = NewBulkhead(10)  // Max 10 concurrent payment calls
    inventoryBulkhead = NewBulkhead(20)  // Max 20 concurrent inventory calls
)

func ProcessOrder(ctx context.Context, order *Order) error {
    // These calls are isolated from each other
    err := paymentBulkhead.Execute(ctx, func() error {
        return processPayment(order)
    })
    if err != nil {
        return fmt.Errorf("payment failed: %w", err)
    }

    err = inventoryBulkhead.Execute(ctx, func() error {
        return reserveInventory(order)
    })
    if err != nil {
        // Rollback payment
        refundPayment(order)
        return fmt.Errorf("inventory reservation failed: %w", err)
    }

    return nil
}
```

## Common Pitfalls to Avoid

**1. Not setting timeouts everywhere.** Every external call needs a timeout. Use `context.WithTimeout` religiously.

**2. Fallbacks that fail the same way.** If your primary fails because the network is down, a fallback that also requires network will fail too. Make sure fallbacks are truly independent.

**3. Circuit breakers that never recover.** Always implement the half-open state to test if services have recovered.

**4. Logging fallback usage as errors.** Fallbacks are expected behavior, not errors. Log them as info or warnings, and track metrics separately.

**5. Forgetting to test failure modes.** Write tests that simulate failures. Use chaos engineering in staging. Your graceful degradation code will have bugs too.

## Putting It All Together

A well-designed fault-tolerant service combines all these patterns:

```go
func GetUserDashboard(ctx context.Context, userID string) (*Dashboard, error) {
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()

    // Use circuit breaker for the main data source
    var userData *UserData
    err := userDataBreaker.Execute(func() error {
        return userDataBulkhead.Execute(ctx, func() error {
            var err error
            userData, err = userService.GetUserData(ctx, userID)
            return err
        })
    })

    if err != nil {
        // Fall back to cached data
        userData = getCachedUserData(userID)
    }

    // Gather supplementary data with partial response pattern
    supplementary := GatherWithTimeout(ctx, 2*time.Second, supplementarySources)

    return buildDashboard(userData, supplementary), nil
}
```

The key is layering these patterns appropriately. Not every call needs a circuit breaker. Not every feature needs three fallbacks. Think about what matters most to your users and protect those paths first.

Start with the critical path, add observability so you can see what's failing, and iterate. Fault tolerance is not a one-time implementation - it's an ongoing practice of understanding failure modes and building appropriate defenses.
