# How to Handle Errors in Dapr Go SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Error Handling, Resilience, SDK, Microservice

Description: Handle Dapr Go SDK errors using gRPC status codes, structured error inspection, retry patterns, and pub/sub retry semantics for resilient microservices.

---

## Overview

Dapr Go SDK functions return standard Go errors that wrap gRPC status information. Understanding how to inspect these errors and apply the correct response - retry, circuit break, or fail fast - is essential for building resilient microservices.

## Inspecting gRPC Status Errors

```go
import (
    dapr "github.com/dapr/go-sdk/client"
    "google.golang.org/grpc/codes"
    "google.golang.org/grpc/status"
)

content := &dapr.DataContent{ContentType: "application/json"}
resp, err := client.InvokeMethodWithContent(ctx, "payment-service", "charge", "POST", content)
if err != nil {
    st, ok := status.FromError(err)
    if ok {
        switch st.Code() {
        case codes.Unavailable:
            log.Printf("Service unavailable, will retry: %s", st.Message())
            return err // trigger retry
        case codes.NotFound:
            log.Printf("Resource not found: %s", st.Message())
            return nil // do not retry
        case codes.InvalidArgument:
            log.Printf("Bad request: %s", st.Message())
            return nil // caller error, do not retry
        default:
            log.Printf("Unexpected error [%s]: %s", st.Code(), st.Message())
            return err
        }
    }
    return err
}
```

## Retrying Transient Errors

Use a simple retry loop with exponential backoff for transient failures:

```go
func invokeWithRetry(ctx context.Context, client dapr.Client,
    appID, method, verb string, maxAttempts int) ([]byte, error) {

    var lastErr error
    content := &dapr.DataContent{ContentType: "application/json"}
    for attempt := 0; attempt < maxAttempts; attempt++ {
        if attempt > 0 {
            backoff := time.Duration(1<<attempt) * 100 * time.Millisecond
            time.Sleep(backoff)
        }

        resp, err := client.InvokeMethodWithContent(ctx, appID, method, verb, content)
        if err == nil {
            return resp, nil
        }

        st, ok := status.FromError(err)
        if ok && st.Code() == codes.Unavailable {
            lastErr = err
            continue // retry
        }
        return nil, err // non-retryable
    }
    return nil, fmt.Errorf("all %d attempts failed: %w", maxAttempts, lastErr)
}
```

## Pub/Sub Error Semantics

In topic event handlers, the return value controls whether Dapr retries delivery:

```go
func handleEvent(ctx context.Context, e *common.TopicEvent) (retry bool, err error) {
    var payload MyPayload
    if err := e.Struct(&payload); err != nil {
        // Bad message format - never going to succeed, do not retry
        log.Printf("Invalid message format: %v", err)
        return false, nil // drop the message
    }

    if err := processPayload(ctx, payload); err != nil {
        if isTransient(err) {
            return true, err // retry
        }
        return false, err // dead-letter
    }
    return false, nil
}

func isTransient(err error) bool {
    st, ok := status.FromError(err)
    return ok && (st.Code() == codes.Unavailable || st.Code() == codes.DeadlineExceeded)
}
```

## State Operation Error Handling

```go
item, err := client.GetState(ctx, "statestore", "order:1", nil)
if err != nil {
    st, _ := status.FromError(err)
    if st.Code() == codes.Internal {
        return fmt.Errorf("state store unavailable: %w", err)
    }
    return err
}

if item.Value == nil {
    // Key does not exist - not an error in Dapr
    return ErrOrderNotFound
}
```

## Wrapping Errors for Context

```go
if err := client.SaveState(ctx, "statestore", key, data, nil); err != nil {
    return fmt.Errorf("saving order %s: %w", orderID, err)
}
```

## Summary

Dapr Go SDK errors wrap gRPC status codes accessible via `status.FromError`. Distinguishing `codes.Unavailable` (transient, retry) from `codes.NotFound` or `codes.InvalidArgument` (permanent, do not retry) is the core of resilient error handling. In pub/sub handlers, returning `(true, err)` signals Dapr to redeliver the message while `(false, nil)` drops it cleanly.
