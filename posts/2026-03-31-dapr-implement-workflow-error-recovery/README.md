# How to Implement Workflow Error Recovery in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Error Recovery, Compensation, Durability

Description: Implement robust error recovery patterns in Dapr workflows including try-catch, compensation logic, and structured error handling for resilient pipelines.

---

## Overview

Dapr Workflow provides try-catch-style error handling where activity failures are surfaced as typed errors. You can catch, compensate, and recover from failures without losing workflow state.

## Basic Error Handling in Workflows

```go
package main

import (
    "fmt"
    "github.com/dapr/go-sdk/workflow"
)

func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    var paymentResult PaymentResult
    err := ctx.CallActivity(ProcessPayment,
        workflow.WithActivityInput(order)).Await(&paymentResult)

    if err != nil {
        // Log the failure and return a structured error
        fmt.Printf("Payment failed for order %s: %v\n", order.ID, err)
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    var shipResult ShipResult
    err = ctx.CallActivity(ShipOrder,
        workflow.WithActivityInput(order)).Await(&shipResult)

    if err != nil {
        // Compensate: refund the payment
        var refundResult RefundResult
        ctx.CallActivity(RefundPayment,
            workflow.WithActivityInput(paymentResult.PaymentID)).Await(&refundResult)
        return nil, fmt.Errorf("shipment failed, payment refunded: %w", err)
    }

    return shipResult, nil
}
```

## Structured Error Types

Define typed errors for predictable error handling:

```go
type ActivityError struct {
    Code    string `json:"code"`
    Message string `json:"message"`
    Retryable bool `json:"retryable"`
}

func (e *ActivityError) Error() string {
    return fmt.Sprintf("[%s] %s", e.Code, e.Message)
}

func ProcessPayment(ctx workflow.ActivityContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    result, err := paymentService.Charge(order)
    if err != nil {
        if isTransient(err) {
            return nil, &ActivityError{
                Code:      "PAYMENT_TRANSIENT",
                Message:   err.Error(),
                Retryable: true,
            }
        }
        return nil, &ActivityError{
            Code:      "PAYMENT_PERMANENT",
            Message:   err.Error(),
            Retryable: false,
        }
    }
    return result, nil
}
```

## Retry with Error Classification

```go
func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    retryPolicy := &workflow.RetryPolicy{
        MaxAttempts:          3,
        InitialRetryInterval: 5 * time.Second,
        BackoffCoefficient:   2.0,
        MaxRetryInterval:     60 * time.Second,
    }

    var result PaymentResult
    err := ctx.CallActivity(ProcessPayment,
        workflow.WithActivityInput(order),
        workflow.WithActivityRetryPolicy(retryPolicy)).Await(&result)

    if err != nil {
        var actErr *ActivityError
        if errors.As(err, &actErr) && !actErr.Retryable {
            // Non-retryable: fail fast
            return nil, err
        }
        // Retryable error exhausted retries
        return nil, fmt.Errorf("payment permanently failed: %w", err)
    }
    return result, nil
}
```

## Compensation Chain Pattern

```go
func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    var completedSteps []string

    // Execute steps, tracking what completed for compensation
    var payment PaymentResult
    if err := ctx.CallActivity(ProcessPayment,
        workflow.WithActivityInput(order)).Await(&payment); err != nil {
        return nil, err
    }
    completedSteps = append(completedSteps, "payment")

    var inventory InventoryResult
    if err := ctx.CallActivity(ReserveInventory,
        workflow.WithActivityInput(order)).Await(&inventory); err != nil {
        // Compensate completed steps in reverse order
        compensate(ctx, completedSteps, order, payment)
        return nil, err
    }

    return map[string]any{"status": "completed"}, nil
}

func compensate(ctx *workflow.WorkflowContext, steps []string, order Order, payment PaymentResult) {
    for i := len(steps) - 1; i >= 0; i-- {
        switch steps[i] {
        case "payment":
            var r RefundResult
            ctx.CallActivity(RefundPayment,
                workflow.WithActivityInput(payment.PaymentID)).Await(&r)
        }
    }
}
```

## Monitoring Failed Workflows

```bash
# Get workflow instance status
curl "http://localhost:3500/v1.0/workflows/dapr/order-123" | jq '.runtimeStatus'

# Get workflow instance details including failure info
curl "http://localhost:3500/v1.0/workflows/dapr/order-123" | jq '.properties'
```

## Summary

Dapr Workflow surfaces activity failures as typed Go errors that you can catch, classify, and respond to within the workflow function. Implement compensation logic for already-completed steps when a later step fails, use retry policies for transient errors, and fail fast for permanent errors. Monitor failed workflow instances to identify systemic issues in your activity implementations.
