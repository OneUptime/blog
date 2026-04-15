# How to Implement Batch Data Processing with Dapr Workflow

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Batch Processing, Data Pipeline, Microservice

Description: Learn how to build reliable batch data processing pipelines using Dapr Workflow for orchestration with automatic retry and error handling.

---

Batch data processing jobs - loading files, transforming records, and writing to databases - often span multiple steps that must all succeed or be compensated on failure. Dapr Workflow orchestrates these multi-step pipelines with built-in durability, retry logic, and parallel execution.

## Batch Processing Workflow Design

```text
StartWorkflow -> FetchBatch -> ValidateRecords -> TransformData -> WriteResults -> NotifyComplete
                                    |
                                    V
                               (parallel fan-out)
                               TransformRecord[0..N]
```

## Define the Batch Processing Workflow

```python
import dapr.ext.workflow as wf
from dapr.ext.workflow import DaprWorkflowContext, WorkflowActivityContext

def batch_processing_workflow(ctx: DaprWorkflowContext, batch_config: dict):
    # Step 1: Fetch batch from source
    records = yield ctx.call_activity(fetch_batch, input=batch_config)

    # Step 2: Validate all records in parallel
    validation_tasks = [
        ctx.call_activity(validate_record, input=record)
        for record in records
    ]
    validation_results = yield wf.when_all(validation_tasks)

    valid_records = [
        r for r, v in zip(records, validation_results) if v['valid']
    ]
    invalid_count = len(records) - len(valid_records)

    if invalid_count > 0:
        yield ctx.call_activity(log_invalid_records, input={
            "batchId": batch_config['batchId'],
            "invalidCount": invalid_count
        })

    # Step 3: Transform valid records
    transform_tasks = [
        ctx.call_activity(transform_record, input=record)
        for record in valid_records
    ]
    transformed = yield wf.when_all(transform_tasks)

    # Step 4: Write results
    result = yield ctx.call_activity(write_results, input={
        "batchId": batch_config['batchId'],
        "records": transformed
    })

    # Step 5: Notify completion
    yield ctx.call_activity(notify_completion, input={
        "batchId": batch_config['batchId'],
        "processed": len(transformed),
        "failed": invalid_count
    })

    return result
```

## Define Activity Functions

```python
def fetch_batch(ctx: WorkflowActivityContext, config: dict) -> list:
    # Read from S3, database, or file system
    import boto3
    s3 = boto3.client('s3')
    response = s3.get_object(Bucket=config['bucket'], Key=config['key'])
    data = response['Body'].read().decode('utf-8')
    return parse_csv(data)

def validate_record(ctx: WorkflowActivityContext, record: dict) -> dict:
    errors = []
    if not record.get('id'):
        errors.append("Missing required field: id")
    if not record.get('email') or '@' not in record.get('email', ''):
        errors.append("Invalid email")

    return {"valid": len(errors) == 0, "errors": errors, "record": record}

def transform_record(ctx: WorkflowActivityContext, record: dict) -> dict:
    return {
        "id": record['id'].strip().upper(),
        "email": record['email'].lower(),
        "name": record['name'].title(),
        "processedAt": "2026-03-31T00:00:00Z"
    }

def write_results(ctx: WorkflowActivityContext, payload: dict) -> dict:
    # Write to database
    count = db.bulk_insert('processed_records', payload['records'])
    return {"written": count, "batchId": payload['batchId']}
```

## Start the Batch Workflow

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowClient

runtime = WorkflowRuntime()
runtime.register_workflow(batch_processing_workflow)
runtime.register_activity(fetch_batch)
runtime.register_activity(validate_record)
runtime.register_activity(transform_record)
runtime.register_activity(write_results)
runtime.register_activity(notify_completion)
runtime.register_activity(log_invalid_records)
runtime.start()

with DaprWorkflowClient() as client:
    instance_id = client.schedule_new_workflow(
        workflow=batch_processing_workflow,
        input={
            "batchId": "batch-20260331",
            "bucket": "data-lake",
            "key": "imports/customers-20260331.csv"
        }
    )
    print(f"Batch workflow started: {instance_id}")
```

## Monitor Workflow Progress

```python
with DaprWorkflowClient() as client:
    status = client.get_workflow_state(instance_id)
    print(f"Status: {status.runtime_status}")
    print(f"Last updated: {status.last_updated_at}")
```

## Summary

Dapr Workflow orchestrates batch data processing pipelines with built-in durability - if the workflow host restarts mid-execution, the workflow resumes from its last checkpoint. The parallel fan-out pattern using `when_all` allows concurrent record validation and transformation for large batches. Activity functions encapsulate individual steps, each with configurable retry policies, making batch pipelines resilient to transient failures.
