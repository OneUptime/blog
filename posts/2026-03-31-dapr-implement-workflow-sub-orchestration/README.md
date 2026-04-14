# How to Implement Workflow Sub-Orchestration in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Sub-Orchestration, Composition, Durability

Description: Implement sub-orchestration in Dapr workflows to decompose complex workflows into reusable child workflows with independent state and error handling.

---

## Overview

Sub-orchestration allows a parent workflow to call child workflows as if they were activities. Child workflows run independently, maintain their own event history, and can be reused across multiple parent workflows.

## Defining a Child Workflow

```go
package main

import (
    "github.com/dapr/go-sdk/workflow"
    "fmt"
)

// Child workflow - handles payment processing pipeline
func PaymentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Validate
    var validationResult ValidationResult
    if err := ctx.CallActivity(ValidatePayment,
        workflow.ActivityInput(order)).Await(&validationResult); err != nil {
        return nil, fmt.Errorf("payment validation failed: %w", err)
    }

    // Charge
    var chargeResult ChargeResult
    if err := ctx.CallActivity(ChargeCard,
        workflow.ActivityInput(order)).Await(&chargeResult); err != nil {
        return nil, fmt.Errorf("charge failed: %w", err)
    }

    // Record
    ctx.CallActivity(RecordTransaction, workflow.ActivityInput(chargeResult))

    return chargeResult, nil
}
```

## Parent Workflow Calling Sub-Orchestrations

```go
func FulfillmentWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Call payment as a sub-orchestration
    var paymentResult ChargeResult
    if err := ctx.CallChildWorkflow(PaymentWorkflow,
        workflow.ChildWorkflowInput(order),
        workflow.ChildWorkflowInstanceID("payment-"+order.ID)).
        Await(&paymentResult); err != nil {
        return nil, fmt.Errorf("payment sub-workflow failed: %w", err)
    }

    // Call inventory as a sub-orchestration
    var inventoryResult InventoryResult
    if err := ctx.CallChildWorkflow(InventoryWorkflow,
        workflow.ChildWorkflowInput(order),
        workflow.ChildWorkflowInstanceID("inventory-"+order.ID)).
        Await(&inventoryResult); err != nil {
        // Compensate payment
        ctx.CallChildWorkflow(RefundWorkflow,
            workflow.ChildWorkflowInput(paymentResult.TransactionID))
        return nil, err
    }

    return map[string]any{
        "orderId":        order.ID,
        "transactionId":  paymentResult.TransactionID,
        "inventoryRef":   inventoryResult.Reference,
    }, nil
}
```

## Parallel Sub-Orchestrations

Fan out to multiple child workflows concurrently:

```go
func ParallelNotificationWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var notification Notification
    ctx.GetInput(&notification)

    // Launch all channels concurrently
    emailChan := ctx.CallChildWorkflow(EmailWorkflow,
        workflow.ChildWorkflowInput(notification))
    smsChan := ctx.CallChildWorkflow(SMSWorkflow,
        workflow.ChildWorkflowInput(notification))
    pushChan := ctx.CallChildWorkflow(PushWorkflow,
        workflow.ChildWorkflowInput(notification))

    // Wait for all to complete
    var emailResult, smsResult, pushResult ChannelResult
    emailChan.Await(&emailResult)
    smsChan.Await(&smsResult)
    pushChan.Await(&pushResult)

    return map[string]any{
        "email": emailResult.Sent,
        "sms":   smsResult.Sent,
        "push":  pushResult.Sent,
    }, nil
}
```

## Registering Child Workflows

```go
func main() {
    w, _ := workflow.NewWorker()

    // Register parent and child workflows
    w.RegisterWorkflow(FulfillmentWorkflow)
    w.RegisterWorkflow(PaymentWorkflow)
    w.RegisterWorkflow(InventoryWorkflow)
    w.RegisterWorkflow(RefundWorkflow)

    // Register activities
    w.RegisterActivity(ValidatePayment)
    w.RegisterActivity(ChargeCard)
    w.RegisterActivity(RecordTransaction)

    w.Start()
}
```

## Monitoring Sub-Orchestrations

```bash
# Get parent workflow status
curl "http://localhost:3500/v1.0/workflows/dapr/fulfillment-order-123"

# Get child workflow status directly
curl "http://localhost:3500/v1.0/workflows/dapr/payment-order-123"
```

## Summary

Dapr sub-orchestration enables modular workflow composition by calling child workflows via `CallChildWorkflow`. Assign deterministic instance IDs to child workflows for independent observability, use fan-out patterns for parallel child execution, and handle child failures in the parent to trigger compensation. Sub-orchestrations make large workflows manageable by breaking them into independently deployable and testable units.
