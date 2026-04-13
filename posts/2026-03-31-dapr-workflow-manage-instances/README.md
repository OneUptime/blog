# How to Manage Dapr Workflow Instances

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Instance Management, Operation, CLI

Description: Learn how to manage Dapr workflow instances - start, query, suspend, resume, terminate, and purge workflows using the CLI, HTTP API, and SDK.

---

Dapr workflows run as long-lived instances that you need to start, monitor, and manage over their lifecycle. This guide covers all the operational commands and APIs for managing workflow instances in development and production.

## Starting a Workflow Instance

Via SDK:

```python
from dapr.ext.workflow import DaprWorkflowClient
from workflows import my_workflow

client = DaprWorkflowClient()

# Let Dapr generate an instance ID
instance_id = client.schedule_new_workflow(
    workflow=my_workflow,
    input={"key": "value"}
)
print(f"Started: {instance_id}")

# Provide a custom instance ID (useful for idempotency)
instance_id = client.schedule_new_workflow(
    workflow=my_workflow,
    input={"key": "value"},
    instance_id="order-processing-ORD-001"
)
```

Via HTTP API:

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/my_workflow/start \
  -H "Content-Type: application/json" \
  -d '{"key": "value"}'
```

## Querying Workflow Status

Check a specific instance:

```python
state = client.get_workflow_state("order-processing-ORD-001")
print(f"Status: {state.runtime_status}")
print(f"Output: {state.serialized_output}")
print(f"Created: {state.created_at}")
print(f"Last updated: {state.last_updated_at}")
```

Via HTTP API:

```bash
curl http://localhost:3500/v1.0/workflows/dapr/order-processing-ORD-001
```

Response:

```json
{
  "instanceID": "order-processing-ORD-001",
  "workflowName": "order_workflow",
  "runtimeStatus": "RUNNING",
  "createdAt": "2026-03-31T10:00:00Z",
  "lastUpdatedAt": "2026-03-31T10:00:05Z"
}
```

Via CLI:

```bash
dapr workflow history order-processing-ORD-001 --app-id myapp
```

## Suspending and Resuming a Workflow

Suspend a running workflow (it stops processing new events but retains state):

```python
client.pause_workflow("order-processing-ORD-001")
```

```bash
dapr workflow suspend order-processing-ORD-001 --app-id myapp
```

Resume a suspended workflow:

```python
client.resume_workflow("order-processing-ORD-001")
```

```bash
dapr workflow resume order-processing-ORD-001 --app-id myapp
```

## Terminating a Workflow

Stop a workflow immediately (transitions to `TERMINATED` status):

```python
client.terminate_workflow("order-processing-ORD-001")
```

```bash
dapr workflow terminate order-processing-ORD-001 --app-id myapp
```

Terminated workflows retain their history. Use purge to remove the history.

## Purging Workflow History

Delete the workflow instance and its history from the state store:

```python
client.purge_workflow("order-processing-ORD-001")
```

```bash
dapr workflow purge order-processing-ORD-001 --app-id myapp
```

Purging completed or terminated workflows frees state store space in long-running deployments.

## Raising External Events

Send an event to a waiting workflow:

```python
client.raise_workflow_event(
    instance_id="order-processing-ORD-001",
    event_name="payment-confirmed",
    data={"payment_id": "pay-abc123", "amount": 99.99}
)
```

```bash
curl -X POST http://localhost:3500/v1.0/workflows/dapr/order-processing-ORD-001/raiseEvent/payment-confirmed \
  -H "Content-Type: application/json" \
  -d '{"payment_id": "pay-abc123"}'
```

## Waiting for Workflow Completion

Block until a workflow finishes (useful in tests and scripts):

```python
from dapr.ext.workflow import WorkflowStatus

state = client.wait_for_workflow_completion(
    instance_id="order-processing-ORD-001",
    timeout_in_seconds=120
)

if state.runtime_status == WorkflowStatus.COMPLETED:
    print(f"Finished: {state.serialized_output}")
elif state.runtime_status == WorkflowStatus.FAILED:
    print(f"Failed: {state.failure_details}")
```

## Summary

Dapr provides comprehensive workflow instance management through the SDK, HTTP API, and CLI. The key operations are start (with optional custom IDs for idempotency), query (for monitoring), pause/resume (for controlled suspension), terminate (for immediate stop), purge (for cleanup), and raise event (for external interaction). Use custom instance IDs to make workflow starts idempotent across retries.
