# Validation Summary: How to Use Idempotent Data Pipelines in GCP to Handle Retry-Safe Processing

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Platform
- BigQuery
- Dataflow
- Apache Beam Python SDK
- Cloud Run functions / Cloud Functions
- Cloud Firestore
- Cloud Storage
- Cloud Composer / Apache Airflow
- Python
- GoogleSQL

## Sources Consulted
- BigQuery GoogleSQL DML and MERGE documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery multi-statement transactions documentation: https://cloud.google.com/bigquery/docs/transactions
- BigQuery Python client documentation: https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.client.Client
- BigQuery parameterized queries documentation: https://cloud.google.com/bigquery/docs/parameterized-queries
- Apache Beam BigQuery I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html
- Apache Beam Deduplicate transform documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.transforms.deduplicate.html
- Apache Beam Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Cloud Run functions retry and idempotency best practices: https://cloud.google.com/run/docs/tips/function-retries
- Firestore Python client documentation: https://cloud.google.com/python/docs/reference/firestore/latest
- Apache Airflow DAG documentation: https://airflow.apache.org/docs/apache-airflow/stable/core-concepts/dags.html

## Issues Found
- The date-based BigQuery examples used `CURRENT_DATE()`, which makes reruns on a later date process a different input window. Changed the examples to use explicit query parameters such as `@run_date` and `@target_date`.
- The MERGE example claimed MERGE is inherently idempotent without noting BigQuery's one-source-row-per-target-row requirement for UPDATE/MERGE operations. Added source deduplication with `ROW_NUMBER()` and narrowed the claim accordingly.
- The Cloud Function example streamed rows to BigQuery without deterministic row IDs. Added `row_ids` derived from the CloudEvent ID so retries use stable insert IDs.
- The Dataflow `WRITE_TRUNCATE` example read from Pub/Sub, which is a streaming source. Beam does not support `WRITE_TRUNCATE` for streaming inserts. Changed the example to a bounded batch input and described it as a batch Dataflow pipeline.
- The Beam `Deduplicate` example used unsupported `key` and `duration` arguments. Replaced it with `DeduplicatePerKey(processing_time_duration=Duration(seconds=600))` after keying events by `event_id`.
- The Cloud Storage file processing example appended directly to the target table before recording metadata, so a retry after a partial failure could duplicate rows. Changed it to load into a replaceable staging table, then `MERGE` staged rows and processed-file metadata inside a BigQuery transaction.
- The file processing example interpolated `file_path` directly into SQL. Replaced it with BigQuery query parameters.
- The Airflow DAG imported `datetime` but did not use it and used the older `schedule_interval` style. Updated the DAG to set an explicit `start_date`, `schedule`, and `catchup=False`.

## Review Notes
The Cloud Function example now uses stable BigQuery insert IDs, but BigQuery streaming insert deduplication is best-effort. For stronger end-to-end idempotency, a production implementation should use a target table key with `MERGE`, the BigQuery Storage Write API with appropriate stream semantics, or another transactional sink design.
