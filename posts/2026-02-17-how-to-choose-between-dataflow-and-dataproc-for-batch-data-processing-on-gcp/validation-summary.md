# Validation Summary: How to Choose Between Dataflow and Dataproc for Batch Data Processing on GCP

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Google Cloud Dataflow
- Google Cloud Dataproc / Managed Service for Apache Spark
- Apache Beam
- Apache Spark / PySpark
- BigQuery
- Cloud Storage
- Pub/Sub
- Google Cloud CLI

## Sources Consulted
- Google Cloud Dataflow exactly-once documentation: https://cloud.google.com/dataflow/docs/concepts/exactly-once
- Google Cloud Dataflow pipeline options: https://cloud.google.com/dataflow/docs/reference/pipeline-options
- Apache Beam Python Count transform documentation: https://beam.apache.org/documentation/transforms/python/aggregation/count/
- Apache Beam BigQuery I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.bigquery.html
- Apache Beam Pub/Sub I/O documentation: https://beam.apache.org/releases/pydoc/current/apache_beam.io.gcp.pubsub.html
- Google Cloud SDK Dataproc cluster create reference: https://cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud SDK Dataproc jobs submit pyspark reference: https://cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/pyspark
- Google Cloud SDK Dataproc batches submit reference: https://cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit
- Google Cloud Dataproc optional components documentation: https://cloud.google.com/dataproc/docs/concepts/components/overview
- Google Cloud Managed Service for Apache Spark runtime versions: https://cloud.google.com/managed-spark/docs/concepts/versions/serverless-versions
- Google Cloud Managed Service for Apache Spark pricing: https://cloud.google.com/products/managed-service-for-apache-spark/pricing
- Apache Spark PySpark Window API documentation: https://spark.apache.org/docs/latest/api/python/reference/pyspark.sql/window.html

## Issues Found
- The first Apache Beam example used `json.loads` without importing `json`. Added the missing import.
- The batch/streaming Beam example used `beam.combiners.Count.PerKey()` directly after parsing JSON records, but `Count.PerKey()` expects key-value elements. Added an event-type key extraction step, formatted the counted tuples into BigQuery row dictionaries, and added an explicit BigQuery schema and write disposition.
- The Dataflow exactly-once wording was too broad for custom side effects. Updated it to reflect Dataflow's exactly-once result semantics while noting that retried user code calling external services must be idempotent.
- The PySpark example referenced `Window` without importing it and used a windowed sum while naming the column `sales_rank`. Added the `Window` and `rank` imports and changed the derived column to use `rank()`.
- The post referenced Presto as the current interactive SQL option for Dataproc. Current Dataproc images use Trino for newer image versions, while Presto is unavailable in image version 2.1 and later. Updated the comparison and interactive-analysis text to use Trino.
- The Dataproc cluster example used `--max-idle`, which is not a current `gcloud dataproc clusters create` flag. Replaced it with `--delete-max-idle=30m`.
- The Dataproc Serverless example used runtime `--version=2.1`, which is unsupported as of 2024-05-30. Updated it to `--version=2.2`, the current documented default supported runtime as of 2026-05-28.

## Review Notes
The local environment did not have `gcloud` installed, so Google Cloud CLI checks were performed against the official Cloud SDK reference documentation. Python code fences were checked with `python3` syntax parsing after edits.
