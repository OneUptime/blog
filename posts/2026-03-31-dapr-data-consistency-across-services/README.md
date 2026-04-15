# How to Implement Data Consistency Across Services with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Data Consistency, Saga Pattern, Event Sourcing, Microservice

Description: Achieve data consistency across Dapr microservices using saga patterns, optimistic locking, and event-driven compensation to handle distributed failures.

---

Maintaining data consistency across microservices is one of the hardest problems in distributed systems. Traditional ACID transactions do not span service boundaries. Dapr provides the building blocks - state stores with ETags, pub/sub for events, and workflows for orchestration - to implement consistency patterns that work in distributed environments.

## Consistency Models in Dapr

Dapr supports two consistency levels for state operations:

- **Strong consistency**: Reads always return the latest written value (slower)
- **Eventual consistency**: Reads may return slightly stale data (faster)

Choose consistency level per write operation:

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateOptions, Concurrency, Consistency

with DaprClient() as client:
    # Read state (read consistency is configured at the state store component level)
    result = client.get_state(
        store_name="statestore",
        key="account-123"
    )

    # Save with strong consistency
    client.save_state(
        store_name="statestore",
        key="account-123",
        value='{"balance": 100}',
        options=StateOptions(
            consistency=Consistency.strong
        )
    )

    # Save with eventual consistency (faster)
    client.save_state(
        store_name="statestore",
        key="product-456",
        value='{"stock": 50}',
        options=StateOptions(
            consistency=Consistency.eventual
        )
    )
```

## Optimistic Locking with ETags

Use ETags to prevent lost updates when multiple services write the same key:

```python
def transfer_balance(from_account: str, to_account: str, amount: float):
    with DaprClient() as client:
        # Get current state with ETag
        from_state = client.get_state("statestore", f"account:{from_account}")
        from_account_data = json.loads(from_state.data)
        from_etag = from_state.etag

        if from_account_data['balance'] < amount:
            raise ValueError("Insufficient balance")

        # Update with optimistic lock - fails if another process modified it
        from_account_data['balance'] -= amount
        try:
            client.save_state(
                store_name="statestore",
                key=f"account:{from_account}",
                value=json.dumps(from_account_data),
                etag=from_etag,  # Will fail if ETag changed
                options=StateOptions(
                    concurrency=Concurrency.first_write
                )
            )
        except Exception:
            # ETag conflict - retry
            return transfer_balance(from_account, to_account, amount)
```

## Saga Pattern for Multi-Service Consistency

Implement a saga with compensation for distributed consistency:

```python
# order_saga.py - orchestration-based saga using Dapr state
import json
from dapr.clients import DaprClient
from enum import Enum

class SagaState(Enum):
    STARTED = "started"
    INVENTORY_RESERVED = "inventory_reserved"
    PAYMENT_PROCESSED = "payment_processed"
    COMPLETED = "completed"
    COMPENSATING = "compensating"
    FAILED = "failed"

def run_order_saga(order_id: str, order: dict):
    with DaprClient() as client:
        saga = {'order_id': order_id, 'state': SagaState.STARTED.value, 'order': order}
        client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))

        try:
            # Step 1: Reserve inventory
            result = client.invoke_method("inventory-service",
                "inventory/reserve",
                data=json.dumps({'product_id': order['product_id'],
                                 'quantity': order['quantity']}).encode(),
                http_verb="POST")
            saga['state'] = SagaState.INVENTORY_RESERVED.value
            client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))

            # Step 2: Process payment
            result = client.invoke_method("payment-service",
                "payments/charge",
                data=json.dumps({'amount': order['total'],
                                 'customer_id': order['customer_id']}).encode(),
                http_verb="POST")
            saga['state'] = SagaState.PAYMENT_PROCESSED.value
            client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))

            # Saga complete
            saga['state'] = SagaState.COMPLETED.value
            client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))
            client.publish_event("pubsub", "order-completed", json.dumps(order))

        except Exception as e:
            # Compensate
            last_completed = saga['state']
            saga['state'] = SagaState.COMPENSATING.value
            client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))

            if last_completed in (SagaState.INVENTORY_RESERVED.value,
                                  SagaState.PAYMENT_PROCESSED.value):
                client.invoke_method("inventory-service",
                    "inventory/release",
                    data=json.dumps({'product_id': order['product_id'],
                                     'quantity': order['quantity']}).encode(),
                    http_verb="POST")

            saga['state'] = SagaState.FAILED.value
            client.save_state("statestore", f"saga:{order_id}", json.dumps(saga))
            client.publish_event("pubsub", "order-failed",
                json.dumps({'order_id': order_id, 'reason': str(e)}))
```

## Using Dapr Workflow for Saga Orchestration

Dapr Workflows provide durable saga execution with automatic retry:

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext

def order_workflow(ctx: DaprWorkflowContext, order: dict):
    # Reserve inventory (with retry on failure)
    reservation = yield ctx.call_activity(reserve_inventory, input=order)
    if not reservation['success']:
        yield ctx.call_activity(cancel_order, input=order)
        return {'status': 'failed'}

    # Process payment (with compensation on failure)
    payment = yield ctx.call_activity(process_payment, input=order)
    if not payment['success']:
        yield ctx.call_activity(release_inventory, input=reservation)
        return {'status': 'failed'}

    return {'status': 'completed', 'order_id': order['id']}
```

## Summary

Data consistency across Dapr services uses optimistic locking with ETags for single-store conflicts, saga patterns with explicit compensation for multi-service transactions, and Dapr Workflows for durable orchestration with automatic retry. Choosing the right consistency level per operation balances correctness against performance.
