# Capture Databricks Run IDs and Parameters Reliably

Author: [nawazdhandala](https://www.github.com/nawazdhandala)

Tags: Databricks, Jobs API, Job Monitoring, Data Engineering, REST API

Description: Capture Databricks job and task run identifiers through supported parameters, APIs, and system tables without private notebook context calls.

---

Many Databricks notebooks obtain a run ID by traversing internal objects under `dbutils.notebook.entry_point` and the notebook context. That code is tightly coupled to an implementation detail. It can behave differently across runtimes, access modes, and compute products, and it does not help non-notebook tasks.

Lakeflow Jobs provides supported interfaces for this data: dynamic value references at task configuration time, the Jobs API for the caller, and Lakeflow system tables for historical analysis. Use each interface at the boundary where it is authoritative.

## Know which ID you need

Databricks exposes several identifiers with different scopes:

| Value | Dynamic reference | Meaning |
| --- | --- | --- |
| Job ID | `{{job.id}}` | The saved job definition |
| Job run ID | `{{job.run_id}}` | One execution of the whole job |
| Task run ID | `{{task.run_id}}` | One execution of the current task |
| Task name | `{{task.name}}` | The task key in the current job |
| Repair count | `{{job.repair_count}}` | Number of repairs for the current job run |
| Task execution count | `{{task.execution_count}}` | Number of executions including retries and repairs |

Do not label a task run ID as a job run ID. The distinction matters when a multi-task job is retried, repaired, joined to billing records, or correlated with query history.

## Inject context through task parameters

Dynamic values are resolved in supported job configuration fields. They do not evaluate when copied directly into notebook source. Add them to the task's parameters:

```json
{
  "task_key": "transform_orders",
  "notebook_task": {
    "notebook_path": "/Workspace/Shared/transform_orders",
    "base_parameters": {
      "job_id": "{{job.id}}",
      "job_run_id": "{{job.run_id}}",
      "task_run_id": "{{task.run_id}}",
      "task_name": "{{task.name}}",
      "repair_count": "{{job.repair_count}}",
      "execution_count": "{{task.execution_count}}",
      "run_start_utc": "{{job.start_time.iso_datetime}}",
      "environment": "{{job.parameters.environment}}"
    }
  }
}
```

The notebook reads the resolved strings using its documented parameter interface:

```python
context = {
    "job_id": dbutils.widgets.get("job_id"),
    "job_run_id": dbutils.widgets.get("job_run_id"),
    "task_run_id": dbutils.widgets.get("task_run_id"),
    "task_name": dbutils.widgets.get("task_name"),
    "repair_count": dbutils.widgets.get("repair_count"),
    "execution_count": dbutils.widgets.get("execution_count"),
    "run_start_utc": dbutils.widgets.get("run_start_utc"),
    "environment": dbutils.widgets.get("environment"),
}
```

Validate the identifiers before using them as audit keys. Dynamic values are string substitutions, and malformed references can remain literal strings.

```python
def require_numeric(value: str, name: str) -> str:
    if not value.isdigit():
        raise ValueError(f"{name} did not resolve to a numeric ID: {value!r}")
    return value


job_run_id = require_numeric(context["job_run_id"], "job_run_id")
task_run_id = require_numeric(context["task_run_id"], "task_run_id")
```

For Python script, JAR, Spark Submit, and positional Python wheel tasks, insert the references into the task's JSON argument array and parse them as command-line arguments. These task types do not receive job parameters automatically.

## Persist an application audit record

Platform history and application lineage answer different questions. The platform records that task 123 ran. Your application should record that task 123 processed a particular business date and wrote a particular output.

An append-only Delta audit table can carry the supported IDs alongside safe parameters:

```python
from datetime import datetime, timezone

audit_row = [{
    "recorded_at": datetime.now(timezone.utc),
    "job_id": context["job_id"],
    "job_run_id": job_run_id,
    "task_run_id": task_run_id,
    "task_name": context["task_name"],
    "repair_count": int(context["repair_count"]),
    "execution_count": int(context["execution_count"]),
    "environment": context["environment"],
    "run_start_utc": context["run_start_utc"],
}]

(spark.createDataFrame(audit_row)
    .write
    .mode("append")
    .saveAsTable("main.operations.job_task_audit"))
```

Do not persist secrets or unrestricted free-form parameters. Job parameters are visible in operational surfaces and are not a secret transport.

Make audit writes idempotent if a repair can execute the same task again. A useful uniqueness key is the task run ID for an execution record, while `(job_run_id, task_name, execution_count)` is useful when the business model needs explicit retry and repair attempts.

## Capture the ID at the API boundary

An external orchestrator does not need notebook code to discover the run it launched. The Jobs API `run-now` response contains the job run ID. Save that response with the orchestrator's correlation ID.

```bash
curl --request POST \
  --header "Authorization: Bearer $DATABRICKS_TOKEN" \
  --header "Content-Type: application/json" \
  --data '{
    "job_id": 123456789,
    "job_parameters": {
      "environment": "prod",
      "run_date": "2026-08-06"
    },
    "idempotency_token": "orders-2026-08-06"
  }' \
  "https://example.cloud.databricks.com/api/2.2/jobs/run-now"
```

Use OAuth for automation where possible, protect any token supplied to the client, and generate an idempotency token that is unique to the intended launch. The API uses the token to avoid launching the same request twice.

Retrieve the run later with the captured ID:

```bash
curl --request GET \
  --header "Authorization: Bearer $DATABRICKS_TOKEN" \
  "https://example.cloud.databricks.com/api/2.2/jobs/runs/get?run_id=987654321"
```

For large multi-task runs, honor pagination fields in the API response rather than assuming every task is in the first page.

## Use system tables for durable history

The Jobs UI keeps run history for a limited period. Unity Catalog system tables provide account-level operational history with a documented retention period and are better for reporting. They are not a synchronous callback mechanism, so allow for ingestion lag.

`system.lakeflow.job_run_timeline` contains the parent job run ID and the `job_parameters` map. Long runs are sliced into multiple rows, so aggregate the timeline rather than counting rows as runs.

```sql
SELECT
  workspace_id,
  job_id,
  run_id AS job_run_id,
  MAX_BY(job_parameters, period_end_time) AS job_parameters,
  MIN(period_start_time) AS first_seen_at,
  MAX(period_end_time) AS last_seen_at,
  MAX_BY(result_state, period_end_time) AS result_state
FROM system.lakeflow.job_run_timeline
WHERE workspace_id = :workspace_id
  AND run_id = :job_run_id
GROUP BY workspace_id, job_id, run_id;
```

`system.lakeflow.job_task_run_timeline` separates the task run ID from its parent job run ID and includes task parameters:

```sql
SELECT
  workspace_id,
  job_id,
  job_run_id,
  run_id AS task_run_id,
  MAX_BY(task_parameters, period_end_time) AS task_parameters,
  MIN(period_start_time) AS first_seen_at,
  MAX(period_end_time) AS last_seen_at
FROM system.lakeflow.job_task_run_timeline
WHERE workspace_id = :workspace_id
  AND job_run_id = :job_run_id
GROUP BY workspace_id, job_id, job_run_id, run_id;
```

The `job_parameters` and `task_parameters` maps cover the current parameter fields. Deprecated API fields such as `notebook_params` are not included, which is another reason to standardize on current job parameters.

## Choose the interface by use case

| Need | Best interface |
| --- | --- |
| The task needs its own IDs now | Dynamic values passed as task parameters |
| The caller needs the ID it launched | Jobs API response |
| An operator needs to inspect one run | Run details page or Jobs API |
| A dashboard needs historical runs | `system.lakeflow` system tables |
| A data product needs business lineage | Application audit table containing supported run IDs |

This separation removes the temptation to scrape a workspace URL, parse a notebook path, or call an undocumented context accessor.

## Common mistakes

- Using `task.run_id` where downstream data expects the parent `job.run_id`
- Putting `{{job.run_id}}` directly in notebook source instead of a supported job field
- Treating a dynamic value as an expression rather than a string substitution
- Logging credentials passed incorrectly as parameters
- Counting timeline rows instead of distinct runs
- Assuming system tables update instantly
- Losing the `run-now` response in an external scheduler
- Overwriting an earlier attempt during a repair instead of recording the execution count

## Official Documentation

- [Dynamic value references](https://docs.databricks.com/aws/en/jobs/dynamic-value-references)
- [Access parameter values from a task](https://docs.databricks.com/aws/en/jobs/parameter-use)
- [Jobs API: trigger a new job run](https://docs.databricks.com/api/workspace/jobs/runNow)
- [Jobs API: get a single job run](https://docs.databricks.com/api/workspace/jobs/getRun)
- [Jobs system table reference](https://docs.databricks.com/aws/en/admin/system-tables/jobs)
- [Monitor Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/monitor)

## Conclusion

The stable way to capture Databricks run context is to pass supported dynamic values into each task, retain the Jobs API response at the calling boundary, and use system tables for historical reporting. This approach works across task types and avoids private notebook context APIs that can change independently of your application.
