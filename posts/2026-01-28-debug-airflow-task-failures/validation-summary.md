# Validation Summary: How to Debug Airflow Task Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow (CLI, operators, sensors, hooks, executors)
- Python
- PostgreSQL (PostgresHook)
- Kubernetes (KubernetesExecutor, kubectl)
- Pandas
- SQL (Airflow metadata DB queries)
- S3 (remote logging)

## Sources Consulted
- Apache Airflow CLI reference: https://airflow.apache.org/docs/apache-airflow/stable/cli-and-env-variables-ref.html
- Airflow CLI source (`cli_config.py`) on `main` and `v2-10-stable` branches: https://github.com/apache/airflow
- Airflow stable REST API documentation
- Airflow `BaseSensorOperator` source (for the "Snap. Time is OUT." timeout message)
- Airflow providers/operators module layouts (`airflow.operators.python`, `airflow.hooks.base`, `airflow.providers.postgres.hooks.postgres`, `airflow.sensors.filesystem`)

## Issues Found
1. **Invalid CLI command `airflow tasks logs`** (and `-f` / `--try-number` variants). No such subcommand exists in any Airflow version — `tasks` only has `clear`, `failed-deps`, `list`, `render`, `run`, `state`, `states-for-dag-run`, and `test`. Replaced the section with the supported alternatives: reading the log file directly from `$AIRFLOW_HOME/logs/...` (including the modern `dag_id=.../run_id=.../task_id=.../attempt=N.log` layout) and pulling logs via the stable REST API endpoint `/api/v1/dags/{dag_id}/dagRuns/{dag_run_id}/taskInstances/{task_id}/logs/{try_number}`.
2. **Invalid CLI command `airflow dags clear`**. The `dags` subcommand group has no `clear`. Replaced with `airflow tasks clear my_dag -s ... -e ...` (omitting `-t` to match every task in the DAG), which is the documented way to clear an entire DAG run from the CLI.
3. **Invalid flag `--dry-run` on `airflow tasks clear`**. This flag has never existed on `tasks clear`; the command instead prints the affected task instances and prompts for confirmation by default, and `--yes` skips that prompt. Replaced the example with `--yes` and a comment noting that the default interactive preview already serves as a dry run.

## Review Notes
- The `-t/--task-regex` flag used in `airflow tasks clear -t my_task` is correct in current Airflow (it is a regex matched against task IDs), so the existing single-task example was left in place.
- `airflow tasks test --env-vars '{"PYTHONPATH": "/custom/path"}'` is valid — `--env-vars` is a real flag on `tasks test` and accepts a JSON dict.
- `airflow connections test` is still a valid CLI command and was not flagged.
- The sensor timeout string `"airflow.exceptions.AirflowSensorTimeout: Snap. Time is OUT."` matches the literal message raised by `BaseSensorOperator`.
- Version caveat (not fixed, since the post is intentionally version-agnostic): in Airflow 2.2+ the `task_instance` table no longer stores `execution_date` as a column — it stores `run_id` and you must join `dag_run` to filter by `execution_date`/`logical_date`. The SQL snippets and the `TaskInstance.execution_date == execution_date` ORM filter will work on older 2.x metadata DBs but will need a join (or a `logical_date` filter through `DagRun`) on recent versions. Readers running Airflow ≥ 2.4 should adapt the queries accordingly.
- Similarly, `execution_date` in `context` was renamed to `logical_date` in Airflow 2.2+; the older key still works via the backwards-compat shim but emits a deprecation warning.
- The `[logging] log_format` example uses a JSON-shaped string, but Airflow's `log_format` is a standard `logging` module format string — for true JSON logs, users typically configure a custom logging class via `logging_config_class`. This was kept as-is since the post frames it as illustrative ("Additional JSON logging for better parsing") rather than a copy-paste config.
