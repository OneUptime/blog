# How to Create Custom Error Types with Stack Traces in Go

Author: [nawazdhandala](https://github.com/nawazdhandala)

Tags: Go, Errors, Debugging, Observability

Description: Learn how to create custom error types in Go with stack traces using pkg/errors for better debugging and error tracking.

---

Error handling in Go is deliberately simple, but production systems often need more context than a basic error string provides. When debugging issues in distributed systems, knowing where an error originated and how it propagated through your code is invaluable. This guide explores how to create custom error types with stack traces for better debugging and observability.

## The Limitations of errors.New

Go's standard library provides `errors.New` for creating simple errors:

```go
import "errors"

func fetchUser(id string) (*User, error) {
    return nil, errors.New("user not found")
}
```

While straightforward, this approach lacks context. When this error bubbles up through multiple layers, you lose information about where it originated and what conditions led to it.

## Implementing the Error Interface

Go's `error` interface is simple:

```go
type error interface {
    Error() string
}
```

You can create custom error types by implementing this interface:

```go
type NotFoundError struct {
    Resource string
    ID       string
}

func (e *NotFoundError) Error() string {
    return fmt.Sprintf("%s with ID %s not found", e.Resource, e.ID)
}

func fetchUser(id string) (*User, error) {
    // ... database lookup
    return nil, &NotFoundError{Resource: "User", ID: id}
}
```

Custom types let you carry structured data, enabling callers to make decisions based on error properties rather than parsing strings.

## Adding Stack Traces with pkg/errors

The `github.com/pkg/errors` package (now largely superseded by standard library features, but still widely used) adds stack trace capture:

```go
import "github.com/pkg/errors"

func fetchUser(id string) (*User, error) {
    user, err := db.Query(id)
    if err != nil {
        return nil, errors.Wrap(err, "failed to fetch user")
    }
    return user, nil
}
```

To capture a stack trace with a new error:

```go
return nil, errors.New("user not found") // Captures stack trace
```

Print the full stack trace with:

```go
fmt.Printf("%+v\n", err)
```

## Creating Custom Errors with Stack Traces

Combine custom error types with stack traces for maximum debugging power:

```go
import (
    "fmt"
    "github.com/pkg/errors"
)

type AppError struct {
    Code    string
    Message string
    Err     error
    stack   errors.StackTrace
}

func NewAppError(code, message string) *AppError {
    err := errors.New(message)
    return &AppError{
        Code:    code,
        Message: message,
        Err:     err,
        stack:   errors.WithStack(err).(stackTracer).StackTrace(),
    }
}

func (e *AppError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func (e *AppError) Unwrap() error {
    return e.Err
}

type stackTracer interface {
    StackTrace() errors.StackTrace
}

func (e *AppError) StackTrace() errors.StackTrace {
    return e.stack
}
```

## Error Wrapping and the Unwrap Method

Go 1.13 introduced error wrapping in the standard library. Implement `Unwrap()` to enable error chain inspection:

```go
type ValidationError struct {
    Field string
    Err   error
}

func (e *ValidationError) Error() string {
    return fmt.Sprintf("validation failed for field %s: %v", e.Field, e.Err)
}

func (e *ValidationError) Unwrap() error {
    return e.Err
}
```

Wrap errors to add context while preserving the original:

```go
func validateAndSave(user *User) error {
    if err := validate(user); err != nil {
        return fmt.Errorf("save failed: %w", err) // %w wraps the error
    }
    return nil
}
```

## Using errors.Is and errors.As

These functions inspect error chains, even through wrapped errors:

```go
var ErrNotFound = errors.New("not found")

func handleRequest() {
    err := fetchUser("123")

    // Check if any error in the chain matches
    if errors.Is(err, ErrNotFound) {
        // Handle not found case
    }

    // Extract a specific error type from the chain
    var appErr *AppError
    if errors.As(err, &appErr) {
        log.Printf("Error code: %s", appErr.Code)
    }
}
```

## Structured Error Logging

For production observability, log errors with structured fields:

```go
import "log/slog"

func logError(err error) {
    var appErr *AppError
    if errors.As(err, &appErr) {
        slog.Error("application error",
            "code", appErr.Code,
            "message", appErr.Message,
            "stack", fmt.Sprintf("%+v", appErr.StackTrace()),
        )
        return
    }
    slog.Error("unexpected error", "error", err)
}
```

This enables filtering and aggregating errors by code in logging systems like Elasticsearch or Datadog.

## Best Practices

1. **Use sentinel errors for expected conditions**: Define package-level errors like `ErrNotFound` for conditions callers should handle.

2. **Use custom types for rich context**: When errors need to carry data (codes, fields, metadata), create a struct type.

3. **Capture stack traces at the origin**: Add stack traces when errors are created, not when they're wrapped.

4. **Always implement Unwrap**: Enable `errors.Is` and `errors.As` to work through your error chains.

5. **Log once at the top**: Avoid logging errors at every layer. Log with full context at the top of your call stack.

Custom error types with stack traces transform debugging from guesswork into a straightforward process. When an error occurs in production, you'll have the exact call stack and structured context needed to identify and fix issues quickly.
