# How to Use Dapr Workflow for Fan-Out/Fan-In Patterns

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Fan-Out, Fan-In, Parallel Processing

Description: Implement fan-out/fan-in patterns in Dapr workflows to process multiple tasks in parallel and aggregate results, reducing total execution time for batch operations.

---

Fan-out/fan-in is a workflow pattern where a single task spawns multiple parallel activities (fan-out) and then waits for all of them to complete before aggregating results (fan-in). This pattern dramatically reduces execution time for independent parallel workloads.

## When to Use Fan-Out/Fan-In

- Processing multiple items in a batch simultaneously
- Calling multiple independent external APIs in parallel
- Running data transformations across different partitions
- Sending notifications to multiple recipients concurrently

## Basic Fan-Out/Fan-In Implementation

```python
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext, when_all

def process_item(ctx: WorkflowActivityContext, item: dict) -> dict:
    # Simulate processing - replace with real logic
    import time
    time.sleep(0.1)  # Simulate work
    return {"item_id": item["id"], "result": item["value"] * 2, "status": "processed"}

def aggregate_results(ctx: WorkflowActivityContext, results: list) -> dict:
    total = sum(r["result"] for r in results)
    successful = [r for r in results if r["status"] == "processed"]
    return {
        "total_items": len(results),
        "successful": len(successful),
        "sum": total
    }

def batch_processing_workflow(ctx: DaprWorkflowContext, batch: dict):
    items = batch["items"]

    # Fan-out: schedule all items in parallel
    parallel_tasks = [
        ctx.call_activity(process_item, input=item)
        for item in items
    ]

    # Fan-in: wait for all tasks to complete
    results = yield when_all(parallel_tasks)

    # Aggregate the results
    summary = yield ctx.call_activity(aggregate_results, input=results)
    return summary
```

## Running the Fan-Out/Fan-In Workflow

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowClient

runtime = WorkflowRuntime()
runtime.register_workflow(batch_processing_workflow)
runtime.register_activity(process_item)
runtime.register_activity(aggregate_results)

runtime.start()
try:
    client = DaprWorkflowClient()

    batch = {
        "items": [
            {"id": f"item-{i}", "value": i}
            for i in range(1, 11)
        ]
    }

    instance_id = client.schedule_new_workflow(
        workflow=batch_processing_workflow,
        input=batch
    )

    state = client.wait_for_workflow_completion(instance_id, timeout_in_seconds=30)
    print(f"Batch result: {state.serialized_output}")
finally:
    runtime.shutdown()
```

## Fan-Out with Partial Failure Handling

Use `when_any` to proceed when at least one task succeeds, or handle individual failures:

```python
def resilient_fan_out(ctx: DaprWorkflowContext, sources: list):
    tasks = [
        ctx.call_activity(fetch_from_source, input=src)
        for src in sources
    ]

    # Wait for all, collecting results and errors separately
    results = yield when_all(tasks)

    # Filter out failed results
    successes = [r for r in results if r.get("status") != "error"]
    return {"fetched": len(successes), "failed": len(results) - len(successes)}
```

## Dynamic Fan-Out

Fan-out based on a dynamically determined list of tasks:

```python
def dynamic_notification_workflow(ctx: DaprWorkflowContext, event: dict):
    # First activity determines who to notify
    recipients = yield ctx.call_activity(get_recipients, input=event)

    # Dynamically fan out to all recipients
    notification_tasks = [
        ctx.call_activity(send_notification, input={"recipient": r, "event": event})
        for r in recipients
    ]

    results = yield when_all(notification_tasks)
    delivered = sum(1 for r in results if r.get("delivered"))
    return {"sent_to": len(recipients), "delivered": delivered}
```

## Controlling Parallelism

To limit concurrent activities, process items in chunks:

```python
def chunked_fan_out(ctx: DaprWorkflowContext, items: list, chunk_size: int = 5):
    all_results = []
    for i in range(0, len(items), chunk_size):
        chunk = items[i:i + chunk_size]
        tasks = [ctx.call_activity(process_item, input=item) for item in chunk]
        chunk_results = yield when_all(tasks)
        all_results.extend(chunk_results)
    return all_results
```

## Summary

Dapr workflow fan-out/fan-in uses `when_all()` to execute multiple activities in parallel and collect all results before proceeding. This pattern is ideal for batch processing, multi-source data fetching, and parallel notification delivery. For very large batches, chunked fan-out provides parallelism control to avoid overwhelming downstream systems.
