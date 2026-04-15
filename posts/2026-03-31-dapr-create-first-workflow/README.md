# How to Create Your First Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Getting Started, Python, Microservice

Description: Build your first Dapr workflow step by step - define activities, compose a workflow, run it locally, and verify execution using the Dapr Python SDK.

---

Dapr Workflows provide durable, stateful orchestration for microservices. Unlike stateless service calls, workflows survive restarts, track progress, and automatically retry failed steps. This guide walks through creating a simple but complete workflow using the Dapr Python SDK.

## Prerequisites

Install Dapr and the Python SDK:

```bash
dapr init
pip install dapr dapr-ext-workflow
```

## Step 1: Define Workflow Activities

Activities are the individual units of work in a workflow. Each activity is a regular function:

```python
# activities.py
from dapr.ext.workflow import WorkflowActivityContext

def validate_order(ctx: WorkflowActivityContext, order: dict) -> dict:
    print(f"Validating order {order['id']}")
    if order.get("amount", 0) <= 0:
        raise ValueError("Invalid order amount")
    return {**order, "validated": True}

def charge_payment(ctx: WorkflowActivityContext, order: dict) -> dict:
    print(f"Charging payment for order {order['id']}")
    # Simulate payment processing
    return {**order, "payment_id": "pay-abc123", "charged": True}

def fulfill_order(ctx: WorkflowActivityContext, order: dict) -> dict:
    print(f"Fulfilling order {order['id']}")
    return {**order, "tracking_number": "TRK-001", "fulfilled": True}
```

## Step 2: Define the Workflow

Compose activities into an orchestrated workflow:

```python
# workflow.py
from dapr.ext.workflow import DaprWorkflowContext
from activities import validate_order, charge_payment, fulfill_order

def order_workflow(ctx: DaprWorkflowContext, order: dict):
    # Step 1: Validate
    validated = yield ctx.call_activity(validate_order, input=order)

    # Step 2: Charge
    charged = yield ctx.call_activity(charge_payment, input=validated)

    # Step 3: Fulfill
    result = yield ctx.call_activity(fulfill_order, input=charged)

    return result
```

## Step 3: Register and Start the Workflow Runtime

```python
# app.py
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowClient
from workflow import order_workflow
from activities import validate_order, charge_payment, fulfill_order

workflowRuntime = WorkflowRuntime()
workflowRuntime.register_workflow(order_workflow)
workflowRuntime.register_activity(validate_order)
workflowRuntime.register_activity(charge_payment)
workflowRuntime.register_activity(fulfill_order)

workflowRuntime.start()

try:
    client = DaprWorkflowClient()

    order = {"id": "ORD-001", "amount": 99.99, "item": "Widget"}

    instance_id = client.schedule_new_workflow(
        workflow=order_workflow,
        input=order
    )
    print(f"Workflow started: {instance_id}")

    # Wait for completion
    state = client.wait_for_workflow_completion(instance_id, timeout_in_seconds=30)
    print(f"Workflow completed with status: {state.runtime_status}")
    print(f"Result: {state.serialized_output}")
finally:
    workflowRuntime.shutdown()
```

## Step 4: Run the Workflow

Start the app with Dapr:

```bash
dapr run --app-id order-processor \
         --resources-path ./components \
         -- python app.py
```

## Step 5: Check Workflow Status via HTTP

Query the workflow status using the Dapr HTTP API:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/{instance-id}
```

Response:

```json
{
  "instanceID": "abc-123",
  "workflowName": "order_workflow",
  "runtimeStatus": "COMPLETED",
  "serializedOutput": "{\"id\":\"ORD-001\",\"fulfilled\":true}"
}
```

## Understanding Workflow Durability

If the process crashes mid-workflow, Dapr replays the workflow from the last completed activity on restart. The activities are not re-executed; their results are replayed from state. This makes workflows resilient to infrastructure failures without any special code.

## Summary

Creating a Dapr workflow involves three steps: defining activity functions, composing them in a workflow function using `yield ctx.call_activity()`, and registering both with the workflow runtime. The workflow engine handles durability, retries, and state persistence automatically. Start with simple linear workflows and progressively add branching, fan-out, and external events as your needs grow.
