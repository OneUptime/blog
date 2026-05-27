# Validation Summary: How to Use Dataproc Metastore as a Managed Hive Metastore for Spark and Presto

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Dataproc Metastore
- Google Cloud CLI
- Managed Service for Apache Spark / Dataproc clusters
- Dataproc Serverless Spark batches
- Apache Hive Metastore
- Apache Spark / PySpark SQL
- Presto optional component
- Google Cloud IAM
- Cloud Logging

## Sources Consulted
- Dataproc Metastore overview: https://docs.cloud.google.com/dataproc-metastore/docs/overview
- Dataproc Metastore Hive metastore behavior: https://docs.cloud.google.com/dataproc-metastore/docs/hive-metastore
- Dataproc Metastore attach cluster guide: https://docs.cloud.google.com/dataproc-metastore/docs/attach-dataproc
- Dataproc Metastore version support: https://docs.cloud.google.com/dataproc-metastore/docs/version-policy
- Dataproc Metastore IAM roles: https://docs.cloud.google.com/dataproc-metastore/docs/iam-roles
- Dataproc Metastore service tiers: https://docs.cloud.google.com/dataproc-metastore/docs/service-tier
- Google Cloud CLI `gcloud metastore services create`: https://docs.cloud.google.com/sdk/gcloud/reference/metastore/services/create
- Google Cloud CLI `gcloud metastore services update`: https://cloud.google.com/sdk/gcloud/reference/metastore/services/update
- Google Cloud CLI `gcloud metastore services backups create`: https://cloud.google.com/sdk/gcloud/reference/metastore/services/backups/create
- Google Cloud CLI `gcloud metastore services restore`: https://docs.cloud.google.com/sdk/gcloud/reference/metastore/services/restore
- Google Cloud CLI `gcloud dataproc clusters create`: https://cloud.google.com/sdk/gcloud/reference/dataproc/clusters/create
- Google Cloud CLI `gcloud dataproc batches submit pyspark`: https://docs.cloud.google.com/sdk/gcloud/reference/dataproc/batches/submit/pyspark
- Dataproc Presto optional component: https://docs.cloud.google.com/dataproc/docs/concepts/components/presto
- Dataproc cluster image version list: https://docs.cloud.google.com/dataproc/docs/concepts/versioning/dataproc-version-clusters
- Apache Spark SQL `CREATE TABLE` reference: https://spark.apache.org/docs/latest/sql-ref-syntax-ddl-create-table.html

## Issues Found
- The Dataproc cluster examples used `--image-version=2.1-debian11`, which is past its supported-until date as of 2026-05-27. Updated both cluster examples to `2.2-debian12`, a currently supported GA image line.
- The Presto CLI example used `localhost:8080`, but the Dataproc Presto optional component documents port `8060` by default. Updated the command to `localhost:8060`.
- The table creation comment described `user_events` as a managed table while the SQL specifies a `LOCATION`. Updated the comment to avoid misclassifying the table behavior.
- The access-control intro claimed IAM controls which tables users can see. For the Thrift endpoint used in the post, Dataproc Metastore IAM is resource-level rather than table-level. Updated the wording to describe access to Dataproc Metastore resources.
- The read-only IAM example used `roles/metastore.viewer`, which is not the documented Dataproc Metastore viewer role ID. Updated it to `roles/metastore.user`.
- The restore comment said the command creates a new metastore instance. The documented `gcloud metastore services restore` command restores into a Dataproc Metastore service. Updated the comment accordingly.

## Review Notes
- The tutorial remains accurate for a Thrift-based Dataproc Metastore service using the default port `9083`.
- Dataproc Metastore supports Hive metastore version `3.1.2`, and that remains the default supported version.
