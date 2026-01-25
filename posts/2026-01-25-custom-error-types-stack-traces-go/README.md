# How to Design Custom Error Types with Stack Traces in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Go, Error Handling, Stack Traces, Debugging, Best Practices

Description: Learn how to build custom error types in Go that capture stack traces automatically, making debugging production issues significantly easier without sacrificing performance.

---

Go's error handling is simple by design. You return an error, check if it's nil, and handle it accordingly. But when something goes wrong in production at 3 AM, a plain "connection refused" error doesn't tell you much. Where did it originate? What was the call path? This is where custom error types with stack traces become invaluable.

## The Problem with Standard Errors

Consider a typical Go error scenario:

```go
func fetchUser(id string) (*User, error) {
    user, err := db.Query(id)
    if err != nil {
        return nil, fmt.Errorf("failed to fetch user: %w", err)
    }
    return user, nil
}
```

When this error bubbles up through multiple layers, you get something like:

```
failed to process request: failed to fetch user: connection refused
```

Helpful? Somewhat. But you still don't know which line triggered the failure or what the call stack looked like. Let's fix that.

## Building a Stack Trace Error Type

First, we need a way to capture the current call stack. Go's `runtime` package provides this functionality:

```go
package errors

import (
    "fmt"
    "runtime"
    "strings"
)

// Frame represents a single stack frame
type Frame struct {
    Function string
    File     string
    Line     int
}

// StackError is an error that captures the stack trace at creation time
type StackError struct {
    message string
    cause   error
    frames  []Frame
}

// New creates a new error with stack trace
func New(message string) *StackError {
    return &StackError{
        message: message,
        frames:  captureStack(2), // skip New and captureStack
    }
}

// Wrap wraps an existing error with additional context and stack trace
func Wrap(err error, message string) *StackError {
    if err == nil {
        return nil
    }
    return &StackError{
        message: message,
        cause:   err,
        frames:  captureStack(2),
    }
}
```

The `captureStack` function does the heavy lifting:

```go
// captureStack captures the current call stack, skipping the specified frames
func captureStack(skip int) []Frame {
    var frames []Frame

    // Allocate buffer for program counters
    pcs := make([]uintptr, 32)
    n := runtime.Callers(skip+1, pcs)

    if n == 0 {
        return frames
    }

    // Get frame details from program counters
    runtimeFrames := runtime.CallersFrames(pcs[:n])

    for {
        frame, more := runtimeFrames.Next()

        // Skip runtime internals
        if strings.Contains(frame.Function, "runtime.") {
            if !more {
                break
            }
            continue
        }

        frames = append(frames, Frame{
            Function: frame.Function,
            File:     frame.File,
            Line:     frame.Line,
        })

        if !more {
            break
        }
    }

    return frames
}
```

## Implementing the Error Interface

For our custom type to work seamlessly with Go's error handling, we need to implement the standard interfaces:

```go
// Error implements the error interface
func (e *StackError) Error() string {
    if e.cause != nil {
        return fmt.Sprintf("%s: %v", e.message, e.cause)
    }
    return e.message
}

// Unwrap returns the underlying error for errors.Is and errors.As
func (e *StackError) Unwrap() error {
    return e.cause
}

// StackTrace returns a formatted stack trace string
func (e *StackError) StackTrace() string {
    var sb strings.Builder

    sb.WriteString(e.Error())
    sb.WriteString("\n\nStack trace:\n")

    for i, frame := range e.frames {
        sb.WriteString(fmt.Sprintf("  %d. %s\n", i+1, frame.Function))
        sb.WriteString(fmt.Sprintf("     %s:%d\n", frame.File, frame.Line))
    }

    return sb.String()
}
```

## Adding Structured Context

Plain error messages are fine, but structured context makes errors much more useful for logging and analysis:

