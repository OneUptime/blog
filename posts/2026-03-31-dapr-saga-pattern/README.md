# How to Implement the Saga Pattern with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Saga, Pattern, Microservice, Workflow

Description: Learn how to implement the Saga distributed transaction pattern using Dapr Workflow to coordinate multi-step operations across microservices reliably.

---

## Overview

The Saga pattern manages distributed transactions across multiple microservices by breaking them into a sequence of local transactions. If any step fails, compensating transactions undo the completed steps. Dapr Workflow provides a durable execution engine that makes saga orchestration straightforward.

## Saga vs Traditional Transactions

Traditional ACID transactions don't span microservices. A Saga chains local transactions and provides compensating actions for rollback. Dapr Workflow handles state persistence and retry so your saga survives crashes.

## Order Processing Saga Example

Consider an order placement that spans: payment service, inventory service, and shipping service.

```go
package main

import (
    "context"
    "fmt"
    "github.com/dapr/go-sdk/client"
    "github.com/dapr/durabletask-go/workflow"
)

type OrderInput struct {
    OrderID    string  `json:"orderId"`
    CustomerID string  `json:"customerId"`
    Amount     float64 `json:"amount"`
    ProductID  string  `json:"productId"`
    Quantity   int     `json:"quantity"`
}

func OrderSaga(ctx *workflow.WorkflowContext) (any, error) {
    var input OrderInput
    if err := ctx.GetInput(&input); err != nil {
        return nil, err
    }

    // Step 1: Reserve payment
    var paymentResult PaymentResult
    if err := ctx.CallActivity(ReservePayment, workflow.WithActivityInput(input)).Await(&paymentResult); err != nil {
        return nil, err
    }

    // Step 2: Reserve inventory
    var inventoryResult InventoryResult
    if err := ctx.CallActivity(ReserveInventory, workflow.WithActivityInput(input)).Await(&inventoryResult); err != nil {
        // Compensate: release payment
        ctx.CallActivity(ReleasePayment, workflow.WithActivityInput(paymentResult.PaymentID)).Await(nil)
        return nil, fmt.Errorf("inventory reservation failed: %w", err)
    }

    // Step 3: Create shipment
    var shipmentResult ShipmentResult
    if err := ctx.CallActivity(CreateShipment, workflow.WithActivityInput(input)).Await(&shipmentResult); err != nil {
        // Compensate in reverse order
        ctx.CallActivity(ReleaseInventory, workflow.WithActivityInput(inventoryResult.ReservationID)).Await(nil)
        ctx.CallActivity(ReleasePayment, workflow.WithActivityInput(paymentResult.PaymentID)).Await(nil)
        return nil, fmt.Errorf("shipment creation failed: %w", err)
    }

    return map[string]string{
        "orderId":    input.OrderID,
        "paymentId":  paymentResult.PaymentID,
        "shipmentId": shipmentResult.ShipmentID,
        "status":     "completed",
    }, nil
}
```

## Implementing Activities

```go
func ReservePayment(ctx workflow.ActivityContext) (any, error) {
    var input OrderInput
    if err := ctx.GetInput(&input); err != nil {
        return nil, err
    }
    // Call payment microservice
    result, err := callPaymentService(input.CustomerID, input.Amount)
    if err != nil {
        return nil, err
    }
    return PaymentResult{PaymentID: result.ID}, nil
}

func ReleasePayment(ctx workflow.ActivityContext) (any, error) {
    var paymentID string
    ctx.GetInput(&paymentID)
    return nil, callPaymentService_Cancel(paymentID)
}
```

## Registering and Starting the Saga

```go
func main() {
    r := workflow.NewRegistry()

    r.AddWorkflow(OrderSaga)
    r.AddActivity(ReservePayment)
    r.AddActivity(ReserveInventory)
    r.AddActivity(CreateShipment)
    r.AddActivity(ReleasePayment)
    r.AddActivity(ReleaseInventory)

    wfClient, err := client.NewWorkflowClient()
    if err != nil {
        panic(err)
    }

    ctx := context.Background()
    if err := wfClient.StartWorker(ctx, r); err != nil {
        panic(err)
    }

    instanceID, _ := wfClient.ScheduleWorkflow(ctx, "OrderSaga",
        workflow.WithInput(OrderInput{
            OrderID:    "ord-001",
            CustomerID: "cust-123",
            Amount:     150.00,
            ProductID:  "prod-456",
            Quantity:   2,
        }),
    )
    fmt.Printf("Saga started: %s\n", instanceID)
}
```

## Checking Saga Status

```bash
curl http://localhost:3500/v1.0/workflows/dapr/INSTANCE_ID
```

## Summary

Dapr Workflow simplifies saga orchestration by providing durable execution, automatic state persistence, and retry semantics. By structuring each saga step as an activity with a corresponding compensating activity, you build fault-tolerant distributed transactions without complex state management code. The workflow engine ensures saga progress survives process restarts and infrastructure failures.
