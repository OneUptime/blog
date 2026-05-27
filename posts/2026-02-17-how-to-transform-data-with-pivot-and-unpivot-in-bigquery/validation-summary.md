# Validation Summary: How to Transform Data with PIVOT and UNPIVOT in BigQuery

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- GoogleSQL
- PIVOT and UNPIVOT operators
- SQL aggregation and date functions

## Sources Consulted
- Google Cloud BigQuery GoogleSQL query syntax: https://cloud.google.com/bigquery/docs/reference/standard-sql/query-syntax
- Google Cloud BigQuery GoogleSQL date functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/date_functions

## Issues Found
- The PIVOT multiple-aggregation section described generated output columns as `Q1_total_rev` and `Q1_num_transactions`. BigQuery names these columns with the aggregate alias before the pivot value, such as `total_rev_Q1` and `num_transactions_Q1`, so the examples were corrected.
- The monthly report example selected and grouped by `month_num` before applying PIVOT. Because BigQuery PIVOT keeps unaggregated columns from the input as grouping columns, this would produce separate rows per product category and month number instead of one row per product category. The unused `month_num` column was removed from the CTE and `GROUP BY`.
- The NULL-handling section said a workaround was required to include NULL values in UNPIVOT output. BigQuery supports `UNPIVOT INCLUDE NULLS`, so the example was updated to use that syntax directly.

## Review Notes
The remaining PIVOT and UNPIVOT syntax, row value aliases, multi-column UNPIVOT form, and use of `FORMAT_DATE`/`EXTRACT` are consistent with current GoogleSQL documentation.
