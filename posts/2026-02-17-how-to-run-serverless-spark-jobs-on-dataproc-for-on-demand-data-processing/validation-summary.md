# Validation Summary: How to Run Serverless Spark Jobs on Dataproc for On-Demand Data Processing

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataproc Serverless / Managed Service for Apache Spark
- Apache Spark and PySpark
- Spark SQL
- Google Cloud CLI (`gcloud`)
- Google Cloud Storage
- BigQuery Spark connector
- Cloud Functions / Functions Framework
- Google Cloud Dataproc Python client library

## Sources Consulted
- Google Cloud SDK reference: `gcloud dataproc batches submit pyspark` - https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit/pyspark
- Google Cloud SDK reference: `gcloud dataproc batches submit` and Spark SQL batch examples - https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit
- Managed Service for Apache Spark: create/submit serverless Spark batch workloads - https://docs.cloud.google.com/managed-spark/docs/quickstarts/spark-batch
- Managed Service for Apache Spark: serverless Spark properties - https://docs.cloud.google.com/managed-spark/docs/concepts/spark-properties-serverless
- Managed Service for Apache Spark: serverless autoscaling properties - https://docs.cloud.google.com/managed-spark/docs/concepts/autoscaling-serverless
- Managed Service for Apache Spark: serverless runtime versions - https://docs.cloud.google.com/managed-spark/docs/concepts/versions/serverless-versions
- Google Cloud Python client reference: `BatchControllerClient.create_batch` - https://docs.cloud.google.com/python/docs/reference/dataproc/latest/google.cloud.dataproc_v1.services.batch_controller.BatchControllerClient
- Google Cloud Python client reference: `RuntimeConfig` - https://docs.cloud.google.com/python/docs/reference/dataproc/latest/google.cloud.dataproc_v1.types.RuntimeConfig

## Issues Found
- The post used `--version=2.1` in the CLI example and `version="2.1"` in the Python API example. Runtime 2.1 is unsupported as of 2024-05-30, so both examples were updated to `2.3`, a supported LTS runtime.
- The Python dependency example used `--pip-packages`, which is not a valid flag for `gcloud dataproc batches submit pyspark`. The example was changed to use `--py-files` for user Python modules and to recommend a custom container for third-party package dependencies.
- The Spark SQL example used an inline `--query` flag. The serverless batch Spark SQL command expects a SQL script path as its positional argument, so the example now passes `gs://my-bucket/sql/daily_summary.sql`.
- The cost optimization section used `spark.dataproc.executor.spot.ratio`, which is not listed as a supported serverless Spark property. The example was replaced with supported dynamic allocation bounds.
- The explanation said executors are allocated from a shared pool. Official docs describe managed compute infrastructure and autoscaling, so the wording was changed to avoid implying a specific shared-pool implementation.

## Review Notes
The current product documentation uses the name "Managed Service for Apache Spark" for what was formerly Dataproc Serverless / Google Cloud Serverless for Apache Spark. The post still uses "Dataproc Serverless" in the title and prose, which is understandable for continuity but may be worth refreshing in a future editorial update.
