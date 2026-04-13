# How to Configure Workflow Execution Concurrency in Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Concurrency, Performance, Configuration

Description: Configure Dapr workflow execution concurrency to control how many workflows and activities run simultaneously, preventing resource exhaustion and optimizing throughput.

---

Dapr workflows run concurrently by default. Without limits, high-volume workflow submissions can overwhelm your application with simultaneous activity executions. Configuring concurrency settings ensures predictable resource consumption and stable performance.

## Concurrency in Dapr Workflows

Two concurrency settings control workflow execution:
1. **Max concurrent workflow invocations** - how many workflow orchestrators run simultaneously
2. **Max concurrent activity invocations** - how many activities execute in parallel across all workflows

## Configuring Concurrency in the Dapr Configuration

Set workflow concurrency limits in your Dapr app configuration:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Configuration
metadata:
  name: appconfig
spec:
  workflow:
    maxConcurrentWorkflowInvocations: 50
    maxConcurrentActivityInvocations: 100
```

Apply it to your app via the Dapr annotation:

```yaml
annotations:
  dapr.io/config: "appconfig"
```

## Configuring Concurrency in the Workflow Runtime

You can also configure concurrency programmatically when initializing the workflow runtime:

```python
from dapr.ext.workflow import WorkflowRuntime

runtime = WorkflowRuntime(
    host="localhost",
    port="50001",
    maximum_concurrent_orchestration_work_items=50,
    maximum_concurrent_activity_work_items=100
)

# Register workflows and activities
runtime.register_workflow(order_workflow)
runtime.register_activity(process_payment)

# Start the runtime with concurrency limits applied
runtime.start()
```

## Activity-Level Concurrency

Limit parallel executions of a specific activity using a semaphore:

```python
import asyncio
from dapr.ext.workflow import WorkflowActivityContext

# Allow max 5 concurrent calls to this activity
_semaphore = asyncio.Semaphore(5)

async def rate_limited_activity(ctx: WorkflowActivityContext, payload: dict) -> dict:
    async with _semaphore:
        result = await call_external_api(payload)
        return result
```

## Workflow Queue Depth Monitoring

Track how many workflows are queued and running to tune concurrency settings:

```python
from prometheus_client import Gauge
import threading

running_workflows = Gauge("dapr_workflow_running_total", "Currently running workflows")
queued_workflows = Gauge("dapr_workflow_queued_total", "Queued workflows waiting to start")

class InstrumentedWorkflow:
    _running = 0
    _lock = threading.Lock()

    @classmethod
    def increment(cls):
        with cls._lock:
            cls._running += 1
            running_workflows.set(cls._running)

    @classmethod
    def decrement(cls):
        with cls._lock:
            cls._running -= 1
            running_workflows.set(cls._running)
```

## Tuning Concurrency for Different Workloads

| Workload Type | Suggested Workflow Concurrency | Suggested Activity Concurrency |
|---|---|---|
| CPU-bound processing | 10-20 | 2x CPU cores |
| I/O-bound (DB, API) | 50-200 | 50-500 |
| Mixed workloads | 50 | 100 |
| Memory-intensive | 10-30 | 20-60 |

## Horizontal Scaling vs. Concurrency

Increasing concurrency on one pod increases throughput per pod, but adds memory and CPU pressure. Horizontal scaling (more pods) distributes load:

```yaml
# Scale out pods rather than just raising concurrency
apiVersion: apps/v1
kind: Deployment
spec:
  replicas: 5  # 5 pods x 50 workflows/pod = 250 concurrent workflows
  template:
    metadata:
      annotations:
        dapr.io/config: "appconfig"
```

## Handling Concurrency Limits with Backpressure

When workflow submissions exceed concurrency limits, Dapr queues them. Implement backpressure at the API layer:

```python
from flask import Flask, jsonify, request

app = Flask(__name__)

MAX_QUEUE_DEPTH = 1000

@app.route("/submit-workflow", methods=["POST"])
def submit_workflow():
    queue_depth = get_current_queue_depth()
    if queue_depth >= MAX_QUEUE_DEPTH:
        return jsonify({"error": "Service busy - retry later"}), 503

    instance_id = workflow_client.schedule_new_workflow(
        workflow=my_workflow,
        input=request.json
    )
    return jsonify({"workflow_id": instance_id}), 202
```

## Summary

Dapr workflow concurrency is controlled by `maxConcurrentWorkflowInvocations` and `maxConcurrentActivityInvocations` in the Dapr Configuration resource. Set these based on your workload characteristics - CPU-bound tasks need lower limits while I/O-bound tasks can handle higher concurrency. Combine per-pod concurrency configuration with horizontal scaling to achieve target throughput without resource exhaustion.
