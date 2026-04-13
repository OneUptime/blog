# How to Implement Workflow Activities in Python

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Python, Activity, SDK

Description: Implement Dapr workflow activities in Python using the dapr-ext-workflow package, with input/output typing, async activities, error handling, and testing patterns.

---

## Overview

Dapr workflow activities in Python are regular functions registered with the `WorkflowRuntime` (either via explicit `register_activity` calls or the `@wfr.activity` decorator on a runtime instance). They receive input, perform side effects, and return output. Activities can call external services, interact with databases, or publish events - all the work that workflow orchestrators must not do directly.

## Installation

```bash
pip install dapr dapr-ext-workflow
```

## Defining Activities

```python
from dapr.ext.workflow import WorkflowActivityContext
from dataclasses import dataclass
from typing import Optional
import json
import httpx

@dataclass
class OrderInput:
    order_id: str
    amount: float
    items: list[str]

@dataclass
class PaymentResult:
    payment_id: str
    status: str
    message: Optional[str] = None

# Activity: fetch order details from state store
def fetch_order_activity(ctx: WorkflowActivityContext, order_id: str) -> dict:
    from dapr.clients import DaprClient
    with DaprClient() as client:
        result = client.get_state("statestore", f"order:{order_id}")
        if not result.data:
            raise ValueError(f"Order {order_id} not found")
        return json.loads(result.data)

# Activity: process payment
def process_payment_activity(ctx: WorkflowActivityContext, order: dict) -> dict:
    """Calls external payment API."""
    # httpx is safe to use in activities (not in workflow orchestrators)
    response = httpx.post(
        "http://payment-service/v1/charge",
        json={"orderId": order["orderId"], "amount": order["amount"]},
        timeout=10.0
    )
    response.raise_for_status()
    result = response.json()
    return {"paymentId": result["id"], "status": result["status"]}

# Activity: send confirmation
def send_confirmation_activity(ctx: WorkflowActivityContext, input_data: dict) -> bool:
    from dapr.clients import DaprClient
    with DaprClient() as client:
        client.publish_event(
            pubsub_name="pubsub",
            topic_name="order-confirmations",
            data=json.dumps(input_data),
            data_content_type="application/json"
        )
    return True
```

## Workflow Orchestrator

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowRuntime

def order_fulfillment_workflow(ctx: DaprWorkflowContext, order_id: str) -> dict:
    # Fetch order - yields to runtime, replayed on restart
    order = yield ctx.call_activity(fetch_order_activity, input=order_id)

    # Process payment
    payment = yield ctx.call_activity(process_payment_activity, input=order)

    if payment["status"] != "success":
        raise Exception(f"Payment failed for order {order_id}")

    # Send confirmation
    yield ctx.call_activity(send_confirmation_activity, input={
        "orderId": order_id,
        "paymentId": payment["paymentId"]
    })

    return {
        "orderId": order_id,
        "paymentId": payment["paymentId"],
        "status": "fulfilled"
    }
```

## Registering and Running

```python
from dapr.ext.workflow import WorkflowRuntime
from dapr.clients import DaprClient

def main():
    runtime = WorkflowRuntime()

    # Register workflow and activities
    runtime.register_workflow(order_fulfillment_workflow)
    runtime.register_activity(fetch_order_activity)
    runtime.register_activity(process_payment_activity)
    runtime.register_activity(send_confirmation_activity)

    runtime.start()
    print("Workflow runtime started")

    import signal, sys
    def shutdown(sig, frame):
        runtime.shutdown()
        sys.exit(0)

    signal.signal(signal.SIGTERM, shutdown)
    signal.pause()

if __name__ == "__main__":
    main()
```

## Starting a Workflow from Client Code

```python
from dapr.ext.workflow import DaprWorkflowClient

def start_order_workflow(order_id: str):
    client = DaprWorkflowClient()
    instance_id = client.schedule_new_workflow(
        workflow=order_fulfillment_workflow,
        input=order_id,
        instance_id=f"order-{order_id}"
    )
    print(f"Started workflow: {instance_id}")

    # Poll for completion
    state = client.wait_for_workflow_completion(
        instance_id=instance_id,
        timeout_in_seconds=30
    )
    print(f"Workflow status: {state.runtime_status}")
    return state.serialized_output
```

## Testing Activities in Isolation

```python
import pytest
from unittest.mock import patch, MagicMock

def test_process_payment_activity_success():
    mock_ctx = MagicMock()
    order = {"orderId": "order-1", "amount": 99.99}

    with patch("httpx.post") as mock_post:
        mock_post.return_value.json.return_value = {
            "id": "pay-123", "status": "success"
        }
        mock_post.return_value.raise_for_status = lambda: None

        result = process_payment_activity(mock_ctx, order)

    assert result["paymentId"] == "pay-123"
    assert result["status"] == "success"
```

## Summary

Dapr workflow activities in Python are plain functions registered with `WorkflowRuntime`. They can use any Python library, make HTTP calls, or interact with Dapr building blocks because activities run outside the replay constraint that applies to workflow orchestrators. Register activities alongside workflows using `runtime.register_activity`, and call them from orchestrators with `ctx.call_activity`. Test activities in isolation by passing a mock `WorkflowActivityContext` - no running Dapr sidecar required.
