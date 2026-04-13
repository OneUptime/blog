# How to Configure Workflow History Retention Policy in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, History, Retention, Operation

Description: Configure Dapr workflow history retention policies to automatically clean up completed workflow instances and manage state store growth in production environments.

---

Dapr workflows store event history in the state store for every instance. Without a retention policy, this history grows unbounded. Configuring workflow history retention ensures your state store stays healthy and operational costs remain predictable.

## Why Retention Matters

Each workflow instance stores:
- The full event log of activities and their results
- Input and output data
- Timer deadlines and external event payloads

For high-volume deployments processing thousands of workflows per day, unmanaged history can consume gigabytes of state store storage within weeks.

## Configuring Retention via Dapr Configuration

Set a workflow history retention period in the Dapr app configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
  namespace: production
spec:
  workflow:
    maxConcurrentWorkflowInvocations: 100
    maxConcurrentActivityInvocations: 100
```

Note: As of Dapr 1.14, automatic retention-based purge is planned but may require manual purge scripts in some versions. Check your Dapr version's documentation for auto-purge support.

## Manual Retention Script

Implement a scheduled cleanup job that purges old completed workflows:

```python
#!/usr/bin/env python3
# cleanup_workflows.py
import sys
import time
from datetime import datetime, timezone, timedelta
from dapr.ext.workflow import DaprWorkflowClient, WorkflowStatus

client = DaprWorkflowClient()

RETENTION_DAYS = int(sys.argv[1]) if len(sys.argv) > 1 else 7
TERMINAL_STATES = {WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.TERMINATED}

def purge_old_workflows(instance_ids: list, retention_days: int) -> dict:
    cutoff = datetime.now(timezone.utc) - timedelta(days=retention_days)
    stats = {"checked": 0, "purged": 0, "skipped": 0, "errors": 0}

    for instance_id in instance_ids:
        stats["checked"] += 1
        try:
            state = client.get_workflow_state(instance_id)
            if not state:
                stats["skipped"] += 1
                continue

            if state.runtime_status not in TERMINAL_STATES:
                stats["skipped"] += 1
                continue

            if state.last_updated_at and state.last_updated_at > cutoff:
                stats["skipped"] += 1
                continue

            client.purge_workflow(instance_id)
            stats["purged"] += 1
            print(f"Purged: {instance_id} (status: {state.runtime_status})")
            time.sleep(0.01)  # Rate limit

        except Exception as e:
            stats["errors"] += 1
            print(f"Error purging {instance_id}: {e}")

    return stats

if __name__ == "__main__":
    # Load instance IDs from your tracking system
    instance_ids = load_tracked_workflow_ids()
    result = purge_old_workflows(instance_ids, RETENTION_DAYS)
    print(f"Retention cleanup: {result}")
```

## Tracking Workflow Instance IDs

While the Dapr CLI provides `dapr workflow list` for querying instances, the HTTP API and Python SDK do not yet expose a programmatic list method. For automated cleanup scripts, maintain a tracking store:

```python
import redis

r = redis.Redis(host="localhost", port=6379)

def register_workflow(instance_id: str, workflow_type: str):
    r.sadd(f"workflow:all", instance_id)
    r.sadd(f"workflow:type:{workflow_type}", instance_id)
    r.set(f"workflow:started:{instance_id}", datetime.now(timezone.utc).isoformat())

def get_all_instance_ids() -> list:
    return [id.decode() for id in r.smembers("workflow:all")]
```

## Kubernetes CronJob for Retention

Schedule the cleanup script as a Kubernetes CronJob:

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: workflow-cleanup
spec:
  schedule: "0 2 * * *"  # Daily at 2 AM
  jobTemplate:
    spec:
      template:
        metadata:
          annotations:
            dapr.io/enabled: "true"
            dapr.io/app-id: "workflow-cleanup"
        spec:
          restartPolicy: OnFailure
          containers:
          - name: cleanup
            image: myapp:latest
            command: ["python", "cleanup_workflows.py", "7"]
```

## Monitoring State Store Size

Track state store growth to validate your retention policy is working:

```bash
# Redis memory usage
redis-cli INFO memory | grep used_memory_human

# Count workflow keys (replace <appid> with your Dapr app ID)
redis-cli KEYS "<appid>||dapr.internal.*" | wc -l

# Monitor key growth over time
watch -n 60 "redis-cli KEYS '<appid>||dapr.internal.*' | wc -l"
```

## Summary

Dapr workflow history retention requires proactive management through scheduled purge jobs until native retention policies are broadly available. Maintain a tracking store of workflow instance IDs, run daily cleanup scripts that purge terminal workflows older than your retention threshold, and monitor state store size to confirm the policy is effective. Deploy cleanup as a Kubernetes CronJob for automated, reliable execution.
