# Validation Summary: How to Run Spark SQL on Dataproc Serverless Without Managing Clusters

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc Serverless / Managed Service for Apache Spark
- Apache Spark SQL
- PySpark
- BigQuery Spark connector
- Google Cloud Storage
- Google Cloud CLI

## Sources Consulted
- Google Cloud CLI reference for `gcloud dataproc batches submit`: https://cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit
- Google Cloud Managed Service for Apache Spark BigQuery connector guide: https://cloud.google.com/managed-spark/docs/guides/spark-bigquery-connector
- Google Cloud Serverless for Apache Spark runtime versions: https://cloud.google.com/dataproc-serverless/docs/concepts/versions/dataproc-serverless-versions
- Google Cloud Serverless for Apache Spark runtime 2.3 components: https://cloud.google.com/dataproc-serverless/docs/concepts/versions/spark-runtime-2.3
- Google Cloud Serverless for Apache Spark runtime 3.0 components: https://cloud.google.com/dataproc-serverless/docs/concepts/versions/spark-runtime-3.0
- GoogleCloudDataproc Spark BigQuery connector documentation: https://github.com/GoogleCloudDataproc/spark-bigquery-connector
- Apache Spark SQL window function documentation: https://spark.apache.org/docs/latest/sql-ref-syntax-qry-select-window.html
- Apache Spark SQL built-in function documentation: https://spark.apache.org/docs/latest/sql-ref-functions-builtin.html
- BigQuery window function documentation: https://cloud.google.com/bigquery/docs/reference/standard-sql/window-function-calls

## Issues Found
- The BigQuery submit command used an explicit old Scala 2.12 connector JAR. Supported Serverless for Apache Spark runtimes include the BigQuery connector, and the documented way to change the built-in connector for serverless batches is `dataproc.sparkBqConnector.version` or `dataproc.sparkBqConnector.uri`. Updated the surrounding text and command to use `dataproc.sparkBqConnector.version=0.44.2`.
- The BigQuery analysis example named a `ROWS BETWEEN 29 PRECEDING AND CURRENT ROW` window as `orders_last_30_days`. In Spark SQL, `ROWS` frames count physical rows, not calendar days. Renamed the alias to `orders_last_30_orders`.
- The cost comparison described custom window frame specifications as Spark-specific. BigQuery also supports window frame clauses, so the wording was changed to refer more generally to Spark-specific SQL features and execution behavior.

## Review Notes
- The product documentation now uses "Managed Service for Apache Spark" as the umbrella name for the former Dataproc Serverless and Dataproc on Compute Engine products, but `gcloud dataproc batches submit pyspark` remains the documented CLI path.
- The post uses placeholder bucket, project, service account, subnet, and table names. These are syntactically plausible examples but require the matching IAM roles, APIs, network configuration, and Cloud Storage paths in a real project.
