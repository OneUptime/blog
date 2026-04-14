# How to Test Event-Driven Systems Built with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Testing, Event-Driven, Integration Test, Unit Test, Test Container

Description: Test Dapr event-driven microservices with unit tests, integration tests using Testcontainers, and end-to-end event flow validation.

---

## Overview

Testing event-driven systems built with Dapr requires different strategies at each level: unit tests for handler logic, integration tests for pub/sub flows, and end-to-end tests for complete event chains. Dapr's testing support includes a mock client for unit tests and the ability to run with Testcontainers for integration testing.

## Unit Testing Event Handlers

Mock the Dapr client to test handler logic in isolation:

```python
from unittest.mock import MagicMock
import json
import pytest

# The handler to test
def handle_order_placed(event_data: dict, dapr_client) -> dict:
    """Process OrderPlaced event and update inventory"""
    order_id = event_data["orderId"]
    items = event_data["items"]

    # Update inventory for each item
    for item in items:
        inventory_key = f"inventory:{item['productId']}"
        current = dapr_client.get_state("statestore", inventory_key)
        stock = json.loads(current.data) if current.data else {"quantity": 100}
        stock["quantity"] -= item["quantity"]
        dapr_client.save_state("statestore", inventory_key, json.dumps(stock))

    return {"orderId": order_id, "itemsReserved": len(items)}

def test_handle_order_placed_reserves_inventory():
    # Arrange
    mock_client = MagicMock()
    mock_state = MagicMock()
    mock_state.data = json.dumps({"quantity": 50})
    mock_client.get_state.return_value = mock_state

    event_data = {
        "orderId": "ord-001",
        "items": [
            {"productId": "prod-A", "quantity": 3},
            {"productId": "prod-B", "quantity": 2}
        ]
    }

    # Act
    result = handle_order_placed(event_data, mock_client)

    # Assert
    assert result["orderId"] == "ord-001"
    assert result["itemsReserved"] == 2
    assert mock_client.get_state.call_count == 2
    assert mock_client.save_state.call_count == 2

def test_handle_order_placed_empty_items():
    mock_client = MagicMock()
    event_data = {"orderId": "ord-002", "items": []}
    result = handle_order_placed(event_data, mock_client)
    assert result["itemsReserved"] == 0
    mock_client.get_state.assert_not_called()
```

## Integration Testing with Testcontainers

Use Testcontainers to run a real Redis state store and test the full pub/sub flow:

```python
import pytest
from testcontainers.redis import RedisContainer
import dapr.clients as dapr
import json
import time

@pytest.fixture(scope="module")
def redis_container():
    with RedisContainer() as redis:
        yield redis

def test_state_store_integration(redis_container):
    """Test Dapr state store with real Redis"""
    redis_host = redis_container.get_container_host_ip()
    redis_port = redis_container.get_exposed_port(6379)

    # In a real test, you'd configure Dapr to use this Redis instance
    # For this example, we test the component configuration
    print(f"Redis running at {redis_host}:{redis_port}")

    with dapr.DaprClient() as client:
        # Save state
        client.save_state("statestore", "test:key", "test-value")

        # Get state
        result = client.get_state("statestore", "test:key")
        assert result.data == b"test-value"

        # Delete state
        client.delete_state("statestore", "test:key")
        result = client.get_state("statestore", "test:key")
        assert not result.data
```

## End-to-End Event Flow Testing

```python
import requests
import time
import json

BASE_URL = "http://localhost:3500"

def test_order_placed_event_flow():
    """Test: OrderPlaced -> InventoryReserved -> PaymentProcessed chain"""

    order_id = f"test-order-{int(time.time())}"

    # Step 1: Publish OrderPlaced event
    response = requests.post(
        f"{BASE_URL}/v1.0/publish/orders-pubsub/OrderPlaced",
        json={"orderId": order_id, "customerId": "test-customer", "total": 99.99},
        headers={"Content-Type": "application/json"}
    )
    assert response.status_code == 204, f"Publish failed: {response.text}"

    # Step 2: Wait for event processing
    time.sleep(2)

    # Step 3: Verify inventory was reserved
    inventory_state = requests.get(
        f"{BASE_URL}/v1.0/state/statestore/inventory-reserved:{order_id}"
    )
    assert inventory_state.status_code == 200, "Inventory state not found"

    # Step 4: Verify payment was initiated
    payment_state = requests.get(
        f"{BASE_URL}/v1.0/state/statestore/payment:{order_id}"
    )
    assert payment_state.status_code == 200, "Payment state not found"
    payment_data = payment_state.json()
    assert payment_data["status"] in ["pending", "completed"]

    print(f"Event flow test passed for order {order_id}")
```

## Testing with Dapr Slim Init

Use Dapr's slim init for CI environments:

```bash
# Initialize Dapr without Docker dependencies for CI
dapr init --slim

# Run tests with Dapr in slim mode
dapr run \
  --app-id test-service \
  --app-port 8080 \
  --resources-path ./test/components \
  -- pytest tests/integration/
```

## Subscription Endpoint Contract Tests

```python
import pytest
from flask.testing import FlaskClient

def test_subscription_endpoint_returns_success(test_client):
    response = test_client.post(
        '/orders/placed',
        json={
            "specversion": "1.0",
            "id": "test-001",
            "source": "test",
            "type": "OrderPlaced",
            "data": {"orderId": "ord-test", "customerId": "c-001", "total": 50.00}
        }
    )
    assert response.status_code == 200
    data = response.get_json()
    assert data["status"] == "SUCCESS"

def test_subscription_endpoint_handles_missing_data(test_client):
    response = test_client.post('/orders/placed', json={})
    # Should return 200 to avoid retry storms on malformed events
    assert response.status_code == 200
```

## Summary

Testing Dapr event-driven systems requires a three-tier strategy: unit tests with mocked Dapr clients for handler logic, integration tests with Testcontainers for real component interactions, and end-to-end tests that publish events and verify state changes across the entire system. Subscription endpoint contract tests validate that handlers correctly return 200 SUCCESS to prevent Dapr from retrying events indefinitely.
