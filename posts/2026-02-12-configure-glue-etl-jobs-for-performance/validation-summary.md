# Validation Summary: How to Configure Glue ETL Jobs for Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- AWS Glue ETL
- AWS Glue worker types and auto scaling
- Apache Spark / Spark SQL
- PySpark
- AWS Glue Data Catalog DynamicFrames
- Amazon S3
- Amazon CloudWatch metrics and logs
- Parquet and ORC

## Sources Consulted
- AWS Glue worker types: https://docs.aws.amazon.com/glue/latest/dg/worker-types.html
- AWS Glue Job API: https://docs.aws.amazon.com/glue/latest/webapi/API_Job.html
- AWS Glue auto scaling: https://docs.aws.amazon.com/glue/latest/dg/auto-scaling.html
- AWS Glue job parameters: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-programming-etl-glue-arguments.html
- AWS Glue Spark UI configuration: https://docs.aws.amazon.com/glue/latest/dg/monitor-spark-ui-jobs.html
- AWS Glue continuous logging: https://docs.aws.amazon.com/glue/latest/dg/monitor-continuous-logging-enable.html
- AWS Glue CloudWatch metrics: https://docs.aws.amazon.com/glue/latest/dg/monitoring-awsglue-with-cloudwatch-metrics.html
- AWS Glue GlueContext / DynamicFrame APIs: https://docs.aws.amazon.com/glue/latest/dg/aws-glue-api-crawler-pyspark-extensions-glue-context.html
- AWS Glue 4.0 migration notes: https://docs.aws.amazon.com/glue/latest/dg/migrating-version-40.html
- Apache Spark 3.3.0 SQL performance tuning: https://dlcdn.apache.org/spark/docs/3.3.0/sql-performance-tuning.html
- Apache Spark 3.3.0 configuration: https://dlcdn.apache.org/spark/docs/3.3.0/configuration.html
- PySpark DataFrame APIs: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/dataframe.html
- PySpark DataFrameStatFunctions: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameStatFunctions.html
- Linked OneUptime Athena column format guide: https://oneuptime.com/blog/post/2026-02-12-optimize-athena-queries-with-column-formats-parquet-orc/view
- Linked OneUptime Glue job bookmarks guide: https://oneuptime.com/blog/post/2026-02-12-use-glue-job-bookmarks-for-incremental-data-processing/view

## Issues Found
- The worker type table listed outdated disk sizes for G.1X and G.2X workers. Updated G.1X from 64 GB to 94 GB and G.2X from 128 GB to 138 GB to match current AWS Glue documentation.
- The Spark configuration example used duplicate Python dictionary keys for `--conf`. Replaced it with AWS Glue's supported format: one `--conf` argument whose value includes multiple Spark configs separated by `--conf`.
- The skew detection example said it compared the largest value to the median, but `describe("count")` does not return a median. Replaced it with `approxQuantile("count", [0.5], 0.01)` for an approximate median.
- The salting example used `col`, `sum`, and `count` without importing them. Added the missing PySpark function imports so the snippet is syntactically complete.

## Review Notes
- AWS Glue 4.0 is correctly tied to Spark 3.3, and the Spark SQL defaults discussed for AQE, shuffle partitions, and broadcast threshold match Spark 3.3 documentation.
- The Glue auto scaling, Spark UI, continuous logging, `--enable-metrics`, push-down predicate, and CloudWatch metric names match AWS documentation for Glue 4.0-era Spark ETL jobs.
- AWS Glue 5.0 has real-time logging by default, but the post's examples are explicitly centered on Glue 4.0, so the continuous logging configuration remains valid for the version shown.
