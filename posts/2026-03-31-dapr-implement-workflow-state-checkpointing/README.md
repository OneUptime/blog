# How to Implement Workflow State Checkpointing in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Checkpoint, State, Durability

Description: Implement workflow state checkpointing in Dapr to persist execution progress and enable reliable resume after failures or pod restarts.

---

## Overview

Dapr Workflow uses event sourcing to persist every workflow state transition. Checkpointing happens automatically via the underlying state store, but you can optimize it by structuring your workflow activities to save progress at meaningful milestones.

## How Dapr Workflow Checkpoints Work

Every workflow activity completion is recorded to the state store as an event. When a workflow resumes after failure, it replays the entire event history from the beginning to reconstruct in-memory state. Activities that already completed return their cached results without re-executing.

```go
package main

import (
    "github.com/dapr/durabletask-go/workflow"
)

// Workflow with explicit checkpointing via activities
func OrderProcessingWorkflow(ctx *workflow.WorkflowContext) (any, error) {
    var order Order
    if err := ctx.GetInput(&order); err != nil {
        return nil, err
    }

    // Checkpoint 1: Payment
    var paymentResult PaymentResult
    if err := ctx.CallActivity(ProcessPayment, workflow.WithActivityInput(order)).
        Await(&paymentResult); err != nil {
        return nil, err
    }

    // Checkpoint 2: Inventory reservation
    var inventoryResult InventoryResult
    if err := ctx.CallActivity(ReserveInventory, workflow.WithActivityInput(order)).
        Await(&inventoryResult); err != nil {
        return nil, err
    }

    // Checkpoint 3: Fulfillment
    var shipResult ShipResult
    if err := ctx.CallActivity(ShipOrder, workflow.WithActivityInput(order)).
        Await(&shipResult); err != nil {
        return nil, err
    }

    return map[string]any{
        "paymentId":   paymentResult.PaymentID,
        "shipmentId":  shipResult.TrackingID,
    }, nil
}
```

Each `Await()` call creates a durable checkpoint.

## Saving Intermediate State Explicitly

For long-running activities that need internal checkpoints, save progress to Dapr state store:

```go
func ProcessLargeDataset(ctx context.Context, items []string) (string, error) {
    daprClient, _ := dapr.NewClient()
    defer daprClient.Close()

    batchSize := 100
    for i := 0; i < len(items); i += batchSize {
        end := i + batchSize
        if end > len(items) {
            end = len(items)
        }
        batch := items[i:end]

        // Process batch
        if err := processBatch(batch); err != nil {
            return "", err
        }

        // Save progress checkpoint
        progress, _ := json.Marshal(map[string]int{"processed": end})
        daprClient.SaveState(ctx, "statestore",
            "job-progress-"+ctx.Value("instanceID").(string),
            progress, nil)
    }
    return "completed", nil
}
```

## Resuming from a Checkpoint

Query workflow state to determine if it was mid-execution:

```bash
# Check workflow state
curl http://localhost:3500/v1.0/workflows/dapr/order-workflow-123

# Response shows workflow status
{
  "instanceID": "order-workflow-123",
  "workflowName": "OrderProcessingWorkflow",
  "runtimeStatus": "RUNNING",
  "createdAt": "2026-03-31T09:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:00:00Z"
}
```

## Purging Completed Workflow History

Checkpoint data accumulates over time. Purge completed workflows:

```bash
# Purge a specific completed workflow
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-workflow-123/purge
```

Note: Dapr does not provide a bulk purge API. To purge multiple completed workflows, iterate through each instance and call the purge endpoint individually.

## State Store Configuration for Workflow

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: workflowstore
spec:
  type: state.redis
  version: v1
  metadata:
  - name: redisHost
    value: "redis:6379"
  - name: keyPrefix
    value: "name"
  - name: actorStateStore
    value: "true"
```

## Summary

Dapr Workflow automatically checkpoints state at each activity boundary using event sourcing to the configured actor state store. Structure your workflows with fine-grained activities to create frequent checkpoints, save intermediate progress for long-running activities, and schedule regular purges of completed workflow history to control state store growth.
