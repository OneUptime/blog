# How to Implement Workflow Activity Retry Policies in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Retry, Activity, Resilience

Description: Configure activity retry policies in Dapr workflows with exponential backoff, max attempts, and error classification to handle transient failures automatically.

---

## Overview

Dapr Workflow activities run exactly-once per step, but transient failures (network errors, service unavailability) require retries. Dapr provides configurable retry policies at the activity call level with exponential backoff and max attempt caps.

## Basic Retry Policy

```go
package main

import (
    "time"
    "github.com/dapr/durabletask-go/workflow"
)

func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    retryPolicy := &workflow.RetryPolicy{
        MaxAttempts:          5,
        InitialRetryInterval: 2 * time.Second,
        BackoffCoefficient:   2.0,
        MaxRetryInterval:     30 * time.Second,
        RetryTimeout:         5 * time.Minute,
    }

    var result PaymentResult
    err := ctx.CallActivity(ProcessPayment,
        workflow.WithActivityInput(order),
        workflow.WithActivityRetryPolicy(retryPolicy)).Await(&result)

    if err != nil {
        return nil, err
    }
    return result, nil
}
```

## Retry Interval Calculation

With `BackoffCoefficient: 2.0` and `InitialRetryInterval: 2s`:
- Attempt 1 fails - wait 2s
- Attempt 2 fails - wait 4s
- Attempt 3 fails - wait 8s
- Attempt 4 fails - wait 16s
- Attempt 5 fails - wait 30s (capped by MaxRetryInterval)

## Activity with Transient Error Classification

```go
type TransientError struct {
    Cause error
}

func (e *TransientError) Error() string {
    return fmt.Sprintf("transient: %v", e.Cause)
}

func CallExternalAPI(ctx workflow.ActivityContext) (any, error) {
    var input APIInput
    ctx.GetInput(&input)

    resp, err := http.Post(input.URL, "application/json", input.Body)
    if err != nil {
        return nil, &TransientError{Cause: err}
    }
    defer resp.Body.Close()

    if resp.StatusCode == 429 || resp.StatusCode >= 500 {
        return nil, &TransientError{
            Cause: fmt.Errorf("HTTP %d", resp.StatusCode),
        }
    }
    if resp.StatusCode >= 400 {
        // Client error - not retryable
        return nil, fmt.Errorf("client error HTTP %d", resp.StatusCode)
    }

    var result map[string]any
    json.NewDecoder(resp.Body).Decode(&result)
    return result, nil
}
```

## Different Retry Policies Per Activity

Apply different policies based on activity characteristics:

```go
func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Aggressive retry for idempotent payment check
    checkPolicy := &workflow.RetryPolicy{
        MaxAttempts:          10,
        InitialRetryInterval: 1 * time.Second,
        BackoffCoefficient:   1.5,
    }

    // Conservative retry for email (idempotency via dedup)
    emailPolicy := &workflow.RetryPolicy{
        MaxAttempts:          3,
        InitialRetryInterval: 10 * time.Second,
        BackoffCoefficient:   2.0,
    }

    var paymentStatus PaymentStatus
    ctx.CallActivity(CheckPaymentStatus,
        workflow.WithActivityInput(order.PaymentID),
        workflow.WithActivityRetryPolicy(checkPolicy)).Await(&paymentStatus)

    ctx.CallActivity(SendConfirmationEmail,
        workflow.WithActivityInput(order),
        workflow.WithActivityRetryPolicy(emailPolicy)).Await(nil)

    return map[string]any{"status": "complete"}, nil
}
```

## No-Retry Policy for Non-Idempotent Activities

```go
noRetry := &workflow.RetryPolicy{
    MaxAttempts: 1,
}

// Charge credit card - only once
ctx.CallActivity(ChargeCreditCard,
    workflow.WithActivityInput(paymentDetails),
    workflow.WithActivityRetryPolicy(noRetry)).Await(&result)
```

## Observing Retry Attempts

Check workflow status to see the outcome after retries complete:

```bash
curl "http://localhost:3500/v1.0/workflows/dapr/order-123" \
  | jq '.'
```

## Summary

Dapr Workflow activity retry policies support exponential backoff via `BackoffCoefficient`, bounded by `MaxRetryInterval` and overall `RetryTimeout`. Configure aggressive retries for read-only or idempotent activities, conservative retries for external API calls, and no-retry for non-idempotent operations like charging a credit card. Log transient vs permanent errors distinctly for effective debugging.
