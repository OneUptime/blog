# How to Use Dapr Python Client

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Client, Microservice, API

Description: Learn how to use the Dapr Python client to interact with state stores, pub/sub, service invocation, secrets, and configuration APIs in Python.

---

## Introduction

The `DaprClient` in the Dapr Python SDK is your main interface for accessing all Dapr building blocks from Python. It provides methods for state management, event publishing, service calls, secret retrieval, and configuration reads with a clean, Pythonic API.

## Installation

```bash
pip install dapr
```

## Creating the Client

```python
from dapr.clients import DaprClient

# Use as a context manager for automatic cleanup
with DaprClient() as client:
    # All Dapr operations go here
    pass
```

## State Management

```python
import json
from dapr.clients import DaprClient
from dapr.clients.grpc._state import StateItem, StateOptions, Consistency, Concurrency

with DaprClient() as client:
    # Save state
    user = {"id": "user-42", "name": "Alice", "role": "admin"}
    client.save_state("statestore", "user:42", json.dumps(user))

    # Get state
    result = client.get_state("statestore", "user:42")
    if result.data:
        retrieved = json.loads(result.data)
        print("User:", retrieved["name"])

    # Delete state
    client.delete_state("statestore", "user:42")

    # Save multiple states in bulk
    items = [
        StateItem(key="product:1", value=json.dumps({"name": "Widget", "price": 9.99})),
        StateItem(key="product:2", value=json.dumps({"name": "Gadget", "price": 29.99})),
    ]
    client.save_bulk_state("statestore", items)
```

## Pub/Sub Publishing

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    order = {"orderId": "order-123", "customerId": "user-42", "total": 49.99}

    client.publish_event(
        pubsub_name="pubsub",
        topic_name="orders",
        data=json.dumps(order),
        data_content_type="application/json",
    )
    print("Event published")
```

## Service Invocation

```python
import json
from dapr.clients import DaprClient

with DaprClient() as client:
    # GET request
    result = client.invoke_method(
        app_id="inventory-service",
        method_name="stock/widget",
        http_verb="GET",
        data=b"",
    )
    print("Stock:", result.text())

    # POST request
    payload = json.dumps({"orderId": "order-123", "amount": 49.99})
    result = client.invoke_method(
        app_id="payment-service",
        method_name="charge",
        http_verb="POST",
        data=payload.encode("utf-8"),
    )
```

## Secrets Management

```python
with DaprClient() as client:
    # Get a single secret
    secret = client.get_secret("kubernetes-secrets", "db-password")
    print("Secret keys:", list(secret.secret.keys()))
    db_password = secret.secret.get("db-password")

    # Get all secrets
    all_secrets = client.get_bulk_secret("kubernetes-secrets")
    for name, values in all_secrets.secrets.items():
        print(f"Secret: {name}")
```

## Configuration

```python
with DaprClient() as client:
    # Get configuration values
    config = client.get_configuration(
        store_name="configstore",
        keys=["feature-flag", "max-retries"],
    )

    feature_flag = config.items.get("feature-flag")
    if feature_flag:
        print("Feature flag:", feature_flag.value)
```

## Summary

The Dapr Python client provides a clean, context-manager-based API for all Dapr building blocks. Using the `with DaprClient() as client:` pattern ensures proper connection cleanup and gives you access to state, pub/sub, service invocation, secrets, and configuration through a consistent, Pythonic interface.
