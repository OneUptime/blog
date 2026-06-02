# Validation Summary: How to Partition Data in S3 for Efficient Athena Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Amazon Athena
- Amazon S3
- AWS Glue Data Catalog
- Athena partition projection
- Athena CTAS
- Apache Parquet
- AWS Glue for Spark / PySpark

## Sources Consulted
- Amazon Athena: Partition your data - https://docs.aws.amazon.com/athena/latest/ug/partitions.html
- Amazon Athena: What is partitioning? - https://docs.aws.amazon.com/athena/latest/ug/ctas-partitioning-and-bucketing-what-is-partitioning.html
- Amazon Athena: MSCK REPAIR TABLE - https://docs.aws.amazon.com/athena/latest/ug/msck-repair-table.html
- Amazon Athena: Set up partition projection - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-setting-up.html
- Amazon Athena: Supported types for partition projection - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-supported-types.html
- Amazon Athena: Amazon Data Firehose partition projection example - https://docs.aws.amazon.com/athena/latest/ug/partition-projection-kinesis-firehose-example.html
- Amazon Athena: Use partitioning and bucketing - https://docs.aws.amazon.com/athena/latest/ug/ctas-partitioning-and-bucketing.html
- Amazon Athena: What is bucketing? - https://docs.aws.amazon.com/athena/latest/ug/ctas-partitioning-and-bucketing-what-is-bucketing.html
- Amazon Athena: Optimize data - https://docs.aws.amazon.com/athena/latest/ug/performance-tuning-data-optimization-techniques.html
- Amazon Athena: Using EXPLAIN and EXPLAIN ANALYZE - https://docs.aws.amazon.com/athena/latest/ug/athena-explain-statement.html
- Amazon Athena: Escape reserved keywords in queries - https://docs.aws.amazon.com/athena/latest/ug/reserved-words.html
- AWS Glue: GlueContext class - https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html

## Issues Found
- The Athena `CREATE EXTERNAL TABLE` examples used `timestamp` as an unescaped column name. `TIMESTAMP` is a reserved keyword in Athena DDL, so the DDL can fail unless the identifier is escaped. I changed those column definitions to use backticks.
- The CTAS example selected the reserved-name column without identifier quoting. I changed it to `"timestamp"` in the `SELECT` list so the example remains valid when reading from the corrected Athena table.
- The partition projection recommendation was too broad. AWS documents partition projection as useful for predictable partition schemes and high partition counts, with caveats for sparse tables. I narrowed the wording to predictable partition schemes with many partitions.
- The EXPLAIN guidance said to look for `partition_filter`, but AWS's documented Athena EXPLAIN partition-pruning example shows partition columns marked as `PARTITION_KEY` with constrained partition values. I updated the guidance accordingly.

## Review Notes
- The partition projection examples use `STRING` partition columns, which matches AWS performance guidance for Athena partition keys.
- The CTAS example keeps partition columns at the end of the `SELECT` list, matching Athena CTAS partitioning requirements.
- The daily/monthly/weekly granularity table is a reasonable rule of thumb, but real partition choices should be driven by query predicates, partition cardinality, file counts, and data volume.
