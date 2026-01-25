# How to Propagate Timeouts with Context in Go Services

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Context, Timeouts, Microservices, Reliability

Description: Learn how to properly propagate timeouts across service boundaries in Go using context, preventing cascading failures and ensuring predictable latency in distributed systems.

---

Timeouts are the unsung heroes of reliable distributed systems. When a downstream service hangs, your entire request chain can grind to a halt without proper timeout propagation. Go's context package provides an elegant solution, but getting it right requires understanding how timeouts flow through your system.

## Why Timeout Propagation Matters

Consider a user request that hits your API gateway, which calls Service A, which calls Service B, which queries a database. If Service B hangs for 30 seconds but your API gateway has a 5-second timeout, what happens to Service A and Service B after the user gives up?

Without proper propagation, those services keep working on a request nobody is waiting for. This wastes resources and can cause cascading failures during load spikes.

```
User Request (5s timeout)
    -> API Gateway
        -> Service A (30s default timeout)
            -> Service B (60s default timeout)
                -> Database (no timeout)
```

The goal is to pass the original deadline down the entire chain, so when the user's 5-second window expires, all downstream work stops immediately.

## Context Basics: WithTimeout vs WithDeadline

Go provides two ways to add time limits to a context. `WithTimeout` sets a duration from now, while `WithDeadline` sets an absolute time. For propagation, deadlines are more useful because they represent "when" rather than "how long."

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // WithTimeout: relative duration from now
    ctx1, cancel1 := context.WithTimeout(context.Background(), 5*time.Second)
    defer cancel1()

    // WithDeadline: absolute point in time
    deadline := time.Now().Add(5 * time.Second)
    ctx2, cancel2 := context.WithDeadline(context.Background(), deadline)
    defer cancel2()

    // Check remaining time - useful for logging and decisions
    if dl, ok := ctx1.Deadline(); ok {
        remaining := time.Until(dl)
        fmt.Printf("Time remaining: %v\n", remaining)
    }
}
```

Always call the cancel function, even if the context times out. The defer pattern ensures cleanup happens regardless of how the function exits.

## Propagating Timeouts in HTTP Handlers

When your service receives an HTTP request, the incoming context should carry the deadline. Extract it and pass it to all downstream operations.

```go
package main

import (
    "context"
    "encoding/json"
    "log"
    "net/http"
    "time"
)

// Handler that respects incoming context timeout
func handleRequest(w http.ResponseWriter, r *http.Request) {
    // r.Context() carries the request's lifecycle
    // It gets cancelled when: client disconnects, timeout hits, or server shuts down
    ctx := r.Context()

    // Check if we have time to do our work
    if deadline, ok := ctx.Deadline(); ok {
        remaining := time.Until(deadline)
        if remaining < 100*time.Millisecond {
            http.Error(w, "insufficient time remaining", http.StatusGatewayTimeout)
            return
        }
        log.Printf("Processing request with %v remaining", remaining)
    }

    // Pass context to downstream calls
    result, err := fetchFromDownstream(ctx)
    if err != nil {
        if ctx.Err() == context.DeadlineExceeded {
            http.Error(w, "request timed out", http.StatusGatewayTimeout)
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }

    json.NewEncoder(w).Encode(result)
}

// fetchFromDownstream passes context to the HTTP client
func fetchFromDownstream(ctx context.Context) (map[string]interface{}, error) {
    req, err := http.NewRequestWithContext(ctx, "GET", "http://service-b/data", nil)
    if err != nil {
        return nil, err
    }

    // The client will respect the context's deadline
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()

    var result map[string]interface{}
    err = json.NewDecoder(resp.Body).Decode(&result)
    return result, err
}
```

## Setting Timeouts at the Edge

Your API gateway or entry point should establish the initial timeout. This creates the deadline that propagates through the system.

```go
package main

import (
    "context"
    "net/http"
    "time"
)

// TimeoutMiddleware sets a deadline for all requests
func TimeoutMiddleware(timeout time.Duration) func(http.Handler) http.Handler {
    return func(next http.Handler) http.Handler {
        return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
            // Create a context with the timeout
            ctx, cancel := context.WithTimeout(r.Context(), timeout)
            defer cancel()

            // Replace the request's context
            r = r.WithContext(ctx)

            // Use a channel to detect if handler completes
            done := make(chan struct{})
            go func() {
                next.ServeHTTP(w, r)
                close(done)
            }()

            select {
            case <-done:
                // Handler completed
            case <-ctx.Done():
                // Timeout hit
            }
        })
    }
}

