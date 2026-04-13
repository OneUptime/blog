# How to Use Dapr Workflow for ETL Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, ETL, Data Pipeline, Transformation, Integration

Description: Learn how to build fault-tolerant ETL pipelines using Dapr Workflow, enabling durable extract, transform, and load operations with automatic retry and checkpointing.

---

## ETL Pipelines Need Durability

Extract, Transform, Load (ETL) pipelines process large volumes of data in stages. A crash midway through a transform step means wasted work unless you checkpoint progress. Dapr Workflow provides exactly this: each ETL stage is a durable activity, and the workflow resumes from the last completed stage after a failure.

## ETL Workflow in Python

```python
import dapr.ext.workflow as wf
from datetime import timedelta

wfr = wf.WorkflowRuntime()

@wfr.workflow(name='etl_pipeline_workflow')
def etl_pipeline_workflow(ctx: wf.DaprWorkflowContext, config: dict):
    ctx.set_custom_status("Extracting data")

    # Extract: pull data from source
    raw_data = yield ctx.call_activity(extract_data, input=config)

    ctx.set_custom_status(f"Transforming {len(raw_data)} records")

    # Transform: process records in parallel chunks
    chunk_size = 500
    chunks = [raw_data[i:i+chunk_size] for i in range(0, len(raw_data), chunk_size)]
    transform_tasks = [ctx.call_activity(transform_chunk, input=chunk) for chunk in chunks]
    transformed_chunks = yield wf.when_all(transform_tasks)

    # Flatten results
    transformed = [record for chunk in transformed_chunks for record in chunk]

    ctx.set_custom_status(f"Loading {len(transformed)} records")

    # Load: write to destination with retry policy
    retry_policy = wf.RetryPolicy(
        max_number_of_attempts=3,
        first_retry_interval=timedelta(seconds=30)
    )
    yield ctx.call_activity(load_data, input={
        "records": transformed,
        "destination": config["destination"]
    }, retry_policy=retry_policy)

    # Notify completion
    yield ctx.call_activity(send_etl_report, input={
        "source": config["source"],
        "destination": config["destination"],
        "recordsProcessed": len(transformed)
    })

    return {"status": "success", "count": len(transformed)}
```

## Extract Activity

```python
@wfr.activity(name='extract_data')
def extract_data(ctx, config: dict) -> list:
    import psycopg2

    conn = psycopg2.connect(config["sourceConnString"])
    cursor = conn.cursor()
    cursor.execute(config["extractQuery"])
    columns = [desc[0] for desc in cursor.description]
    rows = cursor.fetchall()
    conn.close()

    return [dict(zip(columns, row)) for row in rows]
```

## Transform Activity

```python
@wfr.activity(name='transform_chunk')
def transform_chunk(ctx, chunk: list) -> list:
    transformed = []
    for record in chunk:
        transformed.append({
            "id": record["user_id"],
            "fullName": f"{record['first_name']} {record['last_name']}",
            "email": record["email"].lower().strip(),
            "createdAt": record["created_at"].isoformat() if record.get("created_at") else None,
            "isActive": record["status"] == "active"
        })
    return transformed
```

## Load Activity

```python
@wfr.activity(name='load_data')
def load_data(ctx, payload: dict) -> bool:
    import clickhouse_driver

    client = clickhouse_driver.Client(payload["destination"])
    records = payload["records"]

    client.execute(
        "INSERT INTO users (id, fullName, email, createdAt, isActive) VALUES",
        records
    )
    return True
```

## Triggering the ETL Pipeline

```python
from dapr.clients import DaprClient

with DaprClient() as d:
    instance = d.start_workflow(
        workflow_component="dapr",
        workflow_name="etl_pipeline_workflow",
        input={
            "source": "postgresql://source-db:5432/app",
            "destination": "clickhouse://analytics-db:9000/warehouse",
            "extractQuery": "SELECT * FROM users WHERE updated_at > NOW() - INTERVAL '1 day'",
            "sourceConnString": "host=source-db dbname=app user=reader"
        }
    )
    print(f"ETL started: {instance.instance_id}")
```

## Scheduling ETL Runs

Use the Dapr Cron binding to trigger the ETL workflow on a schedule:

```yaml
apiVersion: dapr.io/v1alpha1
kind: Component
metadata:
  name: daily-etl
spec:
  type: bindings.cron
  version: v1
  metadata:
  - name: schedule
    value: "0 2 * * *"
  - name: direction
    value: "input"
```

## Handling ETL Failures

If the load step fails, Dapr Workflow can retry it without re-running the expensive extract and transform steps, since those activities already completed and their results are persisted in the workflow state.

```python
# Inside the workflow, pass retry_policy to call_activity:
retry_policy = wf.RetryPolicy(
    max_number_of_attempts=3,
    first_retry_interval=timedelta(seconds=30)
)
yield ctx.call_activity(load_data, input={
    "records": transformed,
    "destination": config["destination"]
}, retry_policy=retry_policy)
```

## Summary

Dapr Workflow enables reliable ETL pipelines by checkpointing each stage as a durable activity. Extract, transform, and load steps run independently with automatic retry, parallel chunk processing maximizes throughput, and the workflow status API gives real-time visibility into pipeline progress.
