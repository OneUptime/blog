# How to Use defer Correctly in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Golang, defer, Cleanup, Error Handling, Best Practices

Description: Master Go's defer statement for cleanup, resource management, and error handling with proper understanding of evaluation timing and execution order.

---

Go's `defer` statement schedules a function call to run when the surrounding function returns. It's essential for cleanup operations, but its timing behavior can be tricky. This guide covers proper usage and common pitfalls.

---

## Basic Usage

```go
package main

import (
    "fmt"
    "os"
)

func main() {
    file, err := os.Open("file.txt")
    if err != nil {
        panic(err)
    }
    defer file.Close()  // Runs when main() returns
    
    // Work with file...
    fmt.Println("Working with file")
}
// file.Close() runs here
```

---

## Execution Order (LIFO)

Deferred calls execute in Last-In-First-Out order:

```go
package main

import "fmt"

func main() {
    defer fmt.Println("First defer")
    defer fmt.Println("Second defer")
    defer fmt.Println("Third defer")
    
    fmt.Println("Main function body")
}

// Output:
// Main function body
// Third defer
// Second defer
// First defer
```

This is useful for nested resource cleanup:

```go
func example() {
    file, _ := os.Open("file.txt")
    defer file.Close()  // Closes second
    
    conn, _ := net.Dial("tcp", "localhost:8080")
    defer conn.Close()  // Closes first
    
    // Work with both resources
}
// conn closes, then file closes
```

---

## Argument Evaluation Timing

**Critical**: Arguments are evaluated when defer is executed, not when the deferred function runs:

```go
package main

import "fmt"

func main() {
    x := 10
    defer fmt.Println("Deferred x:", x)  // x=10 captured NOW
    
    x = 20
    fmt.Println("Current x:", x)
}

// Output:
// Current x: 20
// Deferred x: 10  (not 20!)
```

### Using Closures for Current Value

```go
package main

import "fmt"

func main() {
    x := 10
    
    // Closure captures variable by reference
    defer func() {
        fmt.Println("Deferred x:", x)
    }()
    
    x = 20
    fmt.Println("Current x:", x)
}

// Output:
// Current x: 20
// Deferred x: 20  (closure sees current value)
```

---

## Common Patterns

### Pattern 1: File Operations

```go
func readFile(path string) ([]byte, error) {
    file, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    defer file.Close()  // Always closes, even on error
    
    return io.ReadAll(file)
}
```

### Pattern 2: Mutex Unlock

```go
var mu sync.Mutex

func safeOperation() {
    mu.Lock()
    defer mu.Unlock()  // Always unlocks
    
    // Critical section
    // Even if panic occurs, mutex unlocks
}
```

### Pattern 3: Database Transactions

```go
func updateUser(db *sql.DB, userID int) error {
    tx, err := db.Begin()
    if err != nil {
        return err
    }
    defer tx.Rollback()  // Rollback if not committed
    
    // Perform operations
    if err := doUpdate(tx, userID); err != nil {
        return err  // Rollback will run
    }
    
    return tx.Commit()  // Commit success, Rollback is no-op
}
```

### Pattern 4: HTTP Response Body

```go
func fetchURL(url string) ([]byte, error) {
    resp, err := http.Get(url)
    if err != nil {
        return nil, err
    }
    defer resp.Body.Close()  // Always close body
    
    return io.ReadAll(resp.Body)
}
```

### Pattern 5: Timing/Tracing

```go
func slowOperation() {
    defer timeTrack(time.Now(), "slowOperation")
    
    // Long operation
    time.Sleep(2 * time.Second)
}

func timeTrack(start time.Time, name string) {
    elapsed := time.Since(start)
    log.Printf("%s took %s", name, elapsed)
}
```

---

## Modifying Return Values

Deferred functions can access and modify named return values:

```go
package main

import "fmt"

func example() (result int) {
    defer func() {
        result = result * 2  // Modify return value
    }()
    
    return 5  // Before defer runs, result = 5
}
// After defer runs, result = 10

func main() {
    fmt.Println(example())  // Prints: 10
}
```

### Error Wrapping Pattern

