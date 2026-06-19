# Validation Summary: How to Handle Medallion Architecture

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Medallion architecture
- Databricks lakehouse concepts
- Apache Spark / PySpark
- Delta Lake
- Structured Streaming
- Data quality checks
- Lakehouse ETL / ELT pipelines

## Sources Consulted
- Databricks documentation: What is the medallion lakehouse architecture? https://docs.databricks.com/aws/en/lakehouse/medallion
- Databricks documentation: Update table schema / schema evolution. https://docs.databricks.com/aws/en/tables/update-schema
- Databricks documentation: Selectively overwrite data with Delta Lake. https://docs.databricks.com/aws/en/delta/selective-overwrite
- Databricks documentation: Upsert into a Delta Lake table using merge. https://docs.databricks.com/aws/en/delta/merge
- Delta Lake documentation: Table batch reads and writes, including replaceWhere. https://docs.delta.io/delta-batch/
- Delta Lake documentation: Table deletes, updates, and merges. https://docs.delta.io/delta-update/
- Delta Lake Python API documentation. https://docs.delta.io/api/latest/python/spark/
- Apache Spark documentation: PySpark DataFrameReader.csv. https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameReader.csv.html
- Apache Spark documentation: PySpark GroupedData.agg. https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.GroupedData.agg.html
- Apache Spark documentation: PySpark SQL functions. https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/functions.html

## Issues Found
- Bronze CSV ingestion used `inferSchema=true` while the text described reading raw data without enforcing a schema. Changed it to `inferSchema=false`, which keeps CSV fields as strings and better matches Bronze-layer raw ingestion guidance.
- Silver validation could miss null results for required numeric/date fields because Spark boolean expressions can evaluate to null. Added explicit null checks and wrapped the validation expression with `coalesce(..., lit(False))`.
- Invalid-row filtering used equality comparisons against boolean literals. Replaced them with direct boolean filters so the intent is clearer and null-safe after the validation fix.
- The data quality helper counted only explicit `false` rule results as violations. Changed the violation filter to count both false and null rule results, and guarded pass-rate calculation for empty DataFrames.
- Gold aggregation used dictionary-based `.agg(...)` with duplicate Python keys for `order_total` and `order_date`, which would silently drop aggregations before Spark saw them. Replaced the dictionaries with explicit PySpark aggregate column expressions and aliases.
- The Gold example used `datediff`, `current_date`, and aggregate functions without importing them in that code block. Added the needed PySpark function imports.
- The daily Gold overwrite expression recalculated the minimum date inline and did not handle empty data. Stored the minimum `sale_date` once and skipped the overwrite when there is no data to write.
- The orchestration example divided by zero when both Silver and quarantine counts were zero. Added a total-count guard.

## Review Notes
- Static syntax validation was run against all Python code fences with `python3` AST parsing. Spark and Delta runtime execution was not performed because this repository does not provide a Spark/Delta test environment.
- Databricks currently recommends per-write schema evolution options such as `mergeSchema` over enabling session-wide `spark.databricks.delta.schema.autoMerge.enabled` for all writes. The post still shows the session-wide option as an example, which is technically valid but broader than preferred for production pipelines.
