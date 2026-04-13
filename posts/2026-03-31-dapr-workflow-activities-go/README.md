# How to Implement Workflow Activities in Go

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Go, Activity, Microservice

Description: Learn how to implement Dapr workflow activities in Go using the Go SDK to create reliable, retryable units of work within distributed workflow orchestrations.

---

## What Are Workflow Activities?

Workflow activities are the building blocks of Dapr workflows. Each activity performs a single, concrete unit of work - such as querying a database, calling an HTTP service, or publishing a message. The Dapr runtime ensures activities are executed reliably with automatic retries, allowing workflow orchestrators to remain deterministic and focused on coordination.

In Go, activities are plain functions with a specific signature registered with the Dapr workflow runtime.

## Installing the Dapr Go SDK

```bash
go get github.com/dapr/go-sdk
```

## Defining an Activity

An activity function accepts a `workflow.ActivityContext` and optional input, returning a result and an error:

```go
package main

import (
    "fmt"

    "github.com/dapr/durabletask-go/workflow"
)

type PaymentInput struct {
    OrderID  string  `json:"orderId"`
    Amount   float64 `json:"amount"`
    Currency string  `json:"currency"`
}

type PaymentResult struct {
    Success       bool   `json:"success"`
    TransactionID string `json:"transactionId"`
}

func ProcessPaymentActivity(ctx workflow.ActivityContext) (any, error) {
    var input PaymentInput
    if err := ctx.GetInput(&input); err != nil {
        return nil, fmt.Errorf("failed to get input: %w", err)
    }

    fmt.Printf("Processing payment for order %s: %.2f %s\n",
        input.OrderID, input.Amount, input.Currency)

    // Call external payment service
    txID, err := chargePayment(input.OrderID, input.Amount, input.Currency)
    if err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    return &PaymentResult{Success: true, TransactionID: txID}, nil
}
```

## Defining a Workflow That Calls Activities

Use `ctx.CallActivity()` to schedule activities from within the workflow function:

```go
func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order OrderInput
    if err := ctx.GetInput(&order); err != nil {
        return nil, err
    }

    // Call payment activity
    var paymentResult PaymentResult
    if err := ctx.CallActivity(ProcessPaymentActivity, workflow.WithActivityInput(order.Payment)).
        Await(&paymentResult); err != nil {
        return nil, fmt.Errorf("payment activity failed: %w", err)
    }

    if !paymentResult.Success {
        return map[string]string{"status": "failed"}, nil
    }

    // Call email notification activity
    if err := ctx.CallActivity(SendEmailActivity,
        workflow.WithActivityInput(EmailInput{
            To:      order.Email,
            Subject: "Order Confirmed",
            Body:    fmt.Sprintf("Order %s confirmed.", order.OrderID),
        })).Await(nil); err != nil {
        return nil, fmt.Errorf("email activity failed: %w", err)
    }

    return map[string]string{
        "status":        "completed",
        "transactionId": paymentResult.TransactionID,
    }, nil
}
```

## Registering and Starting the Runtime

```go
package main

import (
    "context"
    "log"

    "github.com/dapr/go-sdk/client"
    "github.com/dapr/durabletask-go/workflow"
)

func main() {
    r := workflow.NewRegistry()
    r.AddWorkflow(OrderWorkflow)
    r.AddActivity(ProcessPaymentActivity)
    r.AddActivity(SendEmailActivity)

    wc, err := client.NewWorkflowClient()
    if err != nil {
        log.Fatalf("failed to create workflow client: %v", err)
    }

    if err := wc.StartWorker(context.Background(), r); err != nil {
        log.Fatalf("failed to start worker: %v", err)
    }

    log.Println("Workflow worker started")
    select {} // Block forever
}
```

## Triggering a Workflow

```go
func startOrderWorkflow(orderID string) error {
    wc, err := client.NewWorkflowClient()
    if err != nil {
        return err
    }

    id, err := wc.ScheduleWorkflow(context.Background(), "OrderWorkflow",
        workflow.WithInput(OrderInput{OrderID: orderID}))
    if err != nil {
        return err
    }

    log.Printf("Started workflow: %s", id)
    return nil
}
```

## Summary

Dapr workflow activities in Go are simple functions registered with the workflow worker. They handle all external interactions while the workflow orchestrator manages sequencing and error recovery. Using Go's strong typing, activity inputs and outputs are cleanly serialized as JSON structs, making your workflow code predictable and easy to test.
