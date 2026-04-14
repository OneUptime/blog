# How to Build Dapr Workflows with Python SDK

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Python, Workflow, Microservice, Orchestration

Description: Learn how to build durable, fault-tolerant workflows using the Dapr Python SDK with practical examples for orchestration and activity patterns.

---

Dapr Workflows provide a reliable way to orchestrate long-running business processes across microservices. With the Python SDK, you can write workflow logic using familiar Python syntax while Dapr handles durability, retries, and state persistence. This guide walks through building complete workflows with the Dapr Python SDK.

## Prerequisites and Setup

Before writing workflows, install the required Python packages and ensure Dapr is running on your machine.

```bash
pip install dapr dapr-ext-workflow
```

Initialize Dapr locally for development:

```bash
dapr init
```

Verify the installation:

```bash
dapr --version
```

Create a project directory structure:

```text
my-workflow-app/
  app.py
  workflow.py
  dapr/
    components/
      statestore.yaml
```

## Defining Workflow Activities

Activities are the individual units of work within a workflow. Each activity is a plain Python function that gets registered with the workflow runtime.

```python
import dapr.ext.workflow as wf

def process_order_activity(ctx: wf.WorkflowActivityContext, input: dict) -> dict:
    order_id = input.get("order_id")
    quantity = input.get("quantity")
    # Simulate order processing logic
    print(f"Processing order {order_id} with quantity {quantity}")
    total = quantity * 10.0
    return {"order_id": order_id, "total": total, "status": "processed"}

def send_notification_activity(ctx: wf.WorkflowActivityContext, input: dict) -> str:
    order_id = input.get("order_id")
    email = input.get("email")
    print(f"Sending notification to {email} for order {order_id}")
    return f"Notification sent to {email}"

def charge_payment_activity(ctx: wf.WorkflowActivityContext, input: dict) -> dict:
    order_id = input.get("order_id")
    amount = input.get("amount")
    print(f"Charging {amount} for order {order_id}")
    return {"order_id": order_id, "charged": amount, "success": True}
```

Activities should be side-effect-free from the workflow's perspective - Dapr may replay the workflow and skip activity calls that have already completed.

## Defining the Workflow Orchestrator

The workflow orchestrator coordinates activities and defines the execution order. It must be deterministic and avoid direct I/O or randomness.

```python
import dapr.ext.workflow as wf
from datetime import timedelta

def order_processing_workflow(ctx: wf.DaprWorkflowContext, order_input: dict) -> dict:
    # Step 1: Process the order
    process_result = yield ctx.call_activity(
        process_order_activity,
        input=order_input
    )

    # Step 2: Charge payment using result from step 1
    payment_result = yield ctx.call_activity(
        charge_payment_activity,
        input={
            "order_id": process_result["order_id"],
            "amount": process_result["total"]
        }
    )

    # Step 3: Send notification
    notification_result = yield ctx.call_activity(
        send_notification_activity,
        input={
            "order_id": process_result["order_id"],
            "email": order_input.get("email")
        }
    )

    return {
        "order_id": process_result["order_id"],
        "status": "completed",
        "charged": payment_result["charged"],
        "notification": notification_result
    }
```

## Running the Workflow Application

Wire everything together in your main application file and start the workflow runtime.

```python
import dapr.ext.workflow as wf
from workflow import (
    order_processing_workflow,
    process_order_activity,
    charge_payment_activity,
    send_notification_activity
)

def main():
    # Create and configure the workflow runtime
    workflow_runtime = wf.WorkflowRuntime()

    # Register the workflow and its activities
    workflow_runtime.register_workflow(order_processing_workflow)
    workflow_runtime.register_activity(process_order_activity)
    workflow_runtime.register_activity(charge_payment_activity)
    workflow_runtime.register_activity(send_notification_activity)

    # Start the runtime
    workflow_runtime.start()

    # Create a workflow client
    workflow_client = wf.DaprWorkflowClient()

    # Start a workflow instance
    instance_id = workflow_client.schedule_new_workflow(
        workflow=order_processing_workflow,
        input={
            "order_id": "ORD-12345",
            "quantity": 5,
            "email": "customer@example.com"
        }
    )
    print(f"Started workflow with ID: {instance_id}")

    # Wait for the workflow to complete
    result = workflow_client.wait_for_workflow_completion(
        instance_id=instance_id,
        timeout_in_seconds=30
    )
    print(f"Workflow result: {result.serialized_output}")

    # Shutdown the runtime
    workflow_runtime.shutdown()

if __name__ == "__main__":
    main()
```

Run the application with the Dapr CLI:

```bash
dapr run --app-id order-processor --dapr-grpc-port 50001 -- python app.py
```

## Handling Fan-Out and Parallel Activities

Dapr Workflows support parallel execution of activities using fan-out patterns. This is useful when multiple independent tasks can run concurrently.

```python
def parallel_processing_workflow(ctx: wf.DaprWorkflowContext, items: list) -> list:
    # Fan-out: start all tasks in parallel
    tasks = [
        ctx.call_activity(process_order_activity, input={"order_id": item, "quantity": 1})
        for item in items
    ]

    # Fan-in: wait for all tasks to complete
    results = yield wf.when_all(tasks)
    return results

def batch_order_workflow(ctx: wf.DaprWorkflowContext, input: dict) -> dict:
    order_ids = input.get("order_ids", [])
    batch_size = 5

    all_results = []
    for i in range(0, len(order_ids), batch_size):
        batch = order_ids[i:i + batch_size]
        tasks = [
            ctx.call_activity(process_order_activity, input={"order_id": oid, "quantity": 1})
            for oid in batch
        ]
        batch_results = yield wf.when_all(tasks)
        all_results.extend(batch_results)

    return {"processed": len(all_results), "results": all_results}
```

## Handling External Events and Timeouts

Workflows can pause and wait for external events, enabling human approval flows and event-driven coordination.

```python
from datetime import timedelta

def approval_workflow(ctx: wf.DaprWorkflowContext, input: dict) -> dict:
    order_id = input.get("order_id")
    amount = input.get("amount")

    # Step 1: Notify approver
    yield ctx.call_activity(
        send_notification_activity,
        input={"order_id": order_id, "email": "manager@example.com"}
    )

    # Step 2: Wait for approval event with a timeout
    approval_event = ctx.wait_for_external_event("approval_received")
    timeout_event = ctx.create_timer(timedelta(hours=24))

    winner = yield wf.when_any([approval_event, timeout_event])

    if winner == timeout_event:
        # Handle timeout - auto-reject
        yield ctx.call_activity(
            send_notification_activity,
            input={"order_id": order_id, "email": "customer@example.com"}
        )
        return {"order_id": order_id, "status": "rejected", "reason": "timeout"}

    approval_data = approval_event.get_result()
    if approval_data.get("approved"):
        yield ctx.call_activity(
            charge_payment_activity,
            input={"order_id": order_id, "amount": amount}
        )
        return {"order_id": order_id, "status": "approved_and_charged"}

    return {"order_id": order_id, "status": "rejected"}
```

Raise an external event from another service:

```python
workflow_client.raise_workflow_event(
    instance_id="my-workflow-id",
    event_name="approval_received",
    data={"approved": True, "approver": "manager@example.com"}
)
```

## Summary

Dapr Workflows with the Python SDK offer a powerful, developer-friendly approach to building durable distributed workflows. You learned how to define activities as plain Python functions, orchestrate them in a deterministic workflow function, handle parallel fan-out patterns, and pause execution waiting for external events. The Dapr runtime handles all the durability, replay, and state management concerns, so your Python code stays clean and focused on business logic.
