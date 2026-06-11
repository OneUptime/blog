# Validation Summary: How to Build Timestamp-Based CDC

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Timestamp-based CDC
- PostgreSQL
- MySQL
- Python
- psycopg2
- Google BigQuery
- Apache Airflow
- Prometheus alerting rules
- StatsD metrics

## Sources Consulted
- PostgreSQL CREATE TRIGGER documentation: https://www.postgresql.org/docs/current/sql-createtrigger.html
- PostgreSQL PL/pgSQL trigger functions documentation: https://www.postgresql.org/docs/current/plpgsql-trigger.html
- PostgreSQL INSERT / ON CONFLICT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- MySQL automatic TIMESTAMP initialization and updating documentation: https://dev.mysql.com/doc/en/timestamp-initialization.html
- Google BigQuery Python client Client.insert_rows_json documentation: https://docs.cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- Google BigQuery DML / MERGE documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Apache Airflow public interface documentation for Airflow 3.0+: https://airflow.apache.org/docs/apache-airflow/stable/public-airflow-interface.html
- Apache Airflow Variables documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/variables.html
- Apache Airflow PythonOperator provider documentation: https://airflow.apache.org/docs/apache-airflow-providers-standard/stable/_api/airflow/providers/standard/operators/python/index.html
- Apache Airflow release notes for unified scheduling field: https://airflow.apache.org/docs/apache-airflow/stable/release_notes.html

## Issues Found
- The high-level algorithm and sequence diagram used `updated_at > high_watermark`, while the implementation used `>=` to handle timestamp collisions. Updated the prose and diagram to use `>=` consistently.
- The PostgreSQL extractor interpolated table and column identifiers directly into SQL. Added identifier validation before using dynamic identifiers in queries.
- The BigQuery loader passed `datetime` values from psycopg2 rows directly to `insert_rows_json`, but that API expects JSON-compatible values and does not apply local type conversions. Added serialization for datetimes and nested structures before insertion.
- The `run_pipeline.py` example used `datetime.now(timezone.utc)` without importing `datetime` and `timezone`. Added the missing import.
- The soft-delete transformer snippet used `Dict`, `Any`, `datetime`, and `timezone` without imports. Added the missing imports.
- The tombstone table SQL used `customer_tombstones`, while the extractor defaulted to `customers_tombstones` for a `customers` table. Renamed the SQL table/index references to `customers_tombstones` and validated the dynamic tombstone table identifier.
- The tombstone extractor snippet used `datetime`, `timezone`, `psycopg2`, `RealDictCursor`, and `TimestampCDCExtractor` without imports. Added the missing imports and changed the optional type annotation to `Optional[str]`.
- The Airflow DAG used older imports and parameters: `from airflow import DAG`, `from airflow.models import Variable`, `schedule_interval`, and `provide_context=True`. Updated the example to use current Airflow 3 public interfaces (`airflow.sdk`), `schedule`, the standard provider `PythonOperator`, and removed `provide_context`.
- The parallel extractor used `timezone.utc` without importing `timezone`. Added the missing import.

## Review Notes
The examples are now technically consistent and syntactically valid. For production systems, the timestamp-only watermark can still reprocess boundary rows when `>=` is used; target-side upserts or a composite `(updated_at, primary_key)` checkpoint are recommended for stricter exactly-once behavior.
