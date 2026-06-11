# Validation Summary: How to Create Merge Patterns

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- SQL MERGE
- Apache Spark
- PySpark
- Delta Lake
- Databricks SQL / Delta SQL
- Spark Structured Streaming
- Apache Kafka

## Sources Consulted
- Delta Lake documentation: Table deletes, updates, and merges - https://docs.delta.io/delta-update/
- Delta Lake Python API documentation - https://docs.delta.io/api/latest/python/spark/
- Databricks SQL MERGE INTO documentation - https://docs.databricks.com/aws/en/sql/language-manual/delta-merge-into
- Databricks Delta Lake merge guide - https://docs.databricks.com/aws/en/delta/merge
- Databricks SQL named parameter markers documentation - https://docs.databricks.com/aws/en/sql/user/queries/query-parameters
- Databricks SQL OPTIMIZE documentation - https://docs.databricks.com/aws/en/sql/language-manual/delta-optimize
- Apache Spark Structured Streaming foreachBatch API documentation - https://spark.apache.org/docs/latest/api/python/reference/pyspark.ss/api/pyspark.sql.streaming.DataStreamWriter.foreachBatch.html
- Apache Spark Structured Streaming Kafka integration guide - https://spark.apache.org/docs/latest/streaming/structured-streaming-kafka-integration.html

## Issues Found
- The SQL CDC example used `@last_processed_timestamp`, which is T-SQL-style parameter syntax and does not match the Databricks SQL named parameter marker syntax used for Delta SQL examples. Changed it to `:last_processed_timestamp`.
- The PySpark CDC streaming example read from Kafka and passed the raw Kafka DataFrame directly into `process_cdc_merge`, but Spark's Kafka source exposes `key` and `value` as binary columns and does not automatically create `customer_id`, `operation`, `event_timestamp`, `name`, `email`, or `address` columns. Added a JSON schema and `from_json(col("value").cast("string"), cdc_schema)` parsing step before `foreachBatch`.
- Removed unused imports (`lit` and `current_timestamp`) from Python snippets touched during the review.

## Review Notes
- Delta Lake supports multiple `WHEN MATCHED`, `WHEN NOT MATCHED`, and `WHEN NOT MATCHED BY SOURCE` clauses, with ordering and conditional-clause constraints as documented.
- `WHEN NOT MATCHED BY SOURCE` support is version-dependent in open source Delta Lake; SQL support is documented for Delta Lake 2.4 and above, while Databricks documents support in Databricks Runtime 12.2 LTS and above.
- The SCD Type 2 example correctly uses a two-step approach, but production use should run the close-and-insert steps within the appropriate transaction or orchestration boundary for the target platform.
- Databricks now recommends liquid clustering for new Delta tables instead of Z-ordering, but the shown `OPTIMIZE ... ZORDER BY` syntax remains valid for tables where Z-ordering is applicable.
