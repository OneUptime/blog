# How to Implement Choreography vs Orchestration with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Choreography, Orchestration, Workflow, Pub/Sub

Description: Compare choreography and orchestration approaches for coordinating microservices with Dapr, with practical examples using pub/sub and Dapr Workflow.

---

## Overview

Two primary patterns coordinate microservices in distributed systems: choreography (event-driven, decentralized) and orchestration (workflow-driven, centralized). Dapr supports both through its pub/sub and Workflow building blocks.

## Choreography with Dapr Pub/Sub

In choreography, services react to events without a central coordinator. Each service knows what to do when it receives an event.

### Order Processing via Choreography

```go
// order-service: publishes event when order is placed
func placeOrder(ctx context.Context, client dapr.Client, order Order) error {
    // Save order
    data, _ := json.Marshal(order)
    client.SaveState(ctx, "statestore", "order:"+order.ID, data, nil)

    // Emit event - no knowledge of who handles it
    return client.PublishEvent(ctx, "pubsub", "order.created", order)
}

// payment-service: reacts to order.created
func handleOrderCreated(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    json.Unmarshal(e.RawData, &order)

    if err := chargeCustomer(order); err != nil {
        client.PublishEvent(ctx, "pubsub", "payment.failed", order)
        return false, nil
    }
    return false, client.PublishEvent(ctx, "pubsub", "payment.completed", order)
}

// inventory-service: reacts to payment.completed
func handlePaymentCompleted(ctx context.Context, e *common.TopicEvent) (bool, error) {
    var order Order
    json.Unmarshal(e.RawData, &order)

    if err := reserveItems(order); err != nil {
        client.PublishEvent(ctx, "pubsub", "inventory.failed", order)
        return false, nil
    }
    return false, client.PublishEvent(ctx, "pubsub", "inventory.reserved", order)
}
```

### Choreography Subscriptions

```yaml
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: payment-sub
spec:
  pubsubname: pubsub
  topic: order.created
  route: /handle-order-created
  scopes:
    - payment-service
---
apiVersion: dapr.io/v1alpha1
kind: Subscription
metadata:
  name: inventory-sub
spec:
  pubsubname: pubsub
  topic: payment.completed
  route: /handle-payment
  scopes:
    - inventory-service
```

## Orchestration with Dapr Workflow

In orchestration, a central workflow service coordinates all participants.

```go
func OrderOrchestrationWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    ctx.GetInput(&order)

    // Step 1: Process payment
    var paymentResult PaymentResult
    if err := ctx.CallActivity(ProcessPayment, workflow.ActivityInput(order)).Await(&paymentResult); err != nil {
        return nil, fmt.Errorf("payment failed: %w", err)
    }

    // Step 2: Reserve inventory
    var inventoryResult InventoryResult
    if err := ctx.CallActivity(ReserveInventory, workflow.ActivityInput(order)).Await(&inventoryResult); err != nil {
        // Orchestrator handles compensation
        ctx.CallActivity(RefundPayment, workflow.ActivityInput(paymentResult)).Await(nil)
        return nil, fmt.Errorf("inventory failed: %w", err)
    }

    // Step 3: Create shipment
    var shipmentResult ShipmentResult
    if err := ctx.CallActivity(CreateShipment, workflow.ActivityInput(order)).Await(&shipmentResult); err != nil {
        ctx.CallActivity(ReleaseInventory, workflow.ActivityInput(inventoryResult)).Await(nil)
        ctx.CallActivity(RefundPayment, workflow.ActivityInput(paymentResult)).Await(nil)
        return nil, err
    }

    return map[string]string{
        "status":     "completed",
        "shipmentId": shipmentResult.ID,
    }, nil
}
```

## Comparison

| Aspect | Choreography (Pub/Sub) | Orchestration (Workflow) |
|---|---|---|
| Coupling | Low | Higher (orchestrator knows all) |
| Visibility | Hard to trace overall flow | Clear workflow state |
| Compensation | Each service handles own rollback | Orchestrator coordinates rollback |
| Scalability | Excellent - stateless consumers | Good - stateful workflow engine |
| Debugging | Complex event chains | Workflow history |
| Use case | Simple, independent steps | Complex, dependent steps with compensation |

## When to Use Each

Use choreography when:
- Steps are independent and services need loose coupling
- You expect frequent changes to participants
- Services belong to different teams

Use orchestration when:
- Steps have dependencies and need saga-style compensation
- You need visibility into overall process state
- Complex conditional branching is required

## Summary

Dapr supports both choreography via pub/sub and orchestration via Workflow. Choreography promotes loose coupling through event-driven reactions while orchestration provides centralized control and visibility. Choose based on the complexity of your process: simple independent steps favor choreography, while complex dependent workflows with compensation requirements favor Dapr Workflow orchestration.
