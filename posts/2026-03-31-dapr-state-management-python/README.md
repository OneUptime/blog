# How to Use Dapr State Management with Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, State Management, Python, Redis, Microservice

Description: Learn how to save, retrieve, delete, and transact state in Python using the Dapr State Management API with Redis and other backing stores.

---

## Introduction

Dapr's State Management API provides a key-value store abstraction for Python applications. Whether the backend is Redis, Cosmos DB, or DynamoDB, your Python code uses the same `DaprClient` API to store and retrieve state.

## Installation

```bash
pip install dapr
```

Configure a state store component:

```yaml
# dapr/components/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.redis
  version: v1
  metadata:
    - name: redisHost
      value: localhost:6379
    - name: redisPassword
      value: ""
```

## Saving State

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    # Save a single entry
    user = {"id": "user-42", "name": "Alice", "email": "alice@example.com"}
    client.save_state("statestore", "user:42", json.dumps(user))
    print("User saved")
```

## Saving Multiple States

```python
from dapr.clients.grpc._state import StateItem

with DaprClient() as client:
    items = [
        StateItem(key="product:1", value=json.dumps({"name": "Widget", "stock": 100})),
        StateItem(key="product:2", value=json.dumps({"name": "Gadget", "stock": 50})),
        StateItem(key="product:3", value=json.dumps({"name": "Doohickey", "stock": 75})),
    ]
    client.save_bulk_state("statestore", items)
    print("Products saved in bulk")
```

## Getting State

```python
with DaprClient() as client:
    result = client.get_state("statestore", "user:42")

    if result.data:
        user = json.loads(result.data)
        print("Name:", user["name"])
        print("ETag:", result.etag)  # For optimistic concurrency
    else:
        print("Key not found")
```

## Getting Bulk State

```python
with DaprClient() as client:
    results = client.get_bulk_state(
        "statestore",
        ["product:1", "product:2", "product:3"]
    )

    for item in results.items:
        if item.data:
            product = json.loads(item.data)
            print(f"{item.key}: {product['name']} - stock: {product['stock']}")
```

## Deleting State

```python
with DaprClient() as client:
    client.delete_state("statestore", "user:42")
    print("User deleted")
```

## Transactional State Operations

Perform atomic multi-operation transactions:

```python
from dapr.clients.grpc._request import TransactionalStateOperation, TransactionOperationType

with DaprClient() as client:
    operations = [
        TransactionalStateOperation(
            operation_type=TransactionOperationType.upsert,
            key="order:500",
            data=json.dumps({"status": "pending", "items": 3}),
        ),
        TransactionalStateOperation(
            operation_type=TransactionOperationType.upsert,
            key="product:1",
            data=json.dumps({"name": "Widget", "stock": 97}),
        ),
        TransactionalStateOperation(
            operation_type=TransactionOperationType.delete,
            key="cart:user-42",
        ),
    ]
    client.execute_state_transaction("statestore", operations)
    print("Transaction complete")
```

## Optimistic Concurrency with ETags

```python
from dapr.clients.grpc._state import StateOptions, Concurrency

with DaprClient() as client:
    # Get state with ETag
    result = client.get_state("statestore", "product:1")
    product = json.loads(result.data)
    etag = result.etag

    # Update only if no concurrent modification
    product["stock"] -= 1
    client.save_state(
        "statestore",
        "product:1",
        json.dumps(product),
        etag=etag,
        options=StateOptions(concurrency=Concurrency.first_write),
    )
```

## Summary

Dapr's State Management API in Python provides a portable, provider-agnostic interface for storing and retrieving key-value state. Bulk operations, transactions, and ETag-based concurrency control give you the building blocks for reliable state management across any Python microservice, regardless of the underlying data store.
