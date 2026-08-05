# Validation Summary: Make Databricks CI Reject SUCCESS_WITH_FAILURES

## Status
validated

## Post Type
Technical guide

## Technologies Covered

- Databricks Lakeflow Jobs
- Databricks Jobs API 2.2 and its deprecated Jobs API 2.1 response fields
- Databricks CLI
- Databricks Declarative Automation Bundles
- Bash and jq
- Python notebooks and Databricks widgets
- CI/CD release gates, job notifications, and repair runs

## Sources Consulted

- [Monitor Lakeflow Jobs](https://docs.databricks.com/aws/en/jobs/monitor)
- [Add notifications on a job](https://docs.databricks.com/aws/en/jobs/notifications)
- [Databricks CLI `jobs` command group](https://docs.databricks.com/aws/en/dev-tools/cli/reference/jobs-commands)
- [Jobs API: get a single job run](https://docs.databricks.com/api/workspace/jobs/getrun)
- [Databricks SDK for Python Jobs data classes](https://databricks-sdk-py.readthedocs.io/en/latest/dbdataclasses/jobs.html)
- [Configure task dependencies](https://docs.databricks.com/aws/en/jobs/run-if)
- [Dynamic value references](https://docs.databricks.com/aws/en/jobs/dynamic-value-references)
- [Add tasks to jobs in Declarative Automation Bundles](https://docs.databricks.com/aws/en/dev-tools/bundles/job-task-types)
- [Access parameter values from a task](https://docs.databricks.com/aws/en/jobs/parameter-use)
- [Databricks Utilities reference](https://docs.databricks.com/aws/en/dev-tools/databricks-utils)
- [Generated Databricks CLI Jobs command source](https://github.com/databricks/cli/blob/main/cmd/workspace/jobs/jobs.go)
- [Databricks SDK for Go Jobs waiter implementation](https://github.com/databricks/databricks-sdk-go/blob/v0.165.0/service/jobs/api.go)

## Issues Found

- The polling loop recognized `TERMINATED` and `SKIPPED` but omitted the deprecated lifecycle's terminal `INTERNAL_ERROR` state. A legacy response ending in `INTERNAL_ERROR` could therefore be polled indefinitely instead of failing closed. Added `INTERNAL_ERROR` to the terminal lifecycle case; the subsequent exact-success check rejects its result or the `UNKNOWN` fallback.
- The Jobs API documentation link pointed to the legacy Jobs API 2.1 reference while the post primarily describes the current `status.termination_details` response. Updated the link to the current Jobs API `get-run` reference.

## Review Notes

- Official documentation confirms that job-run status is determined by leaf tasks and that `Succeeded with failures` is treated as success for job notifications, including `jobs.on_success` webhooks.
- The documented CLI flags, positional arguments, 20-minute default waiter timeout, task-array pagination behavior, `--include-history`, and idempotency-token support are current. The generated CLI and SDK waiter code confirms that reaching a terminal lifecycle state alone does not enforce an exact `SUCCESS` result.
- The bundle fields, `ALL_DONE` behavior, notebook `base_parameters`, `dbutils.widgets.get`, and lowercase `{{tasks.<task_name>.result_state}}` values are current and valid.
- The Databricks CLI was not installed locally, so commands were syntax-checked where possible and verified against the current official command reference and generated CLI source rather than executed against a workspace.
