# Validation Summary: Why Lakehouse Partitions Create Tiny Files—and How to Fix the Write Path

## Status

validated

## Post Type

Technical guide

## Technologies Covered

- Apache Iceberg
- Apache Spark and Spark SQL
- Spark Adaptive Query Execution (AQE)
- Apache Flink TableMaintenance
- Apache Parquet
- Apache Hive
- Object-store-backed data lakehouses

## Sources Consulted

- [Apache Iceberg: Spark Writes](https://iceberg.apache.org/docs/latest/spark-writes/)
- [Apache Iceberg: Spark Configuration](https://iceberg.apache.org/docs/latest/spark-configuration/)
- [Apache Iceberg: Configuration Properties](https://iceberg.apache.org/docs/latest/configuration/)
- [Apache Iceberg: Spark Metadata Tables](https://iceberg.apache.org/docs/latest/spark-queries/#inspecting-tables)
- [Apache Iceberg: Spark Procedures](https://iceberg.apache.org/docs/latest/spark-procedures/)
- [Apache Iceberg: Maintenance](https://iceberg.apache.org/docs/latest/maintenance/)
- [Apache Iceberg: Flink TableMaintenance](https://iceberg.apache.org/docs/latest/flink-maintenance/)
- [Apache Iceberg: Partitioning](https://iceberg.apache.org/docs/latest/partitioning/)
- [Apache Iceberg: Partition Evolution](https://iceberg.apache.org/docs/latest/evolution/#partition-evolution)
- [Apache Iceberg: Reliability](https://iceberg.apache.org/docs/latest/reliability/)
- [Apache Iceberg Table Specification](https://iceberg.apache.org/spec/)
- [Apache Iceberg 1.4.0 release notes](https://iceberg.apache.org/releases/#140-release)
- [Apache Iceberg 1.11.0: Spark 3.5 write configuration source](https://github.com/apache/iceberg/blob/apache-iceberg-1.11.0/spark/v3.5/spark/src/main/java/org/apache/iceberg/spark/SparkWriteConf.java)
- [Apache Spark 3.5.7: SQL Literals](https://spark.apache.org/docs/3.5.7/sql-ref-literals.html)
- [Apache Spark 3.5.7: SQL lexer grammar](https://github.com/apache/spark/blob/v3.5.7/sql/api/src/main/antlr4/org/apache/spark/sql/catalyst/parser/SqlBaseLexer.g4#L451-L455)
- [Apache Spark 3.5.7: SQL parser grammar](https://github.com/apache/spark/blob/v3.5.7/sql/api/src/main/antlr4/org/apache/spark/sql/catalyst/parser/SqlBaseParser.g4#L985-L993)
- [Apache Spark: SQL built-in functions](https://spark.apache.org/docs/latest/api/sql/index.html)
- [Apache Hive: Configuration Properties](https://hive.apache.org/docs/latest/user/configuration-properties/)

## Issues Found

- The post described all default Spark writers as requiring clustered input. This became inaccurate when Iceberg's Spark 3.5 integration began selecting a fanout writer by default for partitioned, unsorted writes with no ordering requirement. The text now attributes the clustering requirement specifically to the clustered writer and explains that fanout selection depends on the Spark/Iceberg version and configuration.
- The distribution-mode paragraph called `hash` the general default. It now states the current defaults precisely: `hash` for partitioned tables without a sort order, `range` for sorted tables, and `none` for unpartitioned, unsorted tables.
- The fanout paragraph treated fanout as strictly opt-in. It now notes the current default-selection behavior for partitioned, unsorted writes in Iceberg's Spark 3.5-and-later integrations while retaining the memory and open-file-handle warning.
- The concurrent-writer advice conflated committed duplicate appends with files produced by failed or speculative task attempts. It now recommends idempotent application-level append retries and separately identifies orphan-file monitoring for failed or speculative attempts.
- The `rewrite_data_files` example used doubled single quotes inside the `where` string. Spark 3.5 and 4.0 concatenate adjacent string literals rather than preserving those quotes, producing an invalid timestamp predicate. The example now uses Spark's documented backslash escaping for the nested timestamp literals.
- The delete-file maintenance bullet implied that Spark exposes equivalent rewrite actions for position and equality delete files. It now names the released `rewrite_position_delete_files` procedure and identifies equality-delete maintenance as version- and engine-specific.
- The post referred to a universal Iceberg maintenance ordering, which the official maintenance guide does not prescribe. The wording now refers to Iceberg's maintenance and safety guidance without asserting an ordering.

## Review Notes

- The review used Apache Iceberg 1.11.0 as the current release and checked older version claims against the relevant Spark and Iceberg documentation and source history.
- The metadata-table query, table properties, AQE settings, `ALTER TABLE ... SET TBLPROPERTIES` statement, and `rewrite_data_files` procedure options are valid for the documented Spark/Iceberg integrations.
- The post correctly warns that a `where` predicate selects files that may contain matching rows rather than guaranteeing a row-exact rewrite boundary.
- The illustrative file-size and alert thresholds are appropriately labeled as workload-specific examples.
- The Apache Hive configuration link is valid but tangential; native Hive `hive.merge.*` settings do not configure Iceberg's Spark write path.
