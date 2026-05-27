# Validation Summary: How to Set Up BigQuery External Tables over Cloud Storage Files

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery external tables
- Cloud Storage
- BigLake tables
- BigQuery SQL DDL
- bq command-line tool
- Terraform Google provider
- Google Cloud IAM

## Sources Consulted
- BigQuery documentation: Create Cloud Storage external tables: https://cloud.google.com/bigquery/docs/external-data-cloud-storage
- BigQuery documentation: External tables for Hive partitioned data: https://cloud.google.com/bigquery/docs/hive-partitioned-queries
- BigQuery documentation: Introduction to external tables: https://cloud.google.com/bigquery/docs/external-tables
- BigQuery documentation: Create BigLake external tables for Cloud Storage: https://cloud.google.com/bigquery/docs/create-cloud-storage-table-biglake
- BigQuery documentation: Create and set up a Cloud resource connection: https://cloud.google.com/bigquery/docs/create-cloud-resource-connection
- BigQuery documentation: bq command-line tool reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery documentation: Using cached query results: https://cloud.google.com/bigquery/docs/cached-results
- Terraform Registry: google_bigquery_table resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_table
- Cloud Storage documentation: IAM roles for Cloud Storage: https://cloud.google.com/storage/docs/access-control/iam-roles
- Cloud Storage documentation: Set and manage IAM policies on buckets: https://cloud.google.com/storage/docs/access-control/using-iam-permissions

## Issues Found
- The Terraform CSV external table example placed the schema at the top level. For non-connection external tables, the provider expects the schema inside `external_data_configuration`; moved the `schema` block accordingly.
- The Terraform Hive partitioning example used `gs://my-data-bucket/orders/*.parquet`, which did not clearly represent Hive-style partition directories. Updated it to `gs://my-data-bucket/orders/*` to align with the configured Hive partition URI prefix.
- The permissions section omitted `storage.buckets.get` and the need for `storage.objects.list` when wildcard URIs are used. Added both permissions.
- The IAM example granted access to a BigQuery service agent address, which is not the correct general identity for non-BigLake external table queries. Replaced it with examples for the querying service account and the BigLake connection service account using `roles/storage.objectViewer`.
- The "Not found: Table" troubleshooting item attributed the error to Cloud Storage URI accessibility. Updated it to distinguish table lookup problems from Cloud Storage permission errors that normally appear during query execution.

## Review Notes
The bq CLI inline external table definitions, JSON table definition format, SQL `CREATE EXTERNAL TABLE` examples, Hive partitioning options, BigLake connection syntax, and `ALTER TABLE ... SET OPTIONS (uris = ...)` example are consistent with current BigQuery documentation. The local environment did not have `bq` or `terraform` installed, so command behavior was validated against official documentation rather than local CLI help.
