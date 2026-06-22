# Validation Summary: How to Handle Apache Iceberg Tables

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Apache Iceberg
- Apache Spark SQL
- PySpark
- Iceberg catalogs and metadata tables
- Iceberg schema evolution, partition evolution, time travel, and maintenance procedures

## Sources Consulted
- Apache Iceberg Spark Configuration: https://iceberg.apache.org/docs/latest/spark-configuration/
- Apache Iceberg Spark DDL: https://iceberg.apache.org/docs/latest/spark-ddl/
- Apache Iceberg Spark Queries: https://iceberg.apache.org/docs/latest/spark-queries/
- Apache Iceberg Spark Procedures: https://iceberg.apache.org/docs/latest/spark-procedures/
- Apache Iceberg Configuration: https://iceberg.apache.org/docs/latest/configuration/
- Apache Iceberg Maintenance: https://iceberg.apache.org/docs/latest/maintenance/
- Apache Iceberg Table Spec: https://iceberg.apache.org/spec/

## Issues Found
- The table properties section described `write.spark.fanout.enabled` as automatic compaction. Changed the comment to describe Spark's fanout writer, which allows unclustered writes and uses more memory.
- The snapshot retention example said it kept 10 snapshots but only set `history.expire.max-snapshot-age-ms`. Added `history.expire.min-snapshots-to-keep` and clarified that the settings keep snapshots by age while retaining at least 10 snapshots.
- The merge-on-read properties configured delete and update modes but not merge mode. Added `write.merge.mode` and clarified that these properties control row-level delete, update, and merge command behavior.
- The schema evolution section said the demonstrated changes do not break existing queries and that old queries using a renamed column would still work via column IDs. Changed this to clarify that these schema changes avoid data file rewrites, but SQL queries must use the new column name after a rename.
- The DataFrame time travel example passed a formatted timestamp string to `as-of-timestamp`. Changed it to pass epoch milliseconds and use `format("iceberg").load(...)`, matching Iceberg's Spark DataFrame API examples.
- The snapshot monitoring query referenced non-existent top-level `added_data_files_count` and `added_rows_count` columns in the `snapshots` metadata table. Changed it to read `added-data-files` and `added-records` from the snapshot `summary` map.

## Review Notes
The examples assume a Spark runtime with matching Iceberg Spark runtime dependencies and an existing `analytics` namespace. The Hadoop catalog example may also require the appropriate object-store filesystem dependencies and configuration for `s3://` access.
