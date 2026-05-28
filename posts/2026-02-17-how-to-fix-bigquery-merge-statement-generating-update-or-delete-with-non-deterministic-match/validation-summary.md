# Validation Summary: How to Fix BigQuery MERGE Statement Generating UPDATE or DELETE with

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Google BigQuery
- GoogleSQL
- BigQuery DML MERGE statements
- Window functions and ROW_NUMBER
- QUALIFY clause
- SQL aggregation and deduplication

## Sources Consulted
- Google Cloud BigQuery DML syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/dml-syntax
- Google Cloud BigQuery query syntax and QUALIFY clause: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax#qualify_clause
- Google Cloud BigQuery numbering functions and ROW_NUMBER: https://cloud.google.com/bigquery/docs/reference/standard-sql/numbering_functions#row_number
- Google Cloud BigQuery operators and IS DISTINCT FROM: https://cloud.google.com/bigquery/docs/reference/standard-sql/operators#is_distinct_from_operator

## Issues Found
- The production MERGE pattern used `!=` plus expressions such as `T.name IS NULL != S.name IS NULL` for change detection. BigQuery comparisons involving NULL can evaluate to NULL rather than TRUE, and chained comparison-style expressions are not the right null-safe pattern. Changed the condition to use BigQuery's `IS DISTINCT FROM` operator for `name`, `email`, and `phone`, which is null-safe and returns a BOOL.

## Review Notes
- The main MERGE error explanation is accurate: BigQuery returns `UPDATE/MERGE must match at most one source row for each target row` when an update/delete MERGE path would match multiple source rows to a target row.
- The ROW_NUMBER and QUALIFY examples are consistent with GoogleSQL syntax. For production deduplication, add deterministic tie-breakers to `ORDER BY` if `updated_at` can be identical across duplicate rows.
- The `_PARTITIONTIME` strategy only applies to ingestion-time partitioned tables.
