# How to Monitor Batch Job Progress with Dapr

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Monitoring, Batch Processing, Workflow, Observability

Description: Learn how to track and expose batch job progress using Dapr Workflow state, pub/sub events, and Prometheus metrics.

---

Monitoring batch job progress requires visibility into how many items have been processed, what percentage is complete, and whether the job is on track to finish on time. Dapr Workflow provides built-in state querying while pub/sub and Prometheus expose progress metrics for dashboards and alerts.

## Progress Tracking Patterns

There are three main approaches:

1. **Workflow state query**: Poll the Dapr Workflow API for current execution status.
2. **State store counter**: Increment atomic counters per processed item.
3. **Pub/Sub progress events**: Emit events at milestones for real-time updates.

## Pattern 1: Workflow State Progress

Track progress directly inside the workflow:

```python
from dapr.ext.workflow import DaprWorkflowContext
from dataclasses import dataclass, asdict

@dataclass
class BatchProgress:
    total: int
    processed: int
    failed: int
    percentComplete: float

def batch_workflow(ctx: DaprWorkflowContext, config: dict):
    records = yield ctx.call_activity(load_records, input=config)
    total = len(records)

    results = []
    for i, record in enumerate(records):
        result = yield ctx.call_activity(process_record, input=record)
        results.append(result)

        # Emit progress event every 10%
        if (i + 1) % max(1, total // 10) == 0:
            progress = BatchProgress(
                total=total,
                processed=i + 1,
                failed=sum(1 for r in results if not r['success']),
                percentComplete=round((i + 1) / total * 100, 1)
            )
            yield ctx.call_activity(publish_progress, input=asdict(progress))

    return results
```

## Pattern 2: State Store Counters

For long-running jobs where the workflow may span many service restarts:

```python
import json
import threading
from datetime import datetime, timezone
from dapr.clients import DaprClient

class BatchProgressTracker:
    def __init__(self, job_id: str):
        self.job_id = job_id
        self._lock = threading.Lock()

    def initialize(self, total: int):
        with DaprClient() as client:
            client.save_state('statestore', f'job:{self.job_id}:progress',
                json.dumps({"total": total, "processed": 0, "failed": 0,
                            "startedAt": datetime.now(timezone.utc).isoformat(),
                            "status": "running"}))

    def increment(self, success: bool):
        with self._lock:
            with DaprClient() as client:
                current = json.loads(
                    client.get_state('statestore', f'job:{self.job_id}:progress').data
                )
                current['processed'] += 1
                if not success:
                    current['failed'] += 1

                client.save_state('statestore', f'job:{self.job_id}:progress',
                    json.dumps(current))

    def get_progress(self) -> dict:
        with DaprClient() as client:
            data = client.get_state('statestore', f'job:{self.job_id}:progress').data
            return json.loads(data or '{}')
```

## Pattern 3: Pub/Sub Progress Events

Emit progress events for real-time dashboard updates:

```python
import json
from dapr.clients import DaprClient
from dapr.ext.workflow import WorkflowActivityContext

def publish_progress(ctx: WorkflowActivityContext, progress: dict):
    with DaprClient() as client:
        client.publish_event('pubsub', 'batch-progress-events', json.dumps({
            "jobId": progress.get("jobId"),
            "percentComplete": progress['percentComplete'],
            "processed": progress['processed'],
            "total": progress['total'],
            "estimatedCompletionTime": estimate_completion(progress)
        }))
```

## Progress API Endpoint

Expose a REST endpoint for job progress:

```python
@app.route('/jobs/<job_id>/progress', methods=['GET'])
def get_job_progress(job_id: str):
    # Try Dapr Workflow state first
    try:
        wf_client = DaprWorkflowClient()
        state = wf_client.get_workflow_state(job_id)
        if state is not None:
            return jsonify({
                "workflowStatus": state.runtime_status.name,
                "lastUpdated": str(state.last_updated_at)
            })
    except Exception:
        pass

    # Fall back to state store counter
    with DaprClient() as client:
        data = client.get_state('statestore', f'job:{job_id}:progress').data

    if not data:
        return jsonify({"error": "Job not found"}), 404

    return jsonify(json.loads(data))
```

## Prometheus Metrics for Batch Jobs

Expose batch job metrics:

```python
from prometheus_client import Gauge, Counter, generate_latest

batch_processed = Counter('batch_records_processed_total', 'Records processed', ['job_id'])
batch_failed = Counter('batch_records_failed_total', 'Records failed', ['job_id'])
batch_percent = Gauge('batch_percent_complete', 'Percent complete', ['job_id'])
batch_last_progress = Gauge('batch_job_last_progress_time', 'Last progress timestamp', ['job_id'])

@app.route('/metrics')
def metrics():
    return generate_latest(), 200, {'Content-Type': 'text/plain; charset=utf-8'}
```

## Alert on Stalled Jobs

```yaml
groups:
- name: batch-job-alerts
  rules:
  - alert: BatchJobStalled
    expr: |
      time() - batch_job_last_progress_time > 300
    for: 5m
    annotations:
      summary: "Batch job has not made progress in 5 minutes"
```

## Summary

Monitoring Dapr batch job progress combines workflow state queries for coarse-grained status, state store counters for fine-grained item tracking, and pub/sub events for real-time dashboard updates. Expose a unified progress REST endpoint that tries workflow state first and falls back to state store data. Add Prometheus metrics for Grafana dashboards and configure alerts to detect stalled jobs that stop making progress.
