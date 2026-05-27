# Validation Summary: How to Use Dataproc Templates for Common ETL Patterns

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc Templates
- Managed Service for Apache Spark / Dataproc Serverless
- Apache Spark and PySpark
- Google Cloud Storage
- BigQuery
- JDBC
- Hive Metastore
- Cloud Scheduler

## Sources Consulted
- Google Cloud Managed Service for Apache Spark templates documentation: https://docs.cloud.google.com/managed-spark/docs/guides/templates
- GoogleCloudPlatform/dataproc-templates repository README: https://github.com/GoogleCloudPlatform/dataproc-templates
- Dataproc Templates Python README: https://github.com/GoogleCloudPlatform/dataproc-templates/tree/main/python
- Dataproc Templates Python GCS template README: https://github.com/GoogleCloudPlatform/dataproc-templates/blob/main/python/dataproc_templates/gcs/README.md
- Dataproc Templates Python BigQuery template README: https://github.com/GoogleCloudPlatform/dataproc-templates/blob/main/python/dataproc_templates/bigquery/README.md
- Dataproc Templates Python JDBC template README: https://github.com/GoogleCloudPlatform/dataproc-templates/blob/main/python/dataproc_templates/jdbc/README.md
- Dataproc Templates Python Hive template README: https://github.com/GoogleCloudPlatform/dataproc-templates/blob/main/python/dataproc_templates/hive/README.md
- Dataproc Templates Python start.sh script: https://github.com/GoogleCloudPlatform/dataproc-templates/blob/main/python/bin/start.sh
- Spark BigQuery connector README: https://github.com/GoogleCloudDataproc/spark-bigquery-connector
- gcloud Scheduler HTTP job reference: https://docs.cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The post described Dataproc Templates as production-ready and maintained by Google. The repository is now archived and the README describes the templates as reference implementations for customization, so the wording was updated.
- The environment setup used `PROJECT` and `SPARK_VERSION=2.1`. The Python helper script reads `GCP_PROJECT`, requires `GCS_DEPS_BUCKET`, and submits runtime `1.2` by default, so the environment snippet was corrected.
- The `./bin/start.sh` examples omitted the `--` separator before template arguments. Added it to each helper-script command.
- The GCS to BigQuery format list included `orc`, which is not accepted by the Python template. Replaced it with `delta`.
- The BigQuery to GCS example used an unsupported `bigquery.gcs.input.sql` parameter. Reworked the example to use a filtered BigQuery view as the input table.
- The JDBC examples omitted JDBC driver JAR setup and credentials in the JDBC URL. Added the `JARS` environment variable note and credentials placeholders in the URLs.
- The Hive to BigQuery example omitted the required Hive metastore URI Spark property. Added `--properties=spark.hadoop.hive.metastore.uris=...`.
- The template list included BigQuery to BigQuery transformation, which is not listed in the current Python template README. Replaced it with JDBC to GCS, which is supported.

## Review Notes
The Dataproc Templates repository was archived on May 4, 2026, but the upstream README states that templates are still available to use. Future updates should consider whether an archived reference repository is still the best recommendation for new production ETL work.
