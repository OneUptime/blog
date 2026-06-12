# Validation Summary: How to Implement Batch Scheduling Patterns

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Apache Airflow
- Dagster
- Python
- Cron scheduling
- Batch processing and ETL pipelines
- Sensors, DAG dependencies, backfills, and deadline monitoring

## Sources Consulted
- Apache Airflow 3.2.2 release notes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Apache Airflow Task SDK documentation: https://airflow.apache.org/docs/task-sdk/stable/index.html
- Apache Airflow Deadline Alerts documentation: https://airflow.apache.org/docs/apache-airflow/stable/howto/deadline-alerts.html
- Apache Airflow SLA-to-Deadline migration guide: https://airflow.apache.org/docs/apache-airflow/stable/howto/sla-to-deadlines.html
- Apache Airflow FileSensor API documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/sensors/filesystem/index.html
- Apache Airflow PythonOperator API documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/operators/python/index.html
- Apache Airflow Backfill documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/backfill.html
- Dagster assets API documentation: https://docs.dagster.io/api/dagster/assets
- Dagster schedules and sensors API documentation: https://docs.dagster.io/api/dagster/schedules-sensors
- Dagster declarative automation documentation: https://docs.dagster.io/guides/automate/declarative-automation

## Issues Found
- Airflow DAG examples used the removed `schedule_interval` argument. Updated examples to use the Airflow 3 `schedule` parameter, which is the current unified scheduling field.
- Airflow examples used legacy import paths such as `airflow.operators.*`, `airflow.sensors.*`, and `from airflow import DAG`. Updated them to current Airflow 3 SDK and provider import paths.
- The monitoring section used Airflow SLA APIs, which are no longer the current Airflow 3 approach. Replaced the SLA example with Deadline Alerts using `DeadlineAlert`, `DeadlineReference`, and `SyncCallback`.
- The backfill-aware example used `dag_run.external_trigger`, which is not appropriate for current Airflow 3 code. Updated the check to use `dag_run.run_type`.
- The backfill-aware example subtracted an aware logical date from a naive `datetime.utcnow()` value. Updated it to create `now` with the logical date timezone.
- The Dagster asset example used deprecated `AutoMaterializePolicy.eager()`. Updated it to `AutomationCondition.eager()`.
- The Dagster schedule example used `default_status="running"` instead of the documented enum. Updated it to `DefaultScheduleStatus.RUNNING`.
- The Dagster file sensor reused the wrong `mtime` value when constructing per-file run keys. Updated it to compute `file_mtime` for each file.

## Review Notes
The examples remain illustrative and omit production dependencies such as real connections, configured Airflow pools, SMTP settings, and Dagster IO managers. Python code snippets were syntax-checked after the corrections.
