# Validation Summary: How to Set Up Incremental Data Loading Patterns for BigQuery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery scheduled queries
- BigQuery partitioned tables
- BigQuery DML and scripting
- BigQuery CLI

## Sources Consulted
- BigQuery scheduled queries documentation: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery partitioned table creation documentation: https://docs.cloud.google.com/bigquery/docs/creating-partitioned-tables
- BigQuery partitioned tables overview: https://docs.cloud.google.com/bigquery/docs/partitioned-tables
- BigQuery DML syntax documentation: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- BigQuery DML with partitioned tables documentation: https://docs.cloud.google.com/bigquery/docs/using-dml-with-partitioned-tables
- BigQuery system variables reference: https://docs.cloud.google.com/bigquery/docs/reference/system-variables

## Issues Found
- The first pattern was labeled "Ingestion Time Partitioning" even though the table partitions by `event_timestamp`. Changed the heading to "Event-Time Partitioning" to match the SQL.
- The scheduled-query CLI example used an empty `--destination_table`, which is not the documented setup for a DML scheduled query. Replaced it with `--project_id` and `--target_dataset`.
- The deduplication MERGE example did not deduplicate multiple staging rows for the same `order_id`, which can cause BigQuery MERGE errors or duplicate inserts. Added a `ROW_NUMBER()` filter to keep the newest row per order.
- The watermark update used separate `CURRENT_TIMESTAMP()` calls. Added a single `load_timestamp` variable so the source cutoff and stored watermark are consistent.
- The partition-level replace MERGE updated and inserted rows but did not delete rows that disappeared from the recomputed partition. Changed it to a constant-false MERGE pattern that inserts the recomputed rows and deletes existing rows for the target partition.
- The text said the simpler partition replacement used partition decorators, but the example uses DELETE and INSERT. Updated the wording to match the code.

## Review Notes
The examples are illustrative and still assume compatible table schemas, existing datasets, appropriate IAM permissions, and the correct BigQuery processing location for the user's environment.
