# How to Use Dapr State Transactions with PostgreSQL

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, PostgreSQL, State Store, Transaction, ACID

Description: Implement multi-key ACID transactions with the Dapr State API and PostgreSQL state store, including upsert, delete, and ETag-based conflict detection.

---

## Overview

Dapr state transactions group multiple state operations into a single atomic request. When backed by PostgreSQL, these operations execute within a database transaction, giving you full ACID guarantees. This is useful for maintaining consistency across related keys without external coordination.

## PostgreSQL Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
  namespace: default
spec:
  type: state.postgresql
  version: v2
  metadata:
    - name: connectionString
      secretKeyRef:
        name: postgres-secret
        key: connection-string
```

## Basic Transaction

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

with DaprClient() as client:
    operations = [
        TransactionalStateOperation(
            operation_type=TransactionOperationType.upsert,
            key="order:456",
            data='{"status": "confirmed", "total": 150.00}'
        ),
        TransactionalStateOperation(
            operation_type=TransactionOperationType.upsert,
            key="inventory:item-99",
            data='{"quantity": 48}'
        ),
        TransactionalStateOperation(
            operation_type=TransactionOperationType.delete,
            key="cart:user-789"
        ),
    ]

    client.execute_state_transaction(
        store_name="statestore",
        operations=operations
    )
    print("Transaction committed")
```

## Transaction with ETag Concurrency

```python
from dapr.clients import DaprClient
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

# Read current state to get ETags
with DaprClient() as client:
    order = client.get_state("statestore", "order:456")
    inventory = client.get_state("statestore", "inventory:item-99")

    operations = [
        TransactionalStateOperation(
            operation_type=TransactionOperationType.upsert,
            key="order:456",
            data='{"status": "shipped"}',
            etag=order.etag
        ),
        TransactionalStateOperation(
            operation_type=TransactionOperationType.upsert,
            key="inventory:item-99",
            data='{"quantity": 47}',
            etag=inventory.etag
        ),
    ]

    try:
        client.execute_state_transaction("statestore", operations)
    except Exception as e:
        print(f"Conflict: {e} - retry with fresh reads")
```

## Transaction Rollback Behavior

If any operation in the transaction fails (e.g., ETag mismatch), PostgreSQL rolls back the entire transaction automatically:

```sql
-- Dapr executes this internally
BEGIN;
  UPDATE state SET value = $1, etag = gen_random_uuid()
    WHERE key = $2 AND etag = $3;
  UPDATE state SET value = $4, etag = gen_random_uuid()
    WHERE key = $5 AND etag = $6;
COMMIT;
-- If any UPDATE affects 0 rows, Dapr raises an error and PostgreSQL rolls back
```

## Saga Pattern with Transactions

Implement a simple saga with compensating transactions:

```python
def process_payment(order_id, amount):
    with DaprClient() as client:
        try:
            # Step 1: reserve funds
            client.execute_state_transaction("statestore", [
                TransactionalStateOperation(
                    key=f"reservation:{order_id}",
                    data=f'{{"amount": {amount}, "status": "reserved"}}'
                )
            ])

            # Step 2: update order
            client.execute_state_transaction("statestore", [
                TransactionalStateOperation(
                    key=f"order:{order_id}",
                    data='{"paymentStatus": "paid"}'
                ),
                TransactionalStateOperation(
                    operation_type=TransactionOperationType.delete,
                    key=f"reservation:{order_id}"
                )
            ])
        except Exception as e:
            # Compensate: release reservation
            client.delete_state("statestore", f"reservation:{order_id}")
            raise
```

## Summary

Dapr state transactions with PostgreSQL provide true ACID guarantees because all operations execute within a single PostgreSQL transaction. ETag-based concurrency in transactions ensures that concurrent writers do not overwrite each other's changes - if any ETag check fails, all operations in the batch roll back. Use transactional state updates to implement saga compensation patterns without external coordination services.
