# Validation Summary: ETL Best Practices for Building Reliable Data Pipelines

## Status
validated

## Post Type
Guide

## Technologies Covered
- ETL and ELT data pipeline patterns
- SQL transactions, partition replacement, and data freshness queries
- Snowflake SQL date/time functions
- Python
- pandas
- PySpark DataFrameWriter
- Mermaid diagrams
- Dead letter queues
- Apache Airflow, Dagster, and Prefect orchestration concepts
- dbt transformation workflow concepts

## Sources Consulted
- Microsoft Azure Architecture Center: ETL and ELT data transfer patterns, https://learn.microsoft.com/en-us/azure/architecture/data-guide/relational-data/etl
- Google Cloud BigQuery documentation: loading, transforming, and exporting data, https://docs.cloud.google.com/bigquery/docs/load-transform-export-intro
- dbt Labs: data movement patterns and dbt's transformation role, https://www.getdbt.com/blog/data-movement-patterns
- Apache Spark PySpark API: DataFrameWriter.mode, https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.mode.html
- Apache Spark PySpark API: DataFrameWriter.parquet, https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/api/pyspark.sql.DataFrameWriter.parquet.html
- pandas API: Series.str.contains, https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Series.str.contains.html
- pandas API: Series.isin, https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Series.isin.html
- pandas API: Timestamp.now, https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.Timestamp.now.html
- pandas API: concat, https://pandas.pydata.org/pandas-docs/stable/reference/api/pandas.concat.html
- Python documentation: datetime, https://docs.python.org/3.14/library/datetime.html
- Python documentation: dataclasses, https://docs.python.org/3/library/dataclasses.html
- Snowflake documentation: DATEDIFF, https://docs.snowflake.com/en/sql-reference/functions/datediff
- Snowflake documentation: BEGIN transactions, https://docs.snowflake.com/en/sql-reference/sql/begin
- Apache Airflow documentation: Backfill, https://airflow.apache.org/docs/apache-airflow/3.0.0/core-concepts/backfill.html
- Apache Airflow documentation: BaseOperator retry options, https://airflow.apache.org/docs/apache-airflow/2.8.4/_api/airflow/models/baseoperator/index.html
- Google Cloud Pub/Sub documentation: dead-letter topics, https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- AWS SQS documentation: dead-letter queues, https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
- Mermaid documentation: flowchart syntax, https://mermaid.js.org/syntax/flowchart.html

## Issues Found
- The row-level pandas validation snippet used `pd.Timestamp.now()` and `pd.concat()` without importing pandas. Added `import pandas as pd` to make the snippet complete.
- The `PipelineMetrics` snippet used `datetime.utcnow()`, which is deprecated in Python 3.12 and later. Replaced it with `datetime.now(timezone.utc)` and imported `timezone` from `datetime`.

## Review Notes
- Python snippets were checked with `ast.parse` after edits and are syntactically valid.
- pandas is not installed in the local environment, so pandas examples were verified against official pandas API documentation rather than executed locally.
- The SQL examples are illustrative and use warehouse-specific syntax such as `::date` casts and `DATEDIFF(hour, ...)`; these are valid in Snowflake and similar warehouses but are not portable to every SQL engine.
