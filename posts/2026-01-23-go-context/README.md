# How to Use Context in Go for Cancellation and Timeouts

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, Context, Cancellation, Timeouts, Concurrency, Goroutines

Description: Master Go's context package for handling cancellation, timeouts, and request-scoped values. Learn patterns for propagating context through your application.

---

The `context` package is essential for managing cancellation, deadlines, and request-scoped values in Go applications. Every HTTP handler, database query, and long-running operation should accept a context.

---

## Why Context Matters

```go
// WITHOUT context: Operation can't be cancelled
func fetchData() ([]byte, error) {
    // If the user disconnects, this keeps running!
    resp, err := http.Get("https://slow-api.example.com/data")
    // ...
}

// WITH context: Operation respects cancellation
func fetchData(ctx context.Context) ([]byte, error) {
    req, _ := http.NewRequestWithContext(ctx, "GET", "https://slow-api.example.com/data", nil)
    resp, err := http.DefaultClient.Do(req)
    // If ctx is cancelled, this returns immediately
}
```

---

## Creating Contexts

### context.Background and context.TODO

```go
package main

import "context"

func main() {
    // Background: Root context for main, init, tests
    ctx := context.Background()
    
    // TODO: Placeholder when unsure which context to use
    ctx = context.TODO()
}
```

### context.WithCancel

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // Create cancellable context
    ctx, cancel := context.WithCancel(context.Background())
    
    go func() {
        for {
            select {
            case <-ctx.Done():
                fmt.Println("Worker: received cancellation")
                return
            default:
                fmt.Println("Worker: doing work...")
                time.Sleep(500 * time.Millisecond)
            }
        }
    }()
    
    // Let it work for 2 seconds
    time.Sleep(2 * time.Second)
    
    // Cancel the context
    cancel()
    fmt.Println("Main: cancelled context")
    
    // Give worker time to clean up
    time.Sleep(100 * time.Millisecond)
}
```

### context.WithTimeout

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func slowOperation(ctx context.Context) error {
    select {
    case <-time.After(5 * time.Second):
        return nil
    case <-ctx.Done():
        return ctx.Err()  // context.DeadlineExceeded
    }
}

func main() {
    // Context with 2-second timeout
    ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
    defer cancel()  // Always call cancel to release resources
    
    err := slowOperation(ctx)
    if err != nil {
        fmt.Println("Operation failed:", err)
        // Output: Operation failed: context deadline exceeded
    }
}
```

### context.WithDeadline

```go
package main

import (
    "context"
    "fmt"
    "time"
)

func main() {
    // Set absolute deadline
    deadline := time.Now().Add(2 * time.Second)
    ctx, cancel := context.WithDeadline(context.Background(), deadline)
    defer cancel()
    
    // Check deadline
    if d, ok := ctx.Deadline(); ok {
        fmt.Println("Deadline:", d)
    }
    
    select {
    case <-time.After(5 * time.Second):
        fmt.Println("Operation completed")
    case <-ctx.Done():
        fmt.Println("Context cancelled:", ctx.Err())
    }
}
```

---

## Passing Context Through Functions

```go
package main

import (
    "context"
    "fmt"
    "time"
)

// Context should be the first parameter
func processRequest(ctx context.Context, userID int) error {
    // Pass context to sub-operations
    userData, err := fetchUserData(ctx, userID)
    if err != nil {
        return err
    }
    
    return processUserData(ctx, userData)
}

func fetchUserData(ctx context.Context, userID int) (string, error) {
    // Simulate database query
    select {
    case <-time.After(100 * time.Millisecond):
        return fmt.Sprintf("User %d data", userID), nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func processUserData(ctx context.Context, data string) error {
    // Check if context is already cancelled before starting work
    if ctx.Err() != nil {
        return ctx.Err()
    }
    
    // Do processing...
    return nil
}
```

---

## Context Values

Store request-scoped data in context (use sparingly):

