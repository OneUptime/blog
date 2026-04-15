# How to Handle Partial Failures in Dapr Distributed Transactions

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Transaction, Partial Failure, Saga, Resiliency

Description: Learn how to detect and recover from partial failures in Dapr distributed transactions using saga patterns, idempotency, and state checkpointing.

---

## The Partial Failure Problem

In a distributed transaction spanning three services, the first two may succeed while the third fails. Without a recovery strategy, you end up with inconsistent data. Dapr addresses this through saga workflows with compensation, idempotent activities, and state checkpointing.

## Idempotent Activity Design

Make each activity idempotent so reprocessing after a partial failure is safe:

```python
from dapr.clients import DaprClient
import json

def reserve_inventory(ctx, order: dict) -> dict:
    reservation_key = f"reservation:{order['orderId']}"

    with DaprClient() as client:
        # Check if reservation already exists
        existing = client.get_state(
            store_name="order-state",
            key=reservation_key
        )
        if existing.data:
            # Already reserved - return cached result
            return json.loads(existing.data)

        # Create new reservation
        result = call_inventory_service(order)

        # Persist before returning
        client.save_state(
            store_name="order-state",
            key=reservation_key,
            value=json.dumps(result)
        )
        return result
```

## State Checkpointing in Workflows

Save progress at each step so restarts can resume from the last checkpoint:

```python
import dapr.ext.workflow as wf

def order_fulfillment_workflow(ctx: wf.DaprWorkflowContext, order: dict):
    instance_id = ctx.instance_id

    # Step 1: Reserve inventory
    inventory = yield ctx.call_activity(
        reserve_inventory,
        input=order
    )

    # Step 2: Allocate warehouse slot
    slot = yield ctx.call_activity(
        allocate_warehouse_slot,
        input={"orderId": order["orderId"], "items": inventory["items"]}
    )

    # Step 3: Schedule shipment
    shipment = yield ctx.call_activity(
        schedule_shipment,
        input={"orderId": order["orderId"], "slotId": slot["slotId"]}
    )

    return {
        "orderId": order["orderId"],
        "shipmentId": shipment["shipmentId"],
        "status": "scheduled"
    }
```

If `schedule_shipment` fails and the pod restarts, Dapr replays the workflow from the persisted event log - `reserve_inventory` and `allocate_warehouse_slot` return cached results instantly.

## Detecting Partial Failures via State

Query workflow state to find stuck transactions:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/INSTANCE_ID
```

```json
{
  "instanceID": "INSTANCE_ID",
  "workflowName": "order_fulfillment_workflow",
  "createdAt": "2026-01-12T21:31:13Z",
  "lastUpdatedAt": "2026-01-12T21:31:18Z",
  "runtimeStatus": "FAILED",
  "properties": {
    "dapr.workflow.failure.error_type": "TaskFailedException",
    "dapr.workflow.failure.error_message": "schedule_shipment timed out after 30s"
  }
}
```

## Manual Recovery for Stuck Workflows

Terminate and replay a stuck workflow instance:

```bash
# Terminate the stuck instance
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/INSTANCE_ID/terminate

# Start a new instance with the same order (idempotency handles deduplication)
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order_fulfillment_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"orderId": "ord-456", "items": [...]}'
```

## Parallel Activity Fan-Out

For independent steps, run them in parallel and handle partial failures collectively:

```python
def parallel_fulfillment(ctx: wf.DaprWorkflowContext, order: dict):
    tasks = [
        ctx.call_activity(send_confirmation_email, input=order),
        ctx.call_activity(update_loyalty_points, input=order),
        ctx.call_activity(notify_warehouse, input=order)
    ]

    results = yield wf.when_all(tasks)
    return {"completed": len(results)}
```

## Summary

Handling partial failures in Dapr distributed transactions requires idempotent activities, state checkpointing, and compensation logic. Dapr Workflow's durable event sourcing means workflows automatically resume from the last successful step after a restart. Combining idempotency keys with state store checks ensures that replaying a partial transaction never creates duplicate side effects.