```go
// StackError with context support
type StackError struct {
    message string
    cause   error
    frames  []Frame
    context map[string]interface{}
}

// WithContext adds key-value context to the error
func (e *StackError) WithContext(key string, value interface{}) *StackError {
    if e.context == nil {
        e.context = make(map[string]interface{})
    }
    e.context[key] = value
    return e
}

// Context returns the error's context map
func (e *StackError) Context() map[string]interface{} {
    return e.context
}
```

Now you can add relevant debugging information:

```go
func processOrder(orderID string, userID string) error {
    order, err := fetchOrder(orderID)
    if err != nil {
        return errors.Wrap(err, "failed to process order").
            WithContext("order_id", orderID).
            WithContext("user_id", userID)
    }
    return nil
}
```

## Practical Usage Example

Here's how everything comes together in a real application:

```go
package main

import (
    "fmt"
    "myapp/errors"
)

func main() {
    err := handleRequest("user-123", "order-456")
    if err != nil {
        // For logging, get the full stack trace
        if stackErr, ok := err.(*errors.StackError); ok {
            fmt.Println(stackErr.StackTrace())

            // Access structured context for metrics or alerting
            ctx := stackErr.Context()
            fmt.Printf("Failed for user: %v\n", ctx["user_id"])
        }
    }
}

func handleRequest(userID, orderID string) error {
    return processPayment(userID, orderID)
}

func processPayment(userID, orderID string) error {
    err := chargeCard(userID)
    if err != nil {
        return errors.Wrap(err, "payment processing failed").
            WithContext("user_id", userID).
            WithContext("order_id", orderID)
    }
    return nil
}

func chargeCard(userID string) error {
    // Simulating a failure
    return errors.New("card declined")
}
```

This produces output like:

```
payment processing failed: card declined

Stack trace:
  1. main.chargeCard
     /app/main.go:32
  2. main.processPayment
     /app/main.go:25
  3. main.handleRequest
     /app/main.go:19
  4. main.main
     /app/main.go:10
```

## Performance Considerations

Capturing stack traces isn't free. The `runtime.Callers` function allocates memory and does non-trivial work. Here are some strategies to keep things performant:

**Lazy Stack Capture**: Only capture the stack when you actually need it:

```go
type LazyStackError struct {
    message string
    cause   error
    pcs     []uintptr  // Store raw program counters
    frames  []Frame    // Populated on demand
}

func (e *LazyStackError) Frames() []Frame {
    if e.frames == nil && len(e.pcs) > 0 {
        e.frames = resolveFrames(e.pcs)
    }
    return e.frames
}
```

**Sampling**: In high-throughput systems, you might only capture stacks for a percentage of errors:

```go
func NewSampled(message string, sampleRate float64) error {
    if rand.Float64() > sampleRate {
        return &StackError{message: message}
    }
    return &StackError{
        message: message,
        frames:  captureStack(2),
    }
}
```

## Integration with Logging Libraries

Most logging libraries accept structured fields. Here's integration with a typical structured logger:

```go
func logError(logger *slog.Logger, err error) {
    stackErr, ok := err.(*errors.StackError)
    if !ok {
        logger.Error("error occurred", "error", err.Error())
        return
    }

    attrs := []any{
        "error", stackErr.Error(),
        "stack", stackErr.StackTrace(),
    }

    // Add all context as log attributes
    for k, v := range stackErr.Context() {
        attrs = append(attrs, k, v)
    }

    logger.Error("error occurred", attrs...)
}
```

## When to Use Stack Trace Errors

Stack traces add overhead, so use them judiciously:

- Use them for unexpected errors that indicate bugs or system failures
- Skip them for expected errors like validation failures or "not found" scenarios
- Always use them in development and staging environments
- Consider sampling in high-traffic production systems

## Wrapping Up

Custom error types with stack traces bridge the gap between Go's simple error model and the debugging needs of production systems. The key is capturing enough context to diagnose issues without overwhelming your logs or impacting performance.

Start with the basic implementation shown here, then adapt it to your needs. Add context fields that matter for your domain. Integrate with your logging and monitoring stack. Your future self, debugging a production issue at 3 AM, will thank you.
