# Validation Summary: How to Implement Airflow Sensors

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Apache Airflow
- Airflow sensors and `BaseSensorOperator`
- Airflow standard provider sensors and operators
- Airflow HTTP, Amazon S3, PostgreSQL, and common SQL providers
- Python
- Jinja templating in Airflow DAGs

## Sources Consulted
- Apache Airflow Sensors documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/sensors.html
- Apache Airflow DAG scheduling and Airflow 3 release notes: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html
- Apache Airflow public interface for Airflow 3.0+: https://airflow.apache.org/docs/apache-airflow/stable/public-airflow-interface.html
- Apache Airflow FileSensor standard provider docs: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/sensors/file.html
- Apache Airflow FileSensor API docs: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/sensors/filesystem/index.html
- Apache Airflow ExternalTaskSensor docs: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/sensors/external_task_sensor.html
- Apache Airflow ExternalTaskSensor API docs: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/sensors/external_task/index.html
- Apache Airflow HTTP provider HttpSensor API docs: https://airflow.apache.org/docs/apache-airflow-providers-http/stable/_api/airflow/providers/http/sensors/http/index.html
- Apache Airflow HTTP provider HttpOperator API docs: https://airflow.apache.org/docs/apache-airflow-providers-http/stable/_api/airflow/providers/http/operators/http/index.html
- Apache Airflow Amazon provider S3KeySensor API docs: https://airflow.apache.org/docs/apache-airflow-providers-amazon/stable/_api/airflow/providers/amazon/aws/sensors/s3/index.html
- Apache Airflow PostgreSQL provider PostgresHook API docs: https://airflow.apache.org/docs/apache-airflow-providers-postgres/stable/_api/airflow/providers/postgres/hooks/postgres/index.html
- Apache Airflow common SQL SqlSensor API docs: https://airflow.apache.org/docs/apache-airflow-providers-common-sql/stable/_api/airflow/providers/common/sql/sensors/sql/index.html
- Apache Airflow templates reference: https://airflow.apache.org/docs/apache-airflow/stable/templates-ref.html

## Issues Found
- Updated DAG examples from deprecated/removed `schedule_interval` to `schedule`, because Airflow 3 removes the legacy `schedule_interval` DAG argument.
- Updated Airflow 3 import paths to use the public `airflow.sdk.DAG` interface and standard provider paths for `FileSensor`, `ExternalTaskSensor`, and `PythonOperator`.
- Replaced removed HTTP provider `SimpleHttpOperator` with `HttpOperator`.
- Updated the PostgreSQL hook import from the legacy `airflow.hooks.postgres_hook` path to `airflow.providers.postgres.hooks.postgres.PostgresHook`.
- Removed `apply_defaults` from custom sensor constructors because it is not needed for current Airflow custom operators/sensors.
- Corrected Python callable examples that used literal Jinja strings inside Python functions. They now read `context['ds']` so the printed file/S3 paths match the runtime date.
- Changed the S3 "all partitions" example from wildcard matching to an explicit list of known keys, because wildcard matching only proves that at least one key matches the pattern.
- Corrected the `FileSensor` explanation to note that directory paths succeed only when the directory contains files, matching the current provider docs.
- Corrected the `SqlSensor` summary from "query returning rows" to first-cell truthiness, matching the common SQL provider behavior.
- Added SQL identifier validation to the custom `RecordCountSensor` so the parameterized date query is not presented as fully injection-safe while table and column names are interpolated.

## Review Notes
- Verified that all seven Python code blocks are syntactically valid with `compile()`.
- The examples are now aligned with current Airflow 3.x documentation. Airflow 2.x users may need older import paths depending on installed provider versions.
