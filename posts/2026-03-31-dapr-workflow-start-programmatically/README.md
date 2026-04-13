# How to Start a Dapr Workflow Programmatically

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, SDK, Trigger, Microservice

Description: Learn how to start Dapr workflows programmatically from your application using the SDK and HTTP API, with idempotency patterns and input validation examples.

---

Workflows are most useful when triggered programmatically by application events - an incoming HTTP request, a pub/sub message, a scheduled job, or another workflow. This guide covers how to start Dapr workflows from different contexts in your application.

## Starting from an HTTP Handler

Trigger a workflow when a request comes in:

```python
from flask import Flask, request, jsonify
from dapr.ext.workflow import DaprWorkflowClient
from workflows import order_workflow

app = Flask(__name__)
workflow_client = DaprWorkflowClient()

@app.route("/orders", methods=["POST"])
def create_order():
    order = request.json

    # Use order ID as the workflow instance ID for idempotency
    instance_id = f"order-{order['id']}"

    try:
        workflow_client.schedule_new_workflow(
            workflow=order_workflow,
            input=order,
            instance_id=instance_id
        )
        return jsonify({"workflow_id": instance_id, "status": "started"}), 202
    except Exception as e:
        # If instance already exists, the workflow is already running
        if "already exists" in str(e).lower():
            return jsonify({"workflow_id": instance_id, "status": "already_running"}), 200
        raise
```

## Starting from a Pub/Sub Subscriber

Trigger workflows from incoming messages:

```python
from dapr.ext.grpc import App
from dapr.ext.workflow import DaprWorkflowClient
from workflows import process_event_workflow

dapr_app = App()
workflow_client = DaprWorkflowClient()

@dapr_app.subscribe(pubsub_name="pubsub", topic="user-signups")
def handle_user_signup(event) -> None:
    user_data = event.data
    instance_id = f"onboarding-{user_data['user_id']}"

    workflow_client.schedule_new_workflow(
        workflow=process_event_workflow,
        input=user_data,
        instance_id=instance_id
    )
    print(f"Onboarding workflow started for user {user_data['user_id']}")
```

## Starting via HTTP API

Start a workflow without the SDK using the Dapr HTTP API:

```bash
curl -X POST \
  "http://localhost:3500/v1.0/workflows/dapr/order_workflow/start?instanceID=order-ORD-001" \
  -H "Content-Type: application/json" \
  -d '{"id": "ORD-001", "amount": 99.99, "items": ["widget-1"]}'
```

## Idempotent Workflow Starts

Use deterministic instance IDs to prevent duplicate workflow runs:

```python
import hashlib
from dapr.ext.workflow import WorkflowStatus

def get_workflow_instance_id(workflow_name: str, dedup_key: str) -> str:
    hash_input = f"{workflow_name}:{dedup_key}"
    return hashlib.md5(hash_input.encode()).hexdigest()[:16]

# Idempotent start - safe to call multiple times
def start_order_workflow_idempotent(order_id: str, order_data: dict):
    instance_id = get_workflow_instance_id("order_workflow", order_id)

    # Check if already running
    state = workflow_client.get_workflow_state(instance_id)
    if state and state.runtime_status in (WorkflowStatus.RUNNING, WorkflowStatus.PENDING):
        print(f"Workflow {instance_id} already running")
        return instance_id

    workflow_client.schedule_new_workflow(
        workflow=order_workflow,
        input=order_data,
        instance_id=instance_id
    )
    return instance_id
```

## Starting Multiple Workflows in Bulk

Kick off multiple workflow instances for a batch:

```python
def start_batch_workflows(items: list) -> list:
    instance_ids = []

    for item in items:
        instance_id = f"process-{item['id']}"
        workflow_client.schedule_new_workflow(
            workflow=item_processor_workflow,
            input=item,
            instance_id=instance_id
        )
        instance_ids.append(instance_id)
        print(f"Started workflow: {instance_id}")

    return instance_ids
```

## Passing Validated Input

Validate and sanitize input before starting a workflow:

```python
from pydantic import BaseModel, field_validator

class OrderInput(BaseModel):
    id: str
    amount: float
    items: list

    @field_validator("amount")
    @classmethod
    def amount_positive(cls, v):
        if v <= 0:
            raise ValueError("Amount must be positive")
        return v

def start_validated_order_workflow(raw_input: dict) -> str:
    order = OrderInput(**raw_input)  # Raises if invalid

    instance_id = f"order-{order.id}"
    workflow_client.schedule_new_workflow(
        workflow=order_workflow,
        input=order.model_dump(),
        instance_id=instance_id
    )
    return instance_id
```

## Summary

Starting Dapr workflows programmatically is straightforward via both the SDK and HTTP API. Always use deterministic instance IDs derived from a business key to make workflow starts idempotent - this protects against duplicate triggers from retries or at-least-once pub/sub delivery. Validate inputs before scheduling to catch errors early, before the workflow begins executing activities.
