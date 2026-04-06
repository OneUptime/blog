# How to Use Dapr Workflow for Scheduled Batch Jobs

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Batch Job, Scheduling, Automation, Background Job

Description: Learn how to implement scheduled batch job processing using Dapr Workflow, enabling durable and resumable multi-step data pipelines that run on a schedule.

---

## Why Use Dapr Workflow for Batch Jobs?

Batch jobs often involve multiple steps: fetching records, transforming data, writing results, and sending notifications. If any step crashes midway, you want to resume rather than start over. Dapr Workflow provides durable execution - each activity is checkpointed so the workflow resumes from the last completed step after a restart.

## Combining Dapr Jobs API with Workflow

Dapr Jobs API triggers workflows on a schedule. The job fires a callback, which starts the workflow.

### Job Schedule Component

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: batch-job
spec:
  type: jobs.dapr
  version: v1
  metadata:
  - name: schedule
    value: "@every 1h"
  - name: data
    value: '{"source": "orders_table"}'
```

## The Batch Workflow in Python

```python
import dapr.ext.workflow as wf

def batch_job_workflow(ctx: wf.DaprWorkflowContext, config: dict):
    # Step 1 - fetch records to process
    records = yield ctx.call_activity(fetch_records, input=config)

    # Step 2 - process each record in parallel
    tasks = [ctx.call_activity(process_record, input=r) for r in records]
    results = yield wf.when_all(tasks)

    # Step 3 - write results to output
    yield ctx.call_activity(write_results, input=results)

    # Step 4 - notify on completion
    yield ctx.call_activity(send_notification, input={
        "processed": len(results),
        "source": config["source"]
    })

    return {"status": "completed", "count": len(results)}
```

## Activity Definitions

```python
@wf.activity
def fetch_records(ctx, config: dict) -> list:
    import psycopg2
    conn = psycopg2.connect(os.environ["DB_URL"])
    cur = conn.cursor()
    cur.execute("SELECT id, data FROM orders WHERE processed = false LIMIT 1000")
    return [{"id": row[0], "data": row[1]} for row in cur.fetchall()]

@wf.activity
def process_record(ctx, record: dict) -> dict:
    # Apply transformation logic
    record["data"] = transform(record["data"])
    record["processed"] = True
    return record

@wf.activity
def write_results(ctx, results: list) -> bool:
    # Bulk insert results
    return True

@wf.activity
def send_notification(ctx, summary: dict):
    requests.post("http://notifications/batch-complete", json=summary)
```

## Triggering the Workflow from a Job Handler

```python
from flask import Flask, request
from dapr.clients import DaprClient

app = Flask(__name__)

@app.route("/job/batch-job", methods=["POST"])
def handle_batch_trigger():
    config = request.get_json()
    with DaprClient() as d:
        d.start_workflow(
            workflow_component="dapr",
            workflow_name="batch_job_workflow",
            input=config
        )
    return "", 200
```

## Monitoring Batch Runs

```bash
# List all workflow instances
curl "http://localhost:3500/v1.0/workflows/dapr/batch_job_workflow"

# Check a specific run
curl "http://localhost:3500/v1.0/workflows/dapr/batch_job_workflow/{instance_id}"
```

## Handling Large Batches with Chunking

For very large datasets, chunk the records and run sub-workflows per chunk:

```python
def batch_job_workflow(ctx: wf.DaprWorkflowContext, config: dict):
    chunk_ids = yield ctx.call_activity(get_chunk_ids, input=config)
    sub_tasks = [ctx.call_child_workflow(process_chunk_workflow, input=chunk_id)
                 for chunk_id in chunk_ids]
    yield wf.when_all(sub_tasks)
```

## Summary

Dapr Workflow is an excellent fit for scheduled batch jobs because it provides durable, resumable execution out of the box. Combining the Dapr Jobs API for scheduling with Workflow for multi-step processing gives you fault-tolerant batch pipelines with minimal infrastructure overhead.
