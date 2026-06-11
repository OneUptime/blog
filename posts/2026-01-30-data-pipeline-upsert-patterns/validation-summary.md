# Validation Summary: How to Implement Upsert Patterns

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- SQL MERGE
- PostgreSQL
- SQL Server / Azure SQL
- Delta Lake
- Apache Spark / PySpark
- Databricks
- Data pipeline upsert patterns

## Sources Consulted
- PostgreSQL INSERT documentation: https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL comparison functions and operators: https://www.postgresql.org/docs/current/functions-comparison.html
- SQL Server MERGE documentation: https://learn.microsoft.com/en-us/sql/t-sql/statements/merge-transact-sql
- Delta Lake Python API documentation: https://docs.delta.io/api/latest/python/spark/
- Delta Lake table deletes, updates, and merges documentation: https://docs.delta.io/delta-update/
- Delta Lake optimizations documentation: https://docs.delta.io/optimizations-oss/
- Azure Databricks Delta MERGE documentation: https://learn.microsoft.com/en-us/azure/databricks/delta/merge
- Apache Spark PySpark `monotonically_increasing_id` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.monotonically_increasing_id.html
- Apache Spark PySpark `sha2` documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.functions.sha2.html
- Apache Spark SQL built-in functions documentation for `to_json`: https://spark.apache.org/docs/latest/api/sql/index.html

## Issues Found
- PostgreSQL example used `!=` for conditional updates involving nullable columns. Changed comparisons to `IS DISTINCT FROM` so updates are null-safe.
- PostgreSQL example described the email unique index as being used for conflict detection even though the `ON CONFLICT` target is `customer_id`. Updated the comment to say the index enforces email uniqueness.
- SQL Server MERGE example used nullable email comparisons that would not detect changes from or to `NULL`. Added explicit `NULL` checks around email comparison.
- Hash-key example used delimiter-based `concat_ws`, which can produce ambiguous hashes when values contain delimiters or nulls. Replaced it with `to_json(struct(...))` before `sha2` to preserve column boundaries.
- Hash-key merge example built a Delta merge but did not execute it. Added `whenMatchedUpdateAll()`, `whenNotMatchedInsertAll()`, and `execute()`.
- Batch upsert example used `monotonically_increasing_id()` directly for range batching, but Spark only guarantees uniqueness and monotonicity, not consecutive IDs. Changed the code to generate a consecutive `row_number()` before batching and fixed the batch count calculation.
- Batch upsert example depended on imports from earlier snippets. Added local imports for `col` and `DeltaTable`.
- Error handling example claimed `dropDuplicates(["customer_id"])` kept the latest duplicate record, but Spark does not guarantee that. Replaced it with a window ordered by `updated_at` descending.
- Error handling example used `col` and `row_number` without importing them in the snippet. Added the required PySpark imports.

## Review Notes
- The SQL Server MERGE example includes `WHEN NOT MATCHED BY SOURCE THEN DELETE`, which is valid but dangerous for incremental loads unless the source represents the complete desired target state.
- The Delta Lake optimization snippet uses Delta table properties and APIs that depend on Delta Lake / Databricks runtime support. The APIs and properties checked are current, but behavior can vary by runtime and managed-table configuration.
