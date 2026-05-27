# Validation Summary: How to Monitor Dataproc Jobs with the Spark History Server UI

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Dataproc
- Dataproc Component Gateway
- Apache Spark History Server
- Apache Spark Web UI
- Spark SQL and DataFrame APIs
- Google Cloud Storage
- gcloud CLI

## Sources Consulted
- Google Cloud Dataproc Component Gateway documentation: https://docs.cloud.google.com/dataproc/docs/concepts/accessing/dataproc-gateways
- Google Cloud Dataproc Persistent History Server documentation: https://docs.cloud.google.com/dataproc/docs/concepts/jobs/history-server
- Google Cloud Dataproc staging and temp buckets documentation: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/staging-bucket
- Google Cloud Dataproc cluster properties documentation: https://docs.cloud.google.com/dataproc/docs/concepts/configuring-clusters/cluster-properties
- Google Cloud Dataproc image version documentation: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Google Cloud SDK reference for `gcloud dataproc clusters create`: https://cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Apache Spark Web UI documentation: https://spark.apache.org/docs/3.5.6/web-ui.html
- Apache Spark Monitoring and Instrumentation documentation: https://spark.apache.org/docs/3.5.2/monitoring.html
- Apache Spark SQL Performance Tuning documentation: https://spark.apache.org/docs/3.5.4/sql-performance-tuning.html

## Issues Found
- The cluster creation examples used Dataproc image version `2.1-debian11`, which is past its support date as of this validation. Updated the examples to `2.2-debian12`, a supported Dataproc image version.
- The SSH tunnel example used zone `us-central1-a`, but the corresponding cluster creation command did not pin the cluster to that zone. Added `--zone=us-central1-a` to make the example internally consistent.
- The post said Spark event logs are written to HDFS by default on Dataproc. Dataproc writes Spark job history files to the cluster temp bucket in Cloud Storage by default, so that statement was corrected.

## Review Notes
- Dataproc-created temp buckets are not deleted when a cluster is deleted, but temp bucket data is treated as ephemeral and has a TTL. The revised wording recommends configuring a specific user-owned GCS location when persistent historical review is required.
- For Dataproc 2.0 and 2.1 clusters using Cloud Storage connector 2.0.x, in-progress history updates to GCS require additional output stream settings. The post now uses Dataproc 2.2, avoiding the obsolete image version in examples.
