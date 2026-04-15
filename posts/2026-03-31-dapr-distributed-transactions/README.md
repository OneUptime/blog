# How to Implement Distributed Transactions with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Distributed Transaction, Saga, Workflow, Architecture

Description: Implement distributed transactions across Dapr microservices using the saga pattern, Dapr Workflows, and state store transactions for atomicity.

---

Distributed transactions coordinate changes across multiple services and databases. True ACID transactions across service boundaries are impractical in microservices, but Dapr provides state store transactions, the saga pattern via Workflows, and pub/sub-based compensation to achieve equivalent outcomes reliably.

## State Store Transactions (Single Store)

For operations within a single Dapr state store, use multi-key transactions:

```python
# Atomic multi-key update within one state store
from dapr.clients import DaprClient
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

def transfer_funds(from_id: str, to_id: str, amount: float):
    with DaprClient() as client:
        # Read both accounts
        from_acc = json.loads(client.get_state("statestore", from_id).data)
        to_acc = json.loads(client.get_state("statestore", to_id).data)

        if from_acc['balance'] < amount:
            raise ValueError("Insufficient funds")

        from_acc['balance'] -= amount
        to_acc['balance'] += amount

        # Execute atomic transaction
        client.execute_state_transaction(
            store_name="statestore",
            operations=[
                TransactionalStateOperation(
                    operation_type=TransactionOperationType.upsert,
                    key=from_id,
                    data=json.dumps(from_acc)
                ),
                TransactionalStateOperation(
                    operation_type=TransactionOperationType.upsert,
                    key=to_id,
                    data=json.dumps(to_acc)
                )
            ]
        )
```

## Choreography-Based Saga

In choreography sagas, each service reacts to events and publishes outcomes:

```yaml
# Choreography flow:
# order-service -> publishes "order-placed"
# inventory-service -> reserves stock -> publishes "stock-reserved"
# payment-service -> charges card -> publishes "payment-completed"
# order-service -> confirms order -> publishes "order-confirmed"
```

Inventory service subscribes and handles its step:

```python
@app.route('/events/order-placed', methods=['POST'])
def handle_order_placed():
    order = request.json.get('data', {})

    with DaprClient() as client:
        # Try to reserve stock
        product = json.loads(
            client.get_state("statestore", f"product:{order['product_id']}").data
        )

        if product['stock'] >= order['quantity']:
            product['stock'] -= order['quantity']
            client.save_state("statestore", f"product:{order['product_id']}",
                              json.dumps(product))
            client.publish_event("pubsub", "stock-reserved", json.dumps({
                'order_id': order['id'],
                'product_id': order['product_id'],
                'quantity': order['quantity']
            }))
        else:
            # Compensation: notify that stock reservation failed
            client.publish_event("pubsub", "stock-reservation-failed", json.dumps({
                'order_id': order['id'],
                'reason': 'Insufficient stock'
            }))

    return jsonify({'status': 'SUCCESS'})
```

## Orchestration-Based Saga with Dapr Workflow

Dapr Workflow provides a centralized, durable orchestrator:

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowContext, WorkflowActivityContext
import dapr.ext.workflow as wf

wfr = WorkflowRuntime()

@wfr.activity
def reserve_inventory(ctx: WorkflowActivityContext, order: dict) -> dict:
    with DaprClient() as client:
        result = client.invoke_method(
            app_id="inventory-service",
            method_name="inventory/reserve",
            http_verb="POST",
            data=json.dumps(order).encode()
        )
        return json.loads(result.data)

@wfr.activity
def process_payment(ctx: WorkflowActivityContext, order: dict) -> dict:
    with DaprClient() as client:
        result = client.invoke_method(
            app_id="payment-service",
            method_name="payments/charge",
            http_verb="POST",
            data=json.dumps(order).encode()
        )
        return json.loads(result.data)

@wfr.activity
def release_inventory(ctx: WorkflowActivityContext, order: dict) -> None:
    with DaprClient() as client:
        client.invoke_method(
            app_id="inventory-service",
            method_name="inventory/release",
            http_verb="POST",
            data=json.dumps(order).encode()
        )

@wfr.workflow
def order_transaction(ctx: DaprWorkflowContext, order: dict):
    reservation = yield ctx.call_activity(reserve_inventory, input=order)

    if not reservation.get('success'):
        return {'status': 'failed', 'reason': 'inventory_unavailable'}

    payment = yield ctx.call_activity(process_payment, input=order)

    if not payment.get('success'):
        # Compensate: release inventory
        yield ctx.call_activity(release_inventory, input=order)
        return {'status': 'failed', 'reason': 'payment_failed'}

    return {'status': 'completed', 'order_id': order['id']}
```

Start the workflow:

```python
from dapr.ext.workflow import DaprWorkflowClient

def place_order(order: dict):
    wf_client = DaprWorkflowClient()
    instance_id = wf_client.schedule_new_workflow(
        workflow=order_transaction,
        input=order
    )
    return instance_id
```

## Monitoring Distributed Transactions

Track saga completion rates:

```bash
# Check workflow status
dapr workflow history <instance-id> --app-id order-service
```

## Summary

Distributed transactions with Dapr use single-store transactions for atomic multi-key operations, choreography sagas with pub/sub events for loosely coupled workflows, and Dapr Workflow orchestration for centralized, durable transaction coordination with automatic compensation on failure.
