# Validation Summary: How to Implement Late-Arriving Fact Handling in BigQuery Streaming Pipelines

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google BigQuery
- BigQuery GoogleSQL
- BigQuery scheduled queries
- BigQuery partitioned and clustered tables
- Apache Beam
- Google Cloud Dataflow
- Python

## Sources Consulted
- BigQuery scheduled queries documentation: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery DML and MERGE syntax documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery partitioned tables documentation: https://cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery DDL and ALTER TABLE ADD COLUMN documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery aggregate functions documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/aggregate_functions
- Apache Beam Programming Guide, windowing/triggers/allowed lateness: https://beam.apache.org/documentation/programming-guide/
- Apache Beam Python trigger API documentation: https://beam.apache.org/releases/pydoc/2.61.0/apache_beam.transforms.trigger.html

## Issues Found
- The scheduled-query `bq query` example used `--destination_table=""`, which is not a valid destination table configuration. BigQuery scheduled queries created with `bq query` require `--destination_table` or `--target_dataset`; for DML queries, `--target_dataset` is the appropriate option. Changed the command to use `--target_dataset=analytics`.
- The deduplicated CTAS query selected both `order_id` and `ARRAY_AGG(o ...).*`, which would duplicate the `order_id` column in the query result. Removed the standalone `order_id` projection because the expanded struct already includes it.
- The MERGE condition referenced `target.event_timestamp`, but the target row in the example stores the comparison timestamp in `updated_at`. Changed the condition to compare `source.event_timestamp` with `target.updated_at`.
- The Python snippets used `datetime.utcnow()` without importing `datetime`, and `utcnow()` returns a naive datetime. Added `from datetime import datetime, timezone` and changed the examples to `datetime.now(timezone.utc).isoformat()`.
- The `WriteWithUpsert` docstring said it wrote to BigQuery using the streaming buffer, but the snippet only prepares rows for downstream upsert logic. Updated the wording to describe the actual behavior.

## Review Notes
The overall late-data strategies are technically sound. The article intentionally shows simplified snippets rather than a complete deployable Dataflow pipeline, so future improvements could include showing the `WriteToBigQuery` sink, the corresponding MERGE for windowed aggregates, and how the `previous_values` side input is supplied to the correction-event `DoFn`.
