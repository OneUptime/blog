# How to Test Dapr Python Applications

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Testing, Unit Test, Integration Test

Description: Learn how to write unit and integration tests for Dapr Python applications using mocking, the Dapr test client, and local component configuration.

---

## Introduction

Testing Dapr applications requires strategies for both unit tests - where you mock the Dapr sidecar - and integration tests - where you run a real Dapr sidecar locally. This guide covers both approaches using `pytest`, `unittest.mock`, and local Dapr components.

## Prerequisites

```bash
pip install dapr pytest pytest-asyncio httpx
dapr init
```

## Unit Testing with Mocks

Mock `DaprClient` to test business logic without a running sidecar:

```python
# test_order_service.py
from unittest.mock import MagicMock, patch
import json
import pytest

def save_order(order: dict):
    from dapr.clients import DaprClient
    with DaprClient() as client:
        client.save_state(
            store_name="statestore",
            key=order["id"],
            value=json.dumps(order)
        )
    return True

@patch("dapr.clients.DaprClient")
def test_save_order(mock_dapr_class):
    mock_client = MagicMock()
    mock_dapr_class.return_value.__enter__.return_value = mock_client

    result = save_order({"id": "ORD-001", "item": "widget"})

    assert result is True
    mock_client.save_state.assert_called_once_with(
        store_name="statestore",
        key="ORD-001",
        value='{"id": "ORD-001", "item": "widget"}'
    )
```

## Testing Pub/Sub Handlers

Test your pub/sub event handlers by constructing the CloudEvents payload directly:

```python
# test_handler.py
import json
from flask import Flask
from app import app as flask_app

@pytest.fixture
def client():
    flask_app.testing = True
    return flask_app.test_client()

def test_handle_order(client):
    payload = {
        "specversion": "1.0",
        "type": "com.dapr.event.sent",
        "source": "test",
        "id": "test-event-1",
        "data": {"order_id": "001", "item": "book"},
        "datacontenttype": "application/json"
    }
    response = client.post(
        "/orders",
        data=json.dumps(payload),
        content_type="application/json"
    )
    assert response.status_code == 200
    assert response.get_json()["status"] == "SUCCESS"
```

## Integration Testing with Local Dapr

Run integration tests against a real Dapr sidecar:

```python
# test_integration.py
import subprocess
import time
import requests
import pytest

@pytest.fixture(scope="session", autouse=True)
def dapr_sidecar():
    proc = subprocess.Popen([
        "dapr", "run",
        "--app-id", "test-app",
        "--app-port", "8080",
        "--dapr-http-port", "3501",
        "--dapr-grpc-port", "50051",
        "--resources-path", "./test-components",
        "--", "python", "app.py"
    ])
    time.sleep(3)
    yield
    proc.terminate()

def test_state_roundtrip():
    from dapr.clients import DaprClient
    import os
    os.environ["DAPR_GRPC_PORT"] = "50051"

    with DaprClient() as client:
        client.save_state("statestore", "test-key", "test-value")
        result = client.get_state("statestore", "test-key")
        assert result.data.decode() == "test-value"
```

## Testing Configuration Reads

```python
@patch("dapr.clients.DaprClient")
def test_read_config(mock_dapr_class):
    mock_client = MagicMock()
    mock_response = MagicMock()
    mock_response.items = {
        "feature_flag": MagicMock(value="true", version="1")
    }
    mock_client.get_configuration.return_value = mock_response
    mock_dapr_class.return_value.__enter__.return_value = mock_client

    from config_module import load_feature_flag
    result = load_feature_flag()
    assert result is True
```

## Running Tests

```bash
# Unit tests only
pytest tests/unit/ -v

# Integration tests (requires Dapr)
pytest tests/integration/ -v --timeout=30
```

## Summary

Dapr Python applications are testable at multiple levels. Unit tests use `unittest.mock` to replace `DaprClient` with mocks, letting you verify business logic in isolation. Integration tests run against a local Dapr sidecar with test component configurations. This layered approach gives you fast feedback without sacrificing confidence.
