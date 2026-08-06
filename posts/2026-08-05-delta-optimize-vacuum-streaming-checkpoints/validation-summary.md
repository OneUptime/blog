# Validation Summary: Do OPTIMIZE and VACUUM Break Delta Streaming Checkpoints?

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Databricks
- Delta Lake
- Apache Spark Structured Streaming
- Delta Lake `OPTIMIZE` and `VACUUM`
- Structured Streaming checkpoints and `foreachBatch`
- Delta Lake change data feed
- Unity Catalog predictive optimization

## Sources Consulted
- Databricks: Optimize data file layout - https://docs.databricks.com/aws/en/tables/operations/optimize
- Databricks: Remove unused data files with `VACUUM` - https://docs.databricks.com/aws/en/tables/operations/vacuum
- Databricks SQL language reference: `VACUUM` - https://docs.databricks.com/aws/en/sql/language-manual/delta-vacuum
- Databricks: Delta Lake table streaming reads and writes - https://docs.databricks.com/aws/en/structured-streaming/delta-lake
- Databricks: Structured Streaming checkpoints - https://docs.databricks.com/aws/en/structured-streaming/checkpoints
- Databricks: Use `foreachBatch` to write to arbitrary data sinks - https://docs.databricks.com/aws/en/structured-streaming/foreach
- Databricks: Use change data feed on Databricks - https://docs.databricks.com/aws/en/tables/features/change-data-feed
- Databricks: Row-level concurrency - https://docs.databricks.com/aws/en/optimizations/isolation/row-level-concurrency
- Databricks: Predictive optimization for Unity Catalog managed tables - https://docs.databricks.com/aws/en/optimizations/predictive-optimization
- Databricks SQL language reference: `SHOW TBLPROPERTIES` - https://docs.databricks.com/aws/en/sql/language-manual/sql-ref-syntax-aux-show-tblproperties
- Delta Lake: Table utility commands - https://docs.delta.io/delta-utility/
- Delta Lake: Table properties reference - https://docs.delta.io/table-properties/
- Apache Spark PySpark API: `DataFrame.isEmpty` - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.isEmpty.html

## Issues Found
- The sink-concurrency paragraph described every native Delta streaming sink as safe with concurrent `OPTIMIZE` and suggested that the optimization might retry after a conflict. The documented no-conflict guarantee applies specifically to append operations that do not read the target table, on tables that support concurrent transactions; other write patterns have conditional conflict behavior. Narrowed the statement to that case and clarified that other patterns can fail with a concurrency exception without invalidating the checkpoint.
- The empty-`foreachBatch` claim attributed empty inputs generally to maintenance commits such as `OPTIMIZE`. Current Databricks documentation specifically identifies an `OPTIMIZE` operation with no files to process, as well as physical-plan file pruning. Updated the explanatory bullet and failure-response table to match those documented cases.

## Review Notes
The checkpoint contents, Delta source offset description, `epochId = -1` behavior, seven-day data-file retention default, 30-day transaction-log retention default, `DELTA_FILE_NOT_FOUND_DETAILED` recovery guidance, `spark.sql.files.ignoreMissingFiles` warning, protected `_`/`.` checkpoint directories, change data feed retention dependency, backlog metric names, SQL commands, and `DataFrame.isEmpty()` example all match current official documentation. All seven documentation links in the post resolve to the intended Databricks pages. `VACUUM LITE` does not discover unmanaged files that never appeared in the transaction log, but `FULL` remains the default mode and can remove an unprotected checkpoint directory under the table path as the post warns.
