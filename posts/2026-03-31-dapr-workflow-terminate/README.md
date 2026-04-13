# How to Terminate a Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Terminate, Operation, Lifecycle

Description: Learn how to terminate Dapr workflow instances gracefully and forcibly, handle termination in your workflow code, and clean up after terminated workflows.

---

Terminating a Dapr workflow immediately stops its execution and transitions it to a `TERMINATED` state. Unlike pausing, termination is permanent - the workflow cannot be resumed. Understanding when and how to terminate workflows is essential for operational control.

## When to Terminate a Workflow

- Cancelling an order or booking before it completes
- Stopping a workflow started with incorrect input
- Aborting a long-running process due to an incident
- Cleaning up stuck or hung workflows

## Terminating via SDK

```python
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()

# Terminate a workflow
client.terminate_workflow("order-processing-ORD-001")
print("Workflow terminated")

# Verify
state = client.get_workflow_state("order-processing-ORD-001")
print(f"Status: {state.runtime_status.name}")  # TERMINATED
```

## Terminating via CLI

```bash
dapr workflow terminate order-processing-ORD-001 --app-id order-service
```

## Terminating via HTTP API

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-processing-ORD-001/terminate
```

## Handling Termination in Workflow Code

Workflows do not receive a termination callback. However, you can check if the workflow was asked to stop by using an external event as a cancellation signal:

```python
from dapr.ext.workflow import DaprWorkflowContext, when_any
from datetime import timedelta

def cancellable_workflow(ctx: DaprWorkflowContext, params: dict):
    # Start long-running work
    work_task = ctx.call_activity(long_running_activity, input=params)

    # Race between completion and cancellation signal
    cancel_event = ctx.wait_for_external_event("cancel")
    timeout = ctx.create_timer(ctx.current_utc_datetime + timedelta(hours=2))

    winner = yield when_any([work_task, cancel_event, timeout])

    if winner == cancel_event:
        yield ctx.call_activity(handle_cancellation, input=params)
        return {"status": "cancelled"}
    elif winner == timeout:
        yield ctx.call_activity(handle_timeout, input=params)
        return {"status": "timed_out"}

    return {"status": "completed", "result": work_task.get_result()}
```

## Graceful Cancellation via Event

Send a cancellation event before terminating:

```python
def gracefully_cancel(instance_id: str):
    # 1. Send cancellation event so the workflow can clean up
    client.raise_workflow_event(
        instance_id=instance_id,
        event_name="cancel",
        data={"reason": "user_requested"}
    )

    # 2. Wait briefly for the workflow to handle cancellation
    import time
    time.sleep(5)

    # 3. Force terminate if it has not completed
    state = client.get_workflow_state(instance_id)
    if state and state.runtime_status.name not in ("COMPLETED", "FAILED"):
        client.terminate_workflow(instance_id)
        print(f"Force terminated: {instance_id}")
```

## Terminating Multiple Workflows

Terminate all running instances of a specific workflow:

```python
def terminate_all_running(instance_ids: list):
    terminated = []
    for instance_id in instance_ids:
        state = client.get_workflow_state(instance_id)
        if state and state.runtime_status.name in ("RUNNING", "SUSPENDED"):
            client.terminate_workflow(instance_id)
            terminated.append(instance_id)
    print(f"Terminated {len(terminated)} workflows")
    return terminated
```

## Cleanup After Termination

Terminated workflows retain their event history. Purge to free state store space:

```python
def terminate_and_purge(instance_id: str):
    client.terminate_workflow(instance_id)

    # Wait for termination to propagate
    import time
    time.sleep(1)

    client.purge_workflow(instance_id)
    print(f"Workflow {instance_id} terminated and purged")
```

## Summary

Dapr workflow termination immediately stops execution and is permanent. For clean shutdown, prefer sending a cancellation external event before terminating so the workflow can run compensating activities. Use force termination for stuck or unresponsive workflows. Always purge terminated workflows in production to reclaim state store storage, especially for high-volume systems.