```go
func processFile(path string) (err error) {
    file, err := os.Open(path)
    if err != nil {
        return err
    }
    defer file.Close()
    
    // Wrap any error with file context
    defer func() {
        if err != nil {
            err = fmt.Errorf("processing %s: %w", path, err)
        }
    }()
    
    // Process file
    return doProcessing(file)
}
```

---

## Panic Recovery

Defer is the only way to recover from panics:

```go
func safeCall(fn func()) (recovered bool) {
    defer func() {
        if r := recover(); r != nil {
            fmt.Println("Recovered:", r)
            recovered = true
        }
    }()
    
    fn()
    return false
}

func main() {
    recovered := safeCall(func() {
        panic("something went wrong")
    })
    
    fmt.Println("Recovered:", recovered)
    fmt.Println("Program continues")
}
```

---

## Common Mistakes

### Mistake 1: Defer in Loop

```go
// WRONG: Opens many files, only closes at function end
func processFiles(paths []string) {
    for _, path := range paths {
        file, _ := os.Open(path)
        defer file.Close()  // All close at end of function!
        // process file
    }
}
// All files stay open until function returns - resource leak!
```

```go
// CORRECT: Use helper function
func processFiles(paths []string) {
    for _, path := range paths {
        processOneFile(path)  // Defers run after each call
    }
}

func processOneFile(path string) {
    file, _ := os.Open(path)
    defer file.Close()  // Closes when this function returns
    // process file
}
```

### Mistake 2: Ignoring Error from Deferred Call

```go
// WRONG: Ignoring close error
defer file.Close()

// CORRECT: Handle error
defer func() {
    if err := file.Close(); err != nil {
        log.Printf("failed to close file: %v", err)
    }
}()

// Or capture in return value
func readFile(path string) (data []byte, err error) {
    file, err := os.Open(path)
    if err != nil {
        return nil, err
    }
    
    defer func() {
        cerr := file.Close()
        if err == nil {
            err = cerr  // Only set if no prior error
        }
    }()
    
    return io.ReadAll(file)
}
```

### Mistake 3: Deferring Method on Nil

```go
// WRONG: Will panic in defer
func example() {
    var file *os.File  // nil
    defer file.Close() // Panic when defer runs!
    
    file, _ = os.Open("file.txt")  // file is now valid
}
```

```go
// CORRECT: Defer after checking error
func example() {
    file, err := os.Open("file.txt")
    if err != nil {
        return
    }
    defer file.Close()  // file is guaranteed non-nil
}
```

### Mistake 4: Expecting Arguments to Be Current

```go
// WRONG: Expecting i to be current
for i := 0; i < 3; i++ {
    defer fmt.Println(i)  // Captures i at time of defer
}
// Prints: 2, 1, 0 (correct values, but LIFO order)
```

```go
// Use closure if you need different behavior
for i := 0; i < 3; i++ {
    i := i  // Shadow variable
    defer func() {
        fmt.Println(i)
    }()
}
```

---

## Performance Considerations

Defer has minimal overhead in modern Go (Go 1.14+), but in hot paths:

```go
// Slightly faster without defer (micro-optimization)
func lockUnlock() {
    mu.Lock()
    // simple, guaranteed-safe operation
    mu.Unlock()
}

// Prefer defer for safety in complex functions
func complexOperation() {
    mu.Lock()
    defer mu.Unlock()
    
    // Multiple return paths, panic possible
    if condition1 {
        return
    }
    if condition2 {
        panic("error")
    }
    // more code
}
```

---

## Summary

| Aspect | Behavior |
|--------|----------|
| Execution | When surrounding function returns |
| Order | LIFO (last defer runs first) |
| Arguments | Evaluated when defer statement runs |
| Return values | Can modify named return values |
| Panics | Only defer can recover |

**Best Practices:**

1. Use `defer` immediately after acquiring a resource
2. Don't defer in loops - use helper functions
3. Handle errors from deferred calls when important
4. Use named returns to modify values in defer
5. Prefer defer for cleanup even with slight overhead

**Common Uses:**

- File/connection closing
- Mutex unlocking
- Transaction rollback
- Timing/tracing
- Panic recovery

---

*Building reliable Go applications? [OneUptime](https://oneuptime.com) provides comprehensive monitoring to ensure your cleanup code runs correctly in production.*
