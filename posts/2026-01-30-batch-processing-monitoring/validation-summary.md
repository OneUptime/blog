# Validation Summary: How to Create Batch Monitoring

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Python
- OpenTelemetry Python API and SDK
- OpenTelemetry OTLP exporters
- Apache Airflow
- Prometheus and PromQL alerting rules
- Grafana-style dashboard queries
- OneUptime telemetry ingestion

## Sources Consulted
- OpenTelemetry Python metrics API: https://opentelemetry-python.readthedocs.io/en/latest/api/metrics.html
- OpenTelemetry Python metrics SDK: https://opentelemetry-python.readthedocs.io/en/latest/sdk/metrics.html
- OpenTelemetry Python OTLP exporters: https://opentelemetry-python.readthedocs.io/en/latest/exporter/otlp/otlp.html
- OpenTelemetry OTLP exporter configuration: https://opentelemetry.io/docs/languages/sdk-configuration/otlp-exporter/
- Apache Airflow DAG API documentation: https://airflow.apache.org/docs/apache-airflow/2.9.1/_api/airflow/models/dag/index.html
- Apache Airflow 3 callbacks documentation: https://airflow.apache.org/docs/apache-airflow/stable/administration-and-deployment/logging-monitoring/callbacks.html
- Apache Airflow 3 operators documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/operators.html
- Apache Airflow 3 XCom documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/xcoms.html
- Apache Airflow 3 release notes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Prometheus query functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- OneUptime OpenTelemetry documentation: https://oneuptime.com/docs/telemetry/open-telemetry

## Issues Found
- The Airflow example used deprecated legacy imports and the deprecated `schedule_interval` DAG argument. Updated it to use `airflow.sdk.DAG`, `airflow.providers.standard.operators.python.PythonOperator`, and the current `schedule` argument.
- The Airflow example used `provide_context=True` on `PythonOperator`. Removed it because current Airflow passes context to compatible callables without that legacy argument.
- The Airflow logging example referenced `execution_date`, which is no longer the current Airflow 3 context terminology. Updated it to log `logical_date`.
- The SLA dataclass typed `must_complete_by` as `str` while assigning `None` for hourly jobs. Updated it to `Optional[str]` and removed unused imports.
- The alert rule for jobs that had not run recently referenced `batch_job_last_success_timestamp`, but the post never defined that metric. Added a gauge that records the last successful run timestamp.
- The heartbeat-missing alert used `absent_over_time` in a way that could not alert per job. Added `batch_job_heartbeat_timestamp` and changed the alert to compare the latest heartbeat timestamp per `job_name`.
- The zero-throughput alert combined vectors with mismatched labels. Aggregated `batch_jobs_running` by `job_name` before combining it with throughput.
- The heartbeat callback type used `Optional[callable]`. Updated it to `Optional[Callable[[], int]]`.
- The OneUptime exporter example omitted `os`, omitted the required OneUptime ingestion token header, and used an endpoint that did not match OneUptime documentation. Updated it to use the documented `https://oneuptime.com/otlp` base endpoint with explicit OTLP/HTTP trace and metric endpoints plus the `x-oneuptime-token` header.

## Review Notes
The snippets still include placeholder application functions such as `process_batch_data()`, `transform_and_load()`, and `bulk_insert()`, which is appropriate for an implementation guide. A production version should also show full OpenTelemetry provider initialization before metric instruments are created if the snippets are intended to be copied as one standalone file.