```go
package main

import (
    "context"
    "fmt"
)

// Define custom type for context keys to avoid collisions
type contextKey string

const (
    userIDKey    contextKey = "userID"
    requestIDKey contextKey = "requestID"
)

func WithUserID(ctx context.Context, userID int) context.Context {
    return context.WithValue(ctx, userIDKey, userID)
}

func GetUserID(ctx context.Context) (int, bool) {
    userID, ok := ctx.Value(userIDKey).(int)
    return userID, ok
}

func WithRequestID(ctx context.Context, requestID string) context.Context {
    return context.WithValue(ctx, requestIDKey, requestID)
}

func GetRequestID(ctx context.Context) string {
    if v := ctx.Value(requestIDKey); v != nil {
        return v.(string)
    }
    return ""
}

func handleRequest(ctx context.Context) {
    userID, ok := GetUserID(ctx)
    if ok {
        fmt.Println("User ID:", userID)
    }
    
    requestID := GetRequestID(ctx)
    fmt.Println("Request ID:", requestID)
}

func main() {
    ctx := context.Background()
    ctx = WithUserID(ctx, 42)
    ctx = WithRequestID(ctx, "req-123-abc")
    
    handleRequest(ctx)
}
```

---

## HTTP Server with Context

```go
package main

import (
    "context"
    "fmt"
    "net/http"
    "time"
)

func handler(w http.ResponseWriter, r *http.Request) {
    // r.Context() is cancelled when:
    // - Client disconnects
    // - Request times out
    // - Handler returns
    ctx := r.Context()
    
    // Add our own timeout
    ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
    defer cancel()
    
    result, err := slowDatabaseQuery(ctx)
    if err != nil {
        if err == context.DeadlineExceeded {
            http.Error(w, "Request timed out", http.StatusGatewayTimeout)
            return
        }
        if err == context.Canceled {
            // Client disconnected, just return
            return
        }
        http.Error(w, err.Error(), http.StatusInternalServerError)
        return
    }
    
    fmt.Fprint(w, result)
}

func slowDatabaseQuery(ctx context.Context) (string, error) {
    select {
    case <-time.After(3 * time.Second):
        return "Query results", nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}

func main() {
    http.HandleFunc("/", handler)
    http.ListenAndServe(":8080", nil)
}
```

---

## Database Queries with Context

```go
package main

import (
    "context"
    "database/sql"
    "time"
    
    _ "github.com/lib/pq"
)

func getUserByID(ctx context.Context, db *sql.DB, id int) (*User, error) {
    // Context controls query timeout and cancellation
    ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
    defer cancel()
    
    row := db.QueryRowContext(ctx, "SELECT id, name, email FROM users WHERE id = $1", id)
    
    var user User
    err := row.Scan(&user.ID, &user.Name, &user.Email)
    if err != nil {
        return nil, err
    }
    return &user, nil
}

func getUsers(ctx context.Context, db *sql.DB) ([]User, error) {
    rows, err := db.QueryContext(ctx, "SELECT id, name, email FROM users")
    if err != nil {
        return nil, err
    }
    defer rows.Close()
    
    var users []User
    for rows.Next() {
        // Check context before processing each row
        if ctx.Err() != nil {
            return nil, ctx.Err()
        }
        
        var u User
        if err := rows.Scan(&u.ID, &u.Name, &u.Email); err != nil {
            return nil, err
        }
        users = append(users, u)
    }
    return users, rows.Err()
}
```

---

## Cancelling Multiple Goroutines

```go
package main

import (
    "context"
    "fmt"
    "sync"
    "time"
)

func worker(ctx context.Context, id int, wg *sync.WaitGroup) {
    defer wg.Done()
    
    for {
        select {
        case <-ctx.Done():
            fmt.Printf("Worker %d: shutting down\n", id)
            return
        case <-time.After(500 * time.Millisecond):
            fmt.Printf("Worker %d: working\n", id)
        }
    }
}

func main() {
    ctx, cancel := context.WithCancel(context.Background())
    var wg sync.WaitGroup
    
    // Start multiple workers
    for i := 1; i <= 3; i++ {
        wg.Add(1)
        go worker(ctx, i, &wg)
    }
    
    // Let them work
    time.Sleep(2 * time.Second)
    
    // Cancel all workers at once
    fmt.Println("Main: cancelling all workers")
    cancel()
    
    // Wait for graceful shutdown
    wg.Wait()
    fmt.Println("Main: all workers stopped")
}
```

