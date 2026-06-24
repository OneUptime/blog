# How to Use Dapr Workflow for Data Processing Pipelines

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Dapr, Workflow, Data Processing, ETL, Pipeline

Description: Build reliable data processing pipelines using Dapr workflows with fan-out parallelism, error handling, checkpointing, and exactly-once activity execution.

---

Data processing pipelines - ETL jobs, batch transformations, data enrichment pipelines - are excellent fits for Dapr workflows. The durable execution model provides at-least-once execution guarantees for activities, and fan-out patterns enable parallel data processing. Designing activities to be idempotent ensures safe retries on failure.

## Pipeline Design

A typical data processing pipeline:
1. Discover source data (list files, query a table, read a queue)
2. Fan-out: process each item in parallel
3. Transform and enrich each item
4. Write results to destination
5. Emit summary report

## Activities

```python
from dapr.ext.workflow import WorkflowActivityContext

def discover_records(ctx: WorkflowActivityContext, config: dict) -> list:
    # Read record IDs or file names to process
    source_table = config["source_table"]
    since = config.get("since", "1970-01-01")
    records = query_records(source_table, since=since)
    print(f"Discovered {len(records)} records to process")
    return records

def process_record(ctx: WorkflowActivityContext, record: dict) -> dict:
    # Transform and enrich a single record
    enriched = enrich_with_external_data(record)
    validated = validate_schema(enriched)
    return {"record_id": record["id"], "result": validated, "status": "processed"}

def write_results(ctx: WorkflowActivityContext, results: list) -> dict:
    # Bulk write to destination
    written = bulk_insert(results)
    return {"records_written": written}

def generate_report(ctx: WorkflowActivityContext, summary: dict) -> dict:
    report = build_report(summary)
    send_slack_message(f"Pipeline complete: {report['processed']} records processed")
    return report
```

## The Data Processing Workflow

```python
from dapr.ext.workflow import DaprWorkflowContext

def data_pipeline_workflow(ctx: DaprWorkflowContext, config: dict):
    # Step 1: Discover what to process
    records = yield ctx.call_activity(discover_records, input=config)

    if not records:
        return {"status": "no_data", "records_found": 0}

    # Step 2: Fan-out - process all records in parallel
    process_tasks = [
        ctx.call_activity(process_record, input=record)
        for record in records
    ]
    results = yield ctx.when_all(process_tasks)

    # Step 3: Filter successful results
    successful = [r for r in results if r.get("status") == "processed"]
    failed = [r for r in results if r.get("status") != "processed"]

    # Step 4: Write successful results
    write_summary = yield ctx.call_activity(write_results, input=successful)

    # Step 5: Generate report
    summary = {
        "total_discovered": len(records),
        "processed": len(successful),
        "failed": len(failed),
        "written": write_summary["records_written"],
        "failed_ids": [r.get("record_id") for r in failed]
    }
    report = yield ctx.call_activity(generate_report, input=summary)

    return {**summary, "report": report}
```

## Chunked Processing for Large Datasets

For very large datasets, process in chunks to control memory and parallelism:

```python
def large_dataset_workflow(ctx: DaprWorkflowContext, config: dict):
    records = yield ctx.call_activity(discover_records, input=config)

    chunk_size = config.get("chunk_size", 50)
    all_results = []

    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        print(f"Processing chunk {i // chunk_size + 1}: records {i}-{i + len(chunk)}")

        tasks = [ctx.call_activity(process_record, input=r) for r in chunk]
        chunk_results = yield ctx.when_all(tasks)
        all_results.extend(chunk_results)

    yield ctx.call_activity(write_results, input=all_results)
    return {"total_processed": len(all_results)}
```

## Checkpointing Long Pipelines

Use intermediate write steps to checkpoint progress:

```python
def checkpointed_pipeline(ctx: DaprWorkflowContext, config: dict):
    records = yield ctx.call_activity(discover_records, input=config)

    chunk_size = 100
    for i in range(0, len(records), chunk_size):
        chunk = records[i:i + chunk_size]
        tasks = [ctx.call_activity(process_record, input=r) for r in chunk]
        results = yield ctx.when_all(tasks)

        # Checkpoint: write each chunk as it completes
        yield ctx.call_activity(write_results, input=results)
        print(f"Checkpoint: {i + len(chunk)}/{len(records)} records committed")

    return {"status": "completed", "total": len(records)}
```

## Starting the Pipeline

```python
from dapr.ext.workflow import WorkflowRuntime, DaprWorkflowClient

runtime = WorkflowRuntime()
for wf in [data_pipeline_workflow, large_dataset_workflow]:
    runtime.register_workflow(wf)
for act in [discover_records, process_record, write_results, generate_report]:
    runtime.register_activity(act)

runtime.start()

client = DaprWorkflowClient()
instance_id = client.schedule_new_workflow(
    workflow=data_pipeline_workflow,
    input={"source_table": "raw_events", "since": "2026-03-30"},
    instance_id="pipeline-2026-03-31"
)
state = client.wait_for_workflow_completion(instance_id, timeout_in_seconds=3600)
print(f"Pipeline result: {state.serialized_output}")

runtime.shutdown()
```

## Summary

Dapr workflows provide a durable, fault-tolerant foundation for data processing pipelines. The fan-out/fan-in pattern processes records in parallel with at-least-once execution per activity, so designing activities to be idempotent is recommended. Chunking controls memory and parallelism for large datasets. Intermediate write checkpoints ensure partial progress is committed even if the workflow is interrupted, eliminating costly full restarts from scratch.
