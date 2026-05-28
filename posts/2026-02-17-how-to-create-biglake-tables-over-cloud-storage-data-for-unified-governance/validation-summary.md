# Validation Summary: How to Create BigLake Tables Over Cloud Storage Data for Unified Governance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud
- BigQuery
- BigLake external tables
- Cloud Storage
- BigQuery connections
- GoogleSQL DDL and DCL
- gsutil and gcloud CLI

## Sources Consulted
- Google Cloud BigQuery documentation: Create BigLake external tables for Cloud Storage - https://docs.cloud.google.com/bigquery/docs/create-cloud-storage-table-biglake
- Google Cloud BigQuery documentation: Create and set up a Cloud resource connection - https://docs.cloud.google.com/bigquery/docs/create-cloud-resource-connection
- Google Cloud BigQuery documentation: Introduction to BigLake external tables - https://docs.cloud.google.com/bigquery/docs/biglake-intro
- Google Cloud BigQuery documentation: Query Cloud Storage data in BigLake tables - https://docs.cloud.google.com/bigquery/docs/query-cloud-storage-using-biglake
- Google Cloud BigQuery documentation: External tables for Hive partitioned data - https://docs.cloud.google.com/bigquery/docs/hive-partitioned-queries
- Google Cloud BigQuery GoogleSQL reference: Data control language statements - https://cloud.google.com/bigquery/docs/reference/standard-sql/data-control-language
- Google Cloud SDK documentation: gcloud projects add-iam-policy-binding - https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding

## Issues Found
- The Hive-partitioned BigLake table example did not declare partition columns. Added `WITH PARTITION COLUMNS` for `year`, `month`, and `day` so the query using those fields is valid.
- The Hive-partitioned example used `max_staleness = INTERVAL 15 MINUTE`, below BigQuery's documented minimum for metadata cache staleness. Changed it to `INTERVAL 30 MINUTE`.
- The unified governance section used an invalid/outdated `bq update --grant_access --user:...:READER` pattern and an overbroad project-level `gcloud projects add-iam-policy-binding` example. Replaced them with current GoogleSQL `GRANT` examples for dataset-level and external-table-level BigQuery access.

## Review Notes
- The post is technically relevant and the corrected examples align with current BigQuery BigLake documentation.
- Users querying BigLake tables still need permission to create BigQuery jobs, such as `roles/bigquery.user`, in addition to table or dataset data access.