---

## Context Error Handling

```go
package main

import (
    "context"
    "errors"
    "fmt"
    "time"
)

func operation(ctx context.Context) error {
    select {
    case <-time.After(5 * time.Second):
        return nil
    case <-ctx.Done():
        return ctx.Err()
    }
}

func main() {
    // Test timeout
    ctx1, cancel1 := context.WithTimeout(context.Background(), 1*time.Second)
    defer cancel1()
    
    err := operation(ctx1)
    if err != nil {
        if errors.Is(err, context.DeadlineExceeded) {
            fmt.Println("Operation timed out")
        } else if errors.Is(err, context.Canceled) {
            fmt.Println("Operation was cancelled")
        }
    }
    
    // Test cancellation
    ctx2, cancel2 := context.WithCancel(context.Background())
    
    go func() {
        time.Sleep(1 * time.Second)
        cancel2()  // Cancel manually
    }()
    
    err = operation(ctx2)
    if errors.Is(err, context.Canceled) {
        fmt.Println("Second operation was cancelled")
    }
}
```

---

## Common Patterns

### Pattern 1: Timeout with Cleanup

```go
func fetchWithCleanup(ctx context.Context, url string) (*Result, error) {
    ctx, cancel := context.WithTimeout(ctx, 10*time.Second)
    defer cancel()  // ALWAYS defer cancel
    
    req, err := http.NewRequestWithContext(ctx, "GET", url, nil)
    if err != nil {
        return nil, err
    }
    
    resp, err := http.DefaultClient.Do(req)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()
    
    // Process response...
    return result, nil
}
```

### Pattern 2: Graceful Shutdown

```go
func runServer(ctx context.Context) error {
    server := &http.Server{Addr: ":8080"}
    
    // Shutdown goroutine
    go func() {
        <-ctx.Done()
        shutdownCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
        defer cancel()
        server.Shutdown(shutdownCtx)
    }()
    
    return server.ListenAndServe()
}
```

### Pattern 3: First Successful Result

```go
func fetchFirst(ctx context.Context, urls []string) (string, error) {
    ctx, cancel := context.WithCancel(ctx)
    defer cancel()  // Cancel other goroutines when we get first result
    
    results := make(chan string, 1)
    errs := make(chan error, len(urls))
    
    for _, url := range urls {
        go func(url string) {
            result, err := fetchURL(ctx, url)
            if err != nil {
                errs <- err
                return
            }
            select {
            case results <- result:
            default:
            }
        }(url)
    }
    
    select {
    case result := <-results:
        return result, nil
    case <-ctx.Done():
        return "", ctx.Err()
    }
}
```

---

## Summary

| Function | Purpose |
|----------|---------|
| `context.Background()` | Root context for main, init, tests |
| `context.TODO()` | Placeholder when unsure |
| `context.WithCancel(parent)` | Create cancellable context |
| `context.WithTimeout(parent, duration)` | Create context with timeout |
| `context.WithDeadline(parent, time)` | Create context with absolute deadline |
| `context.WithValue(parent, key, val)` | Attach request-scoped data |

**Best Practices:**

1. Context should be the first function parameter
2. Never store context in structs
3. Always call cancel functions (use `defer`)
4. Use context values sparingly, only for request-scoped data
5. Check `ctx.Err()` before expensive operations
6. Pass context to all I/O operations

---

*Managing complex distributed systems? [OneUptime](https://oneuptime.com) provides distributed tracing that follows context propagation across your services, helping you debug timeout and cancellation issues.*
