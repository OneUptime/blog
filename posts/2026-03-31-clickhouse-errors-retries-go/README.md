# How to Handle ClickHouse Errors and Retries in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: ClickHouse, Go, Error Handling, Retry, Resilience

Description: Learn how to handle ClickHouse errors in Go, distinguish retriable from non-retriable errors, and implement exponential backoff retry logic for robust pipelines.

---

## ClickHouse Error Types

ClickHouse returns typed errors with numeric error codes. The Go client wraps these in `*clickhouse.Exception`:

```go
import "github.com/ClickHouse/clickhouse-go/v2"

func isClickHouseException(err error) (*clickhouse.Exception, bool) {
    var ex *clickhouse.Exception
    if errors.As(err, &ex) {
        return ex, true
    }
    return nil, false
}
```

Common error codes:

| Code | Description |
|---|---|
| 252 | Too many parts - insert rate exceeds merge rate |
| 241 | Memory limit exceeded |
| 202 | Too many simultaneous queries |
| 516 | Authentication error (not retriable) |
| 60 | Unknown table (not retriable) |

## Retriable vs. Non-Retriable Errors

```go
var retriableCodes = map[int32]bool{
    252: true,  // too many parts
    202: true,  // too many queries
    209: true,  // socket timeout
    210: true,  // network error
}

func isRetriable(err error) bool {
    if ex, ok := isClickHouseException(err); ok {
        return retriableCodes[ex.Code]
    }
    // Network errors are retriable
    var netErr net.Error
    return errors.As(err, &netErr) && netErr.Timeout()
}
```

## Exponential Backoff Retry

```go
import (
    "math"
    "time"
)

type RetryConfig struct {
    MaxAttempts int
    BaseDelay   time.Duration
    MaxDelay    time.Duration
    Multiplier  float64
}

func WithRetry(cfg RetryConfig, operation func() error) error {
    var lastErr error
    for attempt := 0; attempt < cfg.MaxAttempts; attempt++ {
        lastErr = operation()
        if lastErr == nil {
            return nil
        }
        if !isRetriable(lastErr) {
            return fmt.Errorf("non-retriable error: %w", lastErr)
        }

        delay := time.Duration(float64(cfg.BaseDelay) * math.Pow(cfg.Multiplier, float64(attempt)))
        if delay > cfg.MaxDelay {
            delay = cfg.MaxDelay
        }
        // Add jitter
        jitter := time.Duration(rand.Int63n(int64(delay / 4)))
        time.Sleep(delay + jitter)

        log.Printf("Retry %d/%d after error: %v", attempt+1, cfg.MaxAttempts, lastErr)
    }
    return fmt.Errorf("max retries exceeded: %w", lastErr)
}
```

## Using Retry with ClickHouse Inserts

```go
cfg := RetryConfig{
    MaxAttempts: 5,
    BaseDelay:   500 * time.Millisecond,
    MaxDelay:    30 * time.Second,
    Multiplier:  2.0,
}

err := WithRetry(cfg, func() error {
    return bulkInsert(conn, events)
})
if err != nil {
    log.Fatalf("Insert failed permanently: %v", err)
}
```

## Handling Too Many Parts (Code 252)

When you get error code 252, the best response is to slow down inserts:

```go
if ex, ok := isClickHouseException(err); ok && ex.Code == 252 {
    log.Println("Too many parts - pausing inserts for 10 seconds")
    time.Sleep(10 * time.Second)
}
```

## Context-Aware Retry

Respect context cancellation during retry sleep:

```go
select {
case <-ctx.Done():
    return ctx.Err()
case <-time.After(delay):
}
```

## Summary

ClickHouse Go error handling distinguishes typed `*clickhouse.Exception` errors by error code. Retriable errors (too many parts, network timeouts, query overload) should trigger exponential backoff with jitter. Non-retriable errors (authentication failure, unknown table) should fail immediately. Context cancellation should interrupt retry loops.
