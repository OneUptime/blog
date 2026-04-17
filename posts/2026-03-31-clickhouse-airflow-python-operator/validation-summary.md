# Validation Summary: How to Use ClickHouse with Airflow PythonOperator

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow (DAGs, PythonOperator, XCom, scheduling)
- ClickHouse (SQL aggregation, partitioning, DDL/DML)
- `clickhouse-connect` Python driver
- Python 3

## Sources Consulted
- Apache Airflow 3.0 release notes: https://airflow.apache.org/docs/apache-airflow/3.0.0/release_notes.html
- Airflow Standard Provider (PythonOperator): https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/operators/python.html
- Airflow templates reference: https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html
- Airflow XComs docs: https://airflow.apache.org/docs/apache-airflow/3.0.0/core-concepts/xcoms.html
- ClickHouse Python driver API: https://clickhouse.com/docs/integrations/language-clients/python/driver-api
- ClickHouse ALTER TABLE DROP PARTITION: https://clickhouse.com/docs/sql-reference/statements/alter/partition

## Issues Found
1. **`schedule_interval` removed in Airflow 3.0** — The DAG used `schedule_interval="0 2 * * *"`. In Airflow 3.0 (April 2025) `schedule_interval` was removed in favor of the unified `schedule` parameter. Replaced with `schedule="0 2 * * *"`.
2. **Stale PythonOperator import path** — `from airflow.operators.python import PythonOperator` is no longer valid in Airflow 3.0; the operator lives in the `apache-airflow-providers-standard` package. Updated import to `from airflow.providers.standard.operators.python import PythonOperator`.

## Review Notes
- `clickhouse-connect` API usage (`get_client`, `client.command`, `client.query`, `QueryResult.first_row`) is correct against current driver docs.
- `context["ds"]` remains valid for scheduled DAGs in Airflow 3.0+. Note: it is unavailable in asset-triggered DAGs (no logical date), but this is not relevant to the scheduled DAG in the post.
- The `cleanup_raw_data` task drops a single monthly partition computed from `execution_date - 90 days` and assumes the `events` table is partitioned by `toYYYYMM(event_time)`. This is a reasonable simplification for a tutorial but is schema-dependent; the comment "older than 90 days" is slightly loose because only the single partition exactly ~3 months ago is dropped on any given run.
- The code hardcodes credentials inside `get_ch_client()` rather than reading from the Airflow Connection shown in the Setup section. Not a technical error, but using `BaseHook.get_connection("clickhouse_default")` would match the intent of storing credentials in Airflow Connections.
- f-string SQL interpolation with `execution_date` is acceptable here because `ds` is a templated context value (not user input), but it is not a pattern readers should copy for untrusted inputs.
