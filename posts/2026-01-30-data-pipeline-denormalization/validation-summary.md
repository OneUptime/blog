# Validation Summary: How to Implement Data Denormalization

## Status
validated

## Post Type
Tutorial / technical implementation guide

## Technologies Covered
- SQL data warehouse denormalization
- PostgreSQL partitioned tables, PL/pgSQL, indexes, generated columns, `ON CONFLICT`, materialized views
- Python
- Apache Spark / PySpark DataFrames, joins, broadcast hints, partitioned Parquet writes
- Parquet
- BigQuery nested and repeated fields
- Change Data Capture and watermark-based incremental processing patterns

## Sources Consulted
- PostgreSQL documentation: Table Partitioning - https://www.postgresql.org/docs/current/ddl-partitioning.html
- PostgreSQL documentation: INSERT / ON CONFLICT - https://www.postgresql.org/docs/current/sql-insert.html
- PostgreSQL documentation: REFRESH MATERIALIZED VIEW - https://www.postgresql.org/docs/current/sql-refreshmaterializedview.html
- Apache Spark documentation: DataFrame.join - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.join.html
- Apache Spark documentation: DataFrame.alias - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrame.alias.html
- Apache Spark documentation: SQL performance tuning and broadcast join configuration - https://spark.apache.org/docs/latest/sql-performance-tuning.html
- Apache Spark documentation: DataFrameWriter.partitionBy - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.partitionBy.html
- Apache Spark documentation: DataFrameWriter.mode - https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.mode.html
- BigQuery documentation: Use nested and repeated fields - https://docs.cloud.google.com/bigquery/docs/best-practices-performance-nested
- Apache Parquet documentation: Nested Encoding - https://parquet.apache.org/docs/file-format/nestedencoding/

## Issues Found
- The PostgreSQL partitioned table declared `order_id BIGINT PRIMARY KEY` while partitioning by `order_date`. PostgreSQL requires primary key and unique constraints on partitioned tables to include all partition key columns. Changed the key to `PRIMARY KEY (order_date, order_id, order_line_id)`, which also better matches the order-line grain of the table.
- The PySpark product/category self-join referenced columns as `products.name` and `categories.name` without DataFrame aliases. Spark's documented approach for disambiguating joined DataFrames is to alias them and reference aliased columns. Added aliases for `products`, `categories`, and `parent_categories`, then updated the selected columns and join condition.
- The PySpark time-dimension join referenced `orders.order_date` after creating `fact_joined`. Changed it to use `F.col("order_date") == F.col("date_value")`, which is clearer and avoids relying on a stale DataFrame object after joins.
- The Spark pipeline advertised idempotent incremental processing but wrote incremental chunks in `append` mode, which can duplicate data when a window is reprocessed. Changed chunk writes to `overwrite` mode so the configured dynamic partition overwrite behavior is used for reruns.
- The comment claiming `.repartition(F.col("order_date"))` targets 128 MB files was inaccurate; repartitioning by a column groups records by that column but does not guarantee file size. Updated the comment.
- The PostgreSQL `ON CONFLICT (table_name, partition_key)` example had no matching unique or primary key constraint. Added `PRIMARY KEY (table_name, partition_key)`.
- The partition tracker's generated `needs_refresh` expression could evaluate to NULL for newly inserted rows because `target_last_refreshed_at` had no default. Added a default timestamp so new source updates are flagged as refreshable.
- The CDC function returned two DataFrames but was annotated as returning a single `DataFrame`, and it used an undefined `last_checkpoint`. Added a `last_checkpoint` parameter and changed the return type to `Tuple[DataFrame, DataFrame]`.

## Review Notes
- The SQL examples are PostgreSQL-oriented even though the post describes data warehouses broadly. That is acceptable, but future revisions could label the SQL dialect explicitly.
- Several snippets are illustrative and assume supporting objects exist, such as schemas, staging tables, `analytics.pipeline_log`, Delta Lake support for `.format("delta")`, and a `denormalize_records` helper.
- `REFRESH MATERIALIZED VIEW CONCURRENTLY` in PostgreSQL has additional requirements, including a suitable unique index on the materialized view. The example is directionally correct but would need that operational detail in production.