func main() {
    mux := http.NewServeMux()
    mux.HandleFunc("/api/data", handleRequest)

    // Wrap with 5-second timeout for all routes
    handler := TimeoutMiddleware(5 * time.Second)(mux)

    http.ListenAndServe(":8080", handler)
}
```

## Propagating Timeouts to gRPC Services

gRPC has built-in deadline propagation through metadata. When you make a gRPC call with a context that has a deadline, it automatically propagates to the server.

```go
// Server side: the context already has the client's deadline
func (s *server) GetData(ctx context.Context, req *Request) (*Response, error) {
    if deadline, ok := ctx.Deadline(); ok {
        remaining := time.Until(deadline)

        // Fail fast if not enough time
        if remaining < 50*time.Millisecond {
            return nil, status.Error(codes.DeadlineExceeded, "insufficient time")
        }
    }

    // Pass ctx to all downstream operations
    data, err := s.db.QueryContext(ctx, "SELECT * FROM items")
    if err != nil {
        return nil, err
    }

    return &Response{Data: data}, nil
}
```

## Database Queries with Context

Database operations are a common source of hung requests. Always pass context to your queries so they respect the deadline.

```go
package main

import (
    "context"
    "database/sql"
    "time"
)

type Repository struct {
    db *sql.DB
}

// GetUser respects context deadline with a safety margin
func (r *Repository) GetUser(ctx context.Context, id int) (*User, error) {
    // Check remaining time and reserve some for processing the result
    if deadline, ok := ctx.Deadline(); ok {
        remaining := time.Until(deadline)
        if remaining < 200*time.Millisecond {
            return nil, context.DeadlineExceeded
        }
    }

    // QueryRowContext will cancel the query if ctx expires
    row := r.db.QueryRowContext(ctx, "SELECT id, name, email FROM users WHERE id = $1", id)

    var user User
    err := row.Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        return nil, err
    }

    return &user, nil
}

// Transaction with context - entire transaction respects deadline
func (r *Repository) TransferFunds(ctx context.Context, from, to int, amount float64) error {
    tx, err := r.db.BeginTx(ctx, nil)
    if err != nil {
        return err
    }
    defer tx.Rollback()

    _, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance - $1 WHERE id = $2", amount, from)
    if err != nil {
        return err
    }

    _, err = tx.ExecContext(ctx, "UPDATE accounts SET balance = balance + $1 WHERE id = $2", amount, to)
    if err != nil {
        return err
    }

    return tx.Commit()
}
```

## Coordinating Multiple Goroutines

When you fan out to multiple goroutines, they should all share the same context so they stop together when the deadline hits.

```go
// FanOut calls multiple services concurrently, all sharing the same deadline
func FanOut(ctx context.Context) ([]Result, error) {
    services := []string{"service-a", "service-b", "service-c"}
    results := make([]Result, len(services))
    errs := make([]error, len(services))

    var wg sync.WaitGroup
    wg.Add(len(services))

    for i, svc := range services {
        go func(idx int, service string) {
            defer wg.Done()
            // All goroutines share the parent context
            result, err := callService(ctx, service)
            results[idx] = result
            errs[idx] = err
        }(i, svc)
    }

    wg.Wait()

    if ctx.Err() == context.DeadlineExceeded {
        return nil, ctx.Err()
    }

    for _, err := range errs {
        if err != nil {
            return nil, err
        }
    }
    return results, nil
}
```

## Shrinking Timeouts for Downstream Calls

Sometimes you want to leave headroom for retries. Shrink the timeout before passing it downstream.

```go
package main

import (
    "context"
    "time"
)

// ShrinkTimeout reduces the deadline to leave room for retries
func ShrinkTimeout(ctx context.Context, reserve time.Duration) (context.Context, context.CancelFunc) {
    if deadline, ok := ctx.Deadline(); ok {
        newDeadline := deadline.Add(-reserve)
        if time.Until(newDeadline) > 0 {
            return context.WithDeadline(ctx, newDeadline)
        }
    }
    // No deadline or not enough time - return original
    return ctx, func() {}
}

func processWithRetry(ctx context.Context) error {
    // Reserve 500ms for potential retry
    innerCtx, cancel := ShrinkTimeout(ctx, 500*time.Millisecond)
    defer cancel()

    err := callDownstream(innerCtx)
    if err != nil && ctx.Err() == nil {
        // First attempt failed but we still have time - retry
        return callDownstream(ctx)
    }
    return err
}
```

## Common Pitfalls

Avoid these mistakes when working with context timeouts:

1. Creating a new background context instead of propagating the parent:
```go
// Wrong - loses the deadline
ctx := context.Background()
callDownstream(ctx)

// Right - preserves the deadline
callDownstream(parentCtx)
```

2. Forgetting to call cancel:
```go
// Wrong - resource leak
ctx, _ := context.WithTimeout(parent, 5*time.Second)

// Right
ctx, cancel := context.WithTimeout(parent, 5*time.Second)
defer cancel()
```

3. Not checking context errors:
```go
// Always check why an operation failed
if err != nil {
    if ctx.Err() == context.DeadlineExceeded {
        // Timeout - maybe retry or return 504
    } else if ctx.Err() == context.Canceled {
        // Client cancelled - stop work
    }
}
```

## Summary

Proper timeout propagation keeps your distributed system responsive and prevents resource waste. The key points:

- Set timeouts at the edge of your system
- Pass context through every function that does I/O
- Use context.Deadline() to make decisions about remaining time
- Cancel contexts properly with defer
- Shrink timeouts when you need retry headroom

When every service in your chain respects the original deadline, your system fails fast and recovers gracefully. Users get quick error responses instead of hanging requests.
