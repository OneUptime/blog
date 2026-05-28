# Validation Summary: How to Deduplicate Streaming Data in BigQuery Using MERGE and Window Functions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery DML and MERGE
- BigQuery scheduled queries and bq CLI
- Pub/Sub
- Dataflow
- Streaming inserts and streaming buffer behavior

## Sources Consulted
- BigQuery GoogleSQL DML and MERGE reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery DML limitations: https://cloud.google.com/bigquery/docs/data-manipulation-language
- BigQuery scheduled queries: https://cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery query syntax and QUALIFY clause: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- BigQuery window functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/window-functions
- BigQuery legacy streaming API and streaming buffer behavior: https://cloud.google.com/bigquery/docs/streaming-data-into-bigquery
- Dataflow streaming modes: https://cloud.google.com/dataflow/docs/guides/streaming-modes
- Pub/Sub to Dataflow streaming behavior: https://cloud.google.com/dataflow/docs/concepts/streaming-with-cloud-pubsub

## Issues Found
- The post described Dataflow as an at-least-once system in the same way as Pub/Sub. Updated the wording because Dataflow streaming jobs use exactly-once mode by default, while at-least-once mode is optional and source-level duplicate business events can still occur.
- The `MERGE ... INSERT ROW` examples used source subqueries that still contained the helper `rn` column from `ROW_NUMBER()`. Updated those sources to use `SELECT * EXCEPT(rn)` so `INSERT ROW` does not try to insert a non-target helper column.
- The scheduled-query `bq query` example used an empty `--destination_table` for a DML statement. Replaced it with `--target_dataset` and `--location`, which matches the scheduled-query guidance for DDL/DML queries.
- The streaming-buffer section said MERGE operations against the streaming buffer fail. Clarified that the DML restriction applies to recently streamed rows in the table being modified when using the legacy `tabledata.insertAll` method, and noted that the staging-table pattern reads the raw table while modifying the clean table.
- The streaming-buffer SQL filtered on `_PARTITIONTIME` without checking for NULL. Added `_PARTITIONTIME IS NOT NULL` and clarified that this applies to ingestion-time partitioned raw tables.
- The post claimed QUALIFY produces the same execution plan as the CTE approach. Changed this to the same logical result, since execution plans are optimizer-dependent.
- The performance guidance said to always include a target partition filter. Revised it to recommend target partition filters only when they are consistent with the deduplication key and late-arrival policy.

## Review Notes
The examples are illustrative and use placeholder project, dataset, and table names. The `_PARTITIONTIME` examples require ingestion-time partitioned tables; for column-partitioned tables, an explicit ingestion timestamp column would be needed instead.
