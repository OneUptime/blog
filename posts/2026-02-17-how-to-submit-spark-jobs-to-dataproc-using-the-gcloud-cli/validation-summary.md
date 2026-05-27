# Validation Summary: How to Submit Spark Jobs to Dataproc Using the gcloud CLI

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc
- Dataproc Serverless / Serverless for Apache Spark
- Google Cloud CLI (`gcloud`)
- Apache Spark
- PySpark
- Spark SQL
- Cloud Storage
- Cloud Logging

## Sources Consulted
- Google Cloud CLI reference: `gcloud dataproc clusters create` - https://cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud CLI reference: `gcloud dataproc jobs submit pyspark` - https://cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/pyspark
- Google Cloud CLI reference: `gcloud dataproc jobs submit spark-sql` - https://cloud.google.com/sdk/gcloud/reference/dataproc/jobs/submit/spark-sql
- Google Cloud CLI reference: `gcloud dataproc batches submit pyspark` - https://cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit/pyspark
- Dataproc cluster image version lists - https://cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Dataproc versioning overview - https://cloud.google.com/dataproc/docs/concepts/versioning/overview
- Serverless for Apache Spark runtime versions - https://cloud.google.com/dataproc-serverless/docs/concepts/versions/dataproc-serverless-versions
- Serverless for Apache Spark properties - https://cloud.google.com/dataproc-serverless/docs/concepts/properties
- Dataproc job output and logs - https://cloud.google.com/dataproc/docs/guides/dataproc-job-output
- Cloud Logging monitored resource list - https://cloud.google.com/logging/docs/api/v2/resource-list
- Apache Spark SQL reference - https://spark.apache.org/docs/latest/sql-ref.html

## Issues Found
- The Dataproc cluster creation example pinned `--image-version=2.1-debian11`, which is past its support date as of 2026-05-27. Updated it to `2.3-debian12`, a supported GA Dataproc image version.
- The Dataproc Serverless example pinned `--version=2.1`, but Serverless for Apache Spark runtime 2.1 is no longer listed among supported runtimes. Updated it to `--version=2.3`, a supported LTS runtime.
- The description claimed the article covers SparkR jobs, but the post only includes PySpark and Spark SQL examples. Updated the description to match the actual technical coverage.
- The conclusion said the "same set of commands" works across PySpark, Spark SQL, and Scala Spark jobs, but the gcloud CLI uses different submit subcommands for different job types. Reworded this to "same CLI workflow" to keep the intended meaning accurate.

## Review Notes
- The PySpark examples are syntactically valid and use current SparkSession/DataFrame APIs.
- The `gcloud dataproc jobs submit pyspark`, `spark-sql`, dependency, async, wait, describe, list, labels, and retry flags match the current Google Cloud CLI reference.
- The Cloud Logging resource filter uses the documented `cloud_dataproc_job` monitored resource and `job_id` label.
- `gsutil cp` remains workable for Cloud Storage uploads, though future posts may prefer `gcloud storage cp` for consistency with newer Google Cloud CLI examples.
