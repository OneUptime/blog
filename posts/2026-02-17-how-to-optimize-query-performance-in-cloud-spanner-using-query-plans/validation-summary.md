# Validation Summary: How to Optimize Query Performance in Cloud Spanner Using Query Plans

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Spanner
- Google Cloud CLI (`gcloud spanner databases execute-sql`)
- GoogleSQL for Spanner
- Spanner secondary indexes and `STORING` columns
- Spanner query plans and query profiling

## Sources Consulted
- Google Cloud CLI reference for `gcloud spanner databases execute-sql`: https://cloud.google.com/sdk/gcloud/reference/spanner/databases/execute-sql
- Spanner query execution plans documentation: https://cloud.google.com/spanner/docs/query-execution-plans
- Spanner SQL best practices documentation: https://cloud.google.com/spanner/docs/sql-best-practices
- Spanner secondary indexes documentation: https://cloud.google.com/spanner/docs/secondary-indexes
- Spanner query plan visualizer documentation: https://cloud.google.com/spanner/docs/tune-query-with-visualizer
- Spanner GoogleSQL lexical structure documentation: https://cloud.google.com/spanner/docs/reference/standard-sql/lexical
- Spanner `ExecuteSqlRequest.QueryMode` client reference: https://cloud.google.com/php/docs/reference/cloud-spanner/latest/V1.ExecuteSqlRequest.QueryMode

## Issues Found
- The Google Cloud Console instructions referred to the older Query tab flow and said to click "Explain" instead of "Run." Updated the text to use the current Spanner Studio flow: run the query, then open the Explanation tab.
- The PROFILE mode explanation omitted Google's production caveat. Added that PROFILE has overhead and is not recommended for production traffic.
- The `Distributed Union` description said almost every query starts with one. Softened this to "many distributed query plans" because Spanner plans vary by query shape and execution context.
- The full table scan example said every row is read from disk. Changed this to "every row in the table has to be scanned" to avoid an inaccurate physical storage/cache implication.

## Review Notes
The SQL examples use valid GoogleSQL syntax. Double-quoted string literals are valid in GoogleSQL for Spanner. The `CREATE INDEX ... STORING` example is appropriate because Spanner secondary indexes include base table primary key columns, index key columns, and stored columns. The `gcloud` command syntax and `--query-mode=PLAN` / `--query-mode=PROFILE` values match the official CLI reference. The local environment did not have `gcloud` installed, so CLI verification was performed against the official Google Cloud CLI reference rather than local `--help` output.
