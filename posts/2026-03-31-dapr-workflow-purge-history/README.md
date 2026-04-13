# How to Purge Dapr Workflow History

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, History, Purge, Operation

Description: Learn how to purge Dapr workflow history to free state store space, including single instance purges, bulk cleanup, and automated retention policies.

---

Every Dapr workflow instance stores its event history in the configured state store. Over time, completed and terminated workflows accumulate significant storage. Purging removes workflow history and frees state store space, which is critical for long-running production deployments.

## What Purge Does

Purging a workflow instance:
- Deletes all event history from the state store
- Removes the workflow status record
- Frees storage in Redis, CosmosDB, or your configured store
- Cannot be undone - the history is permanently deleted

Purge does NOT:
- Stop a running workflow (terminate first)
- Affect other workflow instances

## Who Can Be Purged

Only workflows in terminal states can be purged:
- `COMPLETED` - finished successfully
- `FAILED` - ended with an unhandled error
- `TERMINATED` - manually stopped

You cannot purge a `RUNNING` or `SUSPENDED` workflow.

## Purging a Single Instance

Via SDK:

```python
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()

# Verify the workflow is done before purging
state = client.get_workflow_state("order-ORD-001")
print(f"Status before purge: {state.runtime_status}")

client.purge_workflow("order-ORD-001")
print("Workflow history purged")

# State is now gone
state = client.get_workflow_state("order-ORD-001")
print(f"State after purge: {state}")  # None or not found
```

Via CLI:

```bash
dapr workflow purge order-ORD-001 --app-id order-service
```

Via HTTP API:

```bash
curl -X POST \
  http://localhost:3500/v1.0/workflows/dapr/order-ORD-001/purge
```

## Bulk Purge of Completed Workflows

Write a cleanup script to purge all completed workflows:

```python
import time
from dapr.ext.workflow import DaprWorkflowClient

client = DaprWorkflowClient()

TERMINAL_STATES = {"COMPLETED", "FAILED", "TERMINATED"}

def purge_batch(instance_ids: list, dry_run: bool = False) -> int:
    purged = 0
    for instance_id in instance_ids:
        state = client.get_workflow_state(instance_id)
        if state and state.runtime_status in TERMINAL_STATES:
            if dry_run:
                print(f"Would purge: {instance_id} ({state.runtime_status})")
            else:
                client.purge_workflow(instance_id)
                purged += 1
                print(f"Purged: {instance_id}")
            time.sleep(0.05)  # Avoid overwhelming the state store
    return purged
```

## Automated Retention Policy

Schedule daily cleanup of workflows older than a retention period:

```python
from datetime import datetime, timezone, timedelta

def purge_old_workflows(instance_ids: list, retention_days: int = 7):
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    purged = 0

    for instance_id in instance_ids:
        state = client.get_workflow_state(instance_id)
        if not state:
            continue
        if state.runtime_status not in TERMINAL_STATES:
            continue
        if state.last_updated_at and state.last_updated_at < cutoff:
            client.purge_workflow(instance_id)
            purged += 1

    print(f"Purged {purged} workflows older than {retention_days} days")
    return purged
```

## Terminate Then Purge

For complete cleanup of unwanted workflows:

```python
def terminate_and_purge(instance_id: str):
    state = client.get_workflow_state(instance_id)
    if not state:
        print(f"Workflow {instance_id} not found")
        return

    if state.runtime_status not in TERMINAL_STATES:
        print(f"Terminating {instance_id}...")
        client.terminate_workflow(instance_id)
        time.sleep(2)  # Brief pause for state propagation

    client.purge_workflow(instance_id)
    print(f"Cleaned up workflow: {instance_id}")
```

## Monitoring Storage Growth

Track workflow history size in Redis:

```bash
# Count active workflow state keys
redis-cli KEYS "dapr*workflow*" | wc -l

# Get total memory used by workflow state
redis-cli INFO memory | grep used_memory_human
```

Set up an alert if workflow key count grows beyond expected bounds.

## Summary

Regular purging of completed and terminated Dapr workflows is essential for managing state store growth in production. Purge only terminal-state workflows, implement automated retention policies based on completion age, and monitor storage metrics to schedule cleanup before space becomes critical. The purge operation is safe for terminal workflows and has no effect on running instances.
