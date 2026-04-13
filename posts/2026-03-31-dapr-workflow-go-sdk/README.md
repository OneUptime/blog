# How to Build Dapr Workflows with Go SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Go, SDK, Golang

Description: Build and run durable Dapr workflows using the Go SDK, including workflow and activity registration, workflow client usage, and error handling patterns.

---

## Overview

The Dapr Go SDK supports the Workflow building block, allowing you to write durable orchestration logic in Go. Workflows survive process restarts through checkpointing and replay. Activities perform the actual work, while the workflow function acts as a coordinator.

## Installation

```bash
go get github.com/dapr/go-sdk
```

## Defining Activities

Activities are regular Go functions with a specific signature:

```go
package main

import (
    "fmt"
    "github.com/dapr/go-sdk/workflow"
)

// Activity input/output types
type OrderInput struct {
    OrderID string `json:"orderId"`
    Amount  float64 `json:"amount"`
}

type PaymentResult struct {
    PaymentID string `json:"paymentId"`
    Status    string `json:"status"`
}

// Activity: reserve inventory
func ReserveInventoryActivity(ctx workflow.ActivityContext) (any, error) {
    var input OrderInput
    if err := ctx.GetInput(&input); err != nil {
        return nil, fmt.Errorf("failed to get input: %w", err)
    }

    fmt.Printf("Reserving inventory for order %s\n", input.OrderID)
    // Call inventory service, update state store, etc.
    return map[string]string{"reservationId": "res-" + input.OrderID}, nil
}

// Activity: process payment
func ProcessPaymentActivity(ctx workflow.ActivityContext) (any, error) {
    var input OrderInput
    if err := ctx.GetInput(&input); err != nil {
        return nil, err
    }

    fmt.Printf("Processing payment of $%.2f for %s\n", input.Amount, input.OrderID)
    return PaymentResult{
        PaymentID: "pay-12345",
        Status:    "success",
    }, nil
}
```

## Defining the Workflow

```go
// Workflow orchestrator - must be deterministic
func OrderFulfillmentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var input OrderInput
    if err := ctx.GetInput(&input); err != nil {
        return nil, err
    }

    // Step 1: Reserve inventory
    var reservation map[string]string
    if err := ctx.CallActivity(ReserveInventoryActivity, workflow.ActivityInput(input)).
        Await(&reservation); err != nil {
        return nil, fmt.Errorf("inventory reservation failed: %w", err)
    }

    // Step 2: Process payment
    var payment PaymentResult
    if err := ctx.CallActivity(ProcessPaymentActivity, workflow.ActivityInput(input)).
        Await(&payment); err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    if payment.Status != "success" {
        return nil, fmt.Errorf("payment status: %s", payment.Status)
    }

    return map[string]any{
        "orderId":       input.OrderID,
        "paymentId":     payment.PaymentID,
        "reservationId": reservation["reservationId"],
    }, nil
}
```

## Registering and Starting the Runtime

```go
func main() {
    w, err := workflow.NewWorker()
    if err != nil {
        log.Fatalf("failed to create workflow worker: %v", err)
    }

    // Register workflow and activities
    if err := w.RegisterWorkflow(OrderFulfillmentWorkflow); err != nil {
        log.Fatalf("failed to register workflow: %v", err)
    }
    if err := w.RegisterActivity(ReserveInventoryActivity); err != nil {
        log.Fatalf("failed to register activity: %v", err)
    }
    if err := w.RegisterActivity(ProcessPaymentActivity); err != nil {
        log.Fatalf("failed to register activity: %v", err)
    }

    if err := w.Start(); err != nil {
        log.Fatalf("failed to start workflow worker: %v", err)
    }
    defer w.Shutdown()

    // Block until SIGTERM/SIGINT
    quit := make(chan os.Signal, 1)
    signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)
    <-quit
}
```

## Starting a Workflow Instance

```go
func startWorkflow(orderId string) error {
    client, err := workflow.NewClient()
    if err != nil {
        return fmt.Errorf("failed to create workflow client: %w", err)
    }
    defer client.Close()

    input := OrderInput{OrderID: orderId, Amount: 150.0}

    instanceID, err := client.ScheduleNewWorkflow(
        context.Background(),
        "OrderFulfillmentWorkflow",
        workflow.WithInstanceID("order-"+orderId),
        workflow.WithInput(input),
    )
    if err != nil {
        return fmt.Errorf("failed to start workflow: %w", err)
    }

    fmt.Printf("Workflow started: %s\n", instanceID)

    // Wait for completion
    metadata, err := client.WaitForWorkflowCompletion(
        context.Background(),
        instanceID,
        workflow.WithFetchPayloads(true),
    )
    if err != nil {
        return err
    }

    fmt.Printf("Workflow completed: %s\n", metadata.RuntimeStatus)
    return nil
}
```

## Summary

Dapr workflows in Go use `workflow.Worker` for activity and workflow registration and `workflow.Client` for triggering and querying instances. Workflow functions receive a `*workflow.WorkflowContext` and must be deterministic - use `ctx.CallActivity` for all side effects. The Go SDK handles state serialization and replay automatically, ensuring workflows resume from their last checkpoint after any process restart or crash.
