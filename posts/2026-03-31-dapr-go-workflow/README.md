# How to Use Dapr Workflow with Go SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Go, Workflow, Orchestration, Microservice, Saga

Description: Build durable, long-running workflows in Go using the Dapr Workflow building block for saga orchestration, fan-out/fan-in, and human approval patterns.

---

## Overview

Dapr Workflow provides a durable execution engine for long-running business processes. Workflows survive process restarts, can wait for external events, and coordinate multiple activities across services. The Go SDK exposes a workflow authoring API that compiles to Dapr's internal state-machine model.

## Installing the SDK

```bash
go get github.com/dapr/go-sdk@latest
go get github.com/dapr/durabletask-go@latest
```

## Defining Activities

Activities are the individual steps in a workflow. They run exactly once and can call external services, databases, or other Dapr APIs:

```go
package main

import (
    "context"
    "fmt"
    "log"

    "github.com/dapr/durabletask-go/workflow"
    "github.com/dapr/go-sdk/client"
)

func ReserveInventoryActivity(ctx workflow.ActivityContext) (any, error) {
    var input struct {
        ProductID string `json:"productId"`
        Quantity  int    `json:"quantity"`
    }
    if err := ctx.GetInput(&input); err != nil {
        return nil, err
    }
    fmt.Printf("Reserving %d units of %s\n", input.Quantity, input.ProductID)
    return map[string]bool{"reserved": true}, nil
}

func ProcessPaymentActivity(ctx workflow.ActivityContext) (any, error) {
    var input struct {
        Amount   float64 `json:"amount"`
        Currency string  `json:"currency"`
    }
    if err := ctx.GetInput(&input); err != nil {
        return nil, err
    }
    fmt.Printf("Charging %.2f %s\n", input.Amount, input.Currency)
    return map[string]string{"transactionId": "txn-42"}, nil
}
```

## Defining the Workflow

```go
func OrderWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order struct {
        OrderID   string  `json:"orderId"`
        ProductID string  `json:"productId"`
        Quantity  int     `json:"quantity"`
        Amount    float64 `json:"amount"`
    }
    if err := ctx.GetInput(&order); err != nil {
        return nil, err
    }

    // Step 1: Reserve inventory
    var reserved struct{ Reserved bool }
    if err := ctx.CallActivity(ReserveInventoryActivity,
        workflow.WithActivityInput(map[string]any{
            "productId": order.ProductID,
            "quantity":  order.Quantity,
        })).Await(&reserved); err != nil {
        return nil, fmt.Errorf("inventory reservation failed: %w", err)
    }

    if !reserved.Reserved {
        return nil, fmt.Errorf("insufficient inventory")
    }

    // Step 2: Process payment
    var payment struct{ TransactionId string }
    if err := ctx.CallActivity(ProcessPaymentActivity,
        workflow.WithActivityInput(map[string]any{
            "amount":   order.Amount,
            "currency": "USD",
        })).Await(&payment); err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    return map[string]string{
        "orderId":       order.OrderID,
        "transactionId": payment.TransactionId,
        "status":        "completed",
    }, nil
}
```

## Registering and Starting the Workflow Worker

```go
func main() {
    r := workflow.NewRegistry()
    r.AddWorkflow(OrderWorkflow)
    r.AddActivity(ReserveInventoryActivity)
    r.AddActivity(ProcessPaymentActivity)

    ctx, cancel := context.WithCancel(context.Background())
    defer cancel()

    // Create workflow client and start worker
    wclient, err := client.NewWorkflowClient()
    if err != nil {
        log.Fatal(err)
    }

    if err := wclient.StartWorker(ctx, r); err != nil {
        log.Fatal(err)
    }

    // Start a workflow instance
    id, err := wclient.ScheduleWorkflow(ctx,
        "OrderWorkflow",
        workflow.WithInstanceID("order-workflow-1"),
        workflow.WithInput(map[string]any{
            "orderId":   "ord-001",
            "productId": "prod-1",
            "quantity":  2,
            "amount":    99.99,
        }),
    )
    if err != nil {
        log.Fatal(err)
    }
    log.Printf("Started workflow: %s", id)
}
```

## Summary

The Dapr Workflow Go SDK separates workflows (orchestration logic) from activities (side effects), ensuring deterministic replay on restart. Activities handle all external I/O while workflow functions contain only pure coordination logic. This separation makes complex multi-step business processes durable and testable.
