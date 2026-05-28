# Validation Summary: How to Configure Dataproc to Read and Write Data in BigQuery

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataproc
- Google BigQuery
- Spark BigQuery connector
- Apache Spark / PySpark
- BigQuery Storage Read API
- BigQuery Storage Write API
- Google Cloud CLI and Cloud Storage

## Sources Consulted
- Google Cloud Dataproc: Use the Spark BigQuery connector: https://cloud.google.com/dataproc/docs/tutorials/bigquery-connector-spark-example
- Google Cloud Dataproc: BigQuery connector: https://cloud.google.com/dataproc/docs/concepts/connectors/bigquery
- GoogleCloudDataproc Spark BigQuery connector README and properties reference: https://github.com/GoogleCloudDataproc/spark-bigquery-connector
- Google Cloud BigQuery IAM roles and permissions: https://cloud.google.com/bigquery/docs/access-control
- Google Cloud BigQuery Storage Read API reference: https://cloud.google.com/bigquery/docs/reference/storage
- Google Cloud Dataproc Cloud Storage connector permissions: https://cloud.google.com/dataproc/docs/concepts/connectors/cloud-storage

## Issues Found
- Corrected the connector behavior description. The connector uses the BigQuery Storage Read API for reads, but only uses the BigQuery Storage Write API when `writeMethod` is set to `direct`; indirect writes use Cloud Storage and a BigQuery load operation.
- Updated Dataproc cluster setup. Dataproc image 2.1 and later includes the Spark BigQuery connector, and overriding its version should use `SPARK_BQ_CONNECTOR_VERSION` or `SPARK_BQ_CONNECTOR_URL` metadata at cluster creation. The previous example used an older metadata key with an initialization action on a 2.1 image.
- Clarified that `--jars` is appropriate for older Dataproc images. On Dataproc 2.1 and later, the built-in connector takes precedence, so connector version changes should be made through cluster metadata.
- Updated connector JAR examples from `0.36.1` to `0.44.2`, matching current connector documentation at review time.
- Corrected the temporary bucket explanation. The connector's `temporaryGcsBucket` option is for indirect writes, not direct reads or direct writes.
- Replaced examples that used the deprecated `table` option with the connector-recommended `load()` and `save()` path parameter form.
- Replaced the undocumented `.option("filter", ...)` read example with Spark DataFrame `filter()` syntax, which the connector can push down to BigQuery when supported.
- Fixed the SQL query example by quoting the BigQuery table path with backticks because the sample project ID contains a hyphen.
- Removed the statement that indirect writes are a legacy approach. The official connector still documents indirect writes as a supported write method.
- Corrected the partitioned table write example. Connector documentation states that `partitionField` and related table-creation partition options are not supported by the direct write method, so the example now uses `writeMethod=indirect` and a temporary bucket.
- Expanded IAM guidance to include read permissions, `roles/bigquery.readSessionUser` for the Storage Read API, and Cloud Storage object permissions for the temporary bucket.
- Replaced the invalid performance tip `spark.sql.sources.parallelPartitions` with the connector-supported `maxParallelism` and `preferredMinParallelism` options.
- Added a version caveat for `materializationDataset`, which is ignored by connector versions 0.42.1 and later.

## Review Notes
The post is technically relevant and remains a useful Dataproc-to-BigQuery tutorial after the corrections. The examples still use placeholder project, dataset, and bucket names, so readers must replace them with real resources and ensure the bucket location matches their BigQuery data location where required.
