# How to Test Dapr Workflows Locally

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Testing, Local Development, Unit Test, Integration Test

Description: Learn how to test Dapr Workflows locally using the Dapr CLI, mock activities, unit tests, and integration tests without a full Kubernetes cluster.

---

## Testing Strategies for Dapr Workflows

Testing Dapr Workflows involves three levels:
1. Unit tests for activity logic
2. Integration tests with the Dapr sidecar running locally
3. End-to-end tests in a staging environment

This guide focuses on the first two, which you can run on a developer laptop.

## Setting Up Local Dapr for Workflow Testing

Initialize Dapr locally if you have not already:

```bash
dapr init
```

This installs Redis (for state) and Zipkin (for tracing) via Docker. Dapr Workflow uses the state store to persist workflow state.

## Unit Testing Activities

Activities are plain functions - test them independently without Dapr:

```python
# app/activities.py
def reserve_inventory(ctx, order: dict) -> bool:
    resp = requests.post(
        os.environ.get("INVENTORY_URL", "http://inventory") + "/reserve",
        json=order
    )
    return resp.status_code == 200
```

```python
# tests/test_activities.py
import pytest
from unittest.mock import patch, MagicMock
from app.activities import reserve_inventory

def test_reserve_inventory_success():
    mock_ctx = MagicMock()
    with patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 200
        result = reserve_inventory(mock_ctx, {"id": "ORD-1", "items": ["A"]})
    assert result is True

def test_reserve_inventory_failure():
    mock_ctx = MagicMock()
    with patch("requests.post") as mock_post:
        mock_post.return_value.status_code = 409
        result = reserve_inventory(mock_ctx, {"id": "ORD-1", "items": ["A"]})
    assert result is False
```

## Running Activity Unit Tests

```bash
pytest tests/test_activities.py -v
```

## Integration Testing the Workflow

Start the app with the Dapr sidecar:

```bash
dapr run \
  --app-id order-app \
  --app-port 6000 \
  --dapr-http-port 3500 \
  --resources-path ./components \
  -- python app.py
```

In a separate terminal, trigger the workflow:

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/order_saga_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"id": "TEST-001", "items": ["item-1"], "total": 25.00}'
```

Poll for completion:

```bash
INSTANCE_ID="<from above response>"
curl http://localhost:3500/v1.0/workflows/dapr/$INSTANCE_ID
```

## Writing an Automated Integration Test

```python
# tests/test_workflow_integration.py
import time
import pytest
import requests

DAPR_PORT = 3500
WORKFLOW_NAME = "order_saga_workflow"

def start_workflow(payload: dict) -> str:
    resp = requests.post(
        f"http://localhost:{DAPR_PORT}/v1.0/workflows/dapr/{WORKFLOW_NAME}/start",
        json=payload
    )
    resp.raise_for_status()
    return resp.json()["instanceID"]

def get_workflow_status(instance_id: str) -> dict:
    resp = requests.get(
        f"http://localhost:{DAPR_PORT}/v1.0/workflows/dapr/{instance_id}"
    )
    resp.raise_for_status()
    return resp.json()

def wait_for_completion(instance_id: str, timeout: int = 30) -> dict:
    deadline = time.time() + timeout
    while time.time() < deadline:
        status = get_workflow_status(instance_id)
        if status["runtimeStatus"] in ("COMPLETED", "FAILED", "TERMINATED"):
            return status
        time.sleep(1)
    raise TimeoutError(f"Workflow {instance_id} did not complete in {timeout}s")

@pytest.mark.integration
def test_order_saga_success():
    instance_id = start_workflow({
        "id": "TEST-001",
        "items": ["item-1"],
        "total": 25.00
    })
    final_status = wait_for_completion(instance_id)
    assert final_status["runtimeStatus"] == "COMPLETED"
    assert "success" in final_status["properties"]["dapr.workflow.output"]
```

## Using Mock Components for Testing

Create a test-only component for a mock state store:

```yaml
# components/test/statestore.yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: statestore
spec:
  type: state.in-memory
  version: v1
```

Run with mock components:

```bash
dapr run --resources-path ./components/test -- python app.py
```

## Summary

Testing Dapr Workflows locally is straightforward: unit test activities as plain functions with mocked HTTP calls, and integration test workflows by running the Dapr sidecar alongside your app with `dapr run`. Use in-memory state store components for fast, isolated test runs without Redis dependencies.
