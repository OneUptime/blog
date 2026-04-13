# How to Use Dapr Workflow for Task Chaining

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Task Chaining, Orchestration, Python

Description: Implement sequential task chaining in Dapr workflows where the output of each activity feeds into the next, enabling reliable multi-step processing pipelines.

---

Task chaining is the most fundamental workflow pattern: a sequence of activities where each step's output becomes the next step's input. Dapr workflows make this reliable - if any step fails, the workflow retries it without re-executing completed steps.

## What is Task Chaining?

```text
Input -> [Activity A] -> [Activity B] -> [Activity C] -> Output
```

Each activity transforms the data and passes it forward. The workflow engine uses event sourcing to skip completed activities during replay, so each step runs at-least-once but is not re-executed after successful completion.

## Basic Chain Implementation

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext

# Activities
def fetch_data(ctx: WorkflowActivityContext, source_id: str) -> dict:
    print(f"Fetching data from source {source_id}")
    return {"source_id": source_id, "raw": [1, 2, 3, 4, 5]}

def transform_data(ctx: WorkflowActivityContext, data: dict) -> dict:
    print(f"Transforming data from {data['source_id']}")
    transformed = [x * 2 for x in data["raw"]]
    return {**data, "transformed": transformed}

def validate_data(ctx: WorkflowActivityContext, data: dict) -> dict:
    print(f"Validating {len(data['transformed'])} records")
    if not data["transformed"]:
        raise ValueError("No records to validate")
    return {**data, "valid": True}

def store_data(ctx: WorkflowActivityContext, data: dict) -> dict:
    print(f"Storing {len(data['transformed'])} records")
    # Simulate DB write
    return {**data, "stored_at": "2026-03-31T00:00:00Z", "record_count": len(data["transformed"])}

# Workflow - chains activities sequentially
def etl_workflow(ctx: DaprWorkflowContext, source_id: str):
    # Each yield passes the previous result to the next activity
    raw = yield ctx.call_activity(fetch_data, input=source_id)
    transformed = yield ctx.call_activity(transform_data, input=raw)
    validated = yield ctx.call_activity(validate_data, input=transformed)
    stored = yield ctx.call_activity(store_data, input=validated)
    return stored
```

## Conditional Branching in a Chain

Add conditional logic between steps:

```python
def process_order_workflow(ctx: DaprWorkflowContext, order: dict):
    validated = yield ctx.call_activity(validate_order, input=order)

    # Branch based on activity result
    if validated.get("requires_approval"):
        approved = yield ctx.call_activity(request_approval, input=validated)
        if not approved.get("approved"):
            return {"status": "rejected", "order_id": order["id"]}
        validated = approved

    charged = yield ctx.call_activity(charge_payment, input=validated)
    shipped = yield ctx.call_activity(ship_order, input=charged)
    return shipped
```

## Error Handling in Chains

Use try/except within the workflow to handle activity failures:

```python
def resilient_chain(ctx: DaprWorkflowContext, payload: dict):
    try:
        result = yield ctx.call_activity(risky_activity, input=payload)
    except Exception as e:
        # Log the error and use a fallback
        result = yield ctx.call_activity(fallback_activity, input=payload)

    final = yield ctx.call_activity(finalize, input=result)
    return final
```

## Passing Context Through the Chain

Carry metadata and context across all steps:

```python
def audited_workflow(ctx: DaprWorkflowContext, request: dict):
    context = {
        "request_id": request["id"],
        "started_at": ctx.current_utc_datetime.isoformat(),
        "steps_completed": 0
    }

    step1 = yield ctx.call_activity(step_one, input={**request, "context": context})
    context["steps_completed"] = 1

    step2 = yield ctx.call_activity(step_two, input={**step1, "context": context})
    context["steps_completed"] = 2

    return {**step2, "audit": context}
```

## Starting the Chain

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowClient

runtime = WorkflowRuntime()
runtime.register_workflow(etl_workflow)
runtime.register_activity(fetch_data)
runtime.register_activity(transform_data)
runtime.register_activity(validate_data)
runtime.register_activity(store_data)

with runtime:
    client = DaprWorkflowClient()
    instance_id = client.schedule_new_workflow(etl_workflow, input="source-001")

    state = client.wait_for_workflow_completion(instance_id, timeout_in_seconds=60)
    print(f"Chain result: {state.serialized_output}")
```

## Summary

Dapr workflow task chaining provides durable, step-by-step processing where each activity's output flows into the next. The workflow engine guarantees that completed steps are not re-executed on retry, making chains reliable across crashes. Conditional branching and try/except patterns extend basic chains into robust processing pipelines for real-world use cases like ETL, order processing, and multi-step approvals.
