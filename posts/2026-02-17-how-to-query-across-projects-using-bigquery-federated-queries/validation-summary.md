# Validation Summary: How to Query Across Projects Using BigQuery Federated Queries

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google BigQuery
- BigQuery federated queries
- BigQuery cross-project table references
- BigQuery Connection API
- Cloud SQL for MySQL and PostgreSQL
- Cloud Spanner
- Google Cloud IAM
- bq CLI
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- BigQuery federated queries introduction: https://docs.cloud.google.com/bigquery/docs/federated-queries-intro
- BigQuery federated query functions / `EXTERNAL_QUERY`: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/federated_query_functions
- Cloud SQL federated queries: https://docs.cloud.google.com/bigquery/docs/cloud-sql-federated-queries
- Connect BigQuery to Cloud SQL: https://docs.cloud.google.com/bigquery/docs/connect-to-sql
- Spanner federated queries: https://docs.cloud.google.com/bigquery/docs/spanner-federated-queries
- Connect BigQuery to Spanner: https://docs.cloud.google.com/bigquery/docs/connect-to-spanner
- Manage BigQuery connections: https://docs.cloud.google.com/bigquery/docs/working-with-connections
- BigQuery IAM and dataset access controls: https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Google Cloud SDK `gcloud projects add-iam-policy-binding`: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Terraform `google_bigquery_connection` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_connection

## Issues Found
- Cross-project BigQuery table references were described as federated queries. Updated the wording to distinguish standard BigQuery cross-project queries from `EXTERNAL_QUERY` federated queries to Cloud SQL and Spanner.
- Cross-project access requirements omitted the need to create query jobs in the billing/query project. Added that permission requirement.
- The project-level IAM example used a dataset-scoped IAM condition that was not appropriate as a simple dataset access example. Changed the command to a project-wide `roles/bigquery.dataViewer` grant and replaced the dataset-level example with the documented BigQuery `GRANT` syntax.
- Cloud SQL connection setup omitted the required BigQuery Connection Service Agent access to Cloud SQL. Added the `roles/cloudsql.client` grant.
- Connection management examples used short connection IDs where the current `bq show`, `bq update`, and `bq rm` docs require fully qualified connection IDs. Updated those examples.
- The `bq update --connection` example omitted the connection type and properties required by the documented Cloud SQL update command. Added them.
- Federated query billing incorrectly said the project owning the connection pays for external query execution. Replaced it with the documented BigQuery on-demand/editions pricing behavior and noted external-system charges.
- Cloud SQL troubleshooting referred to BigQuery IP ranges. Updated it to the documented Cloud SQL Client role and private path requirements.

## Review Notes
The local environment did not have the `bq` CLI installed, so CLI behavior was verified against current official Google Cloud documentation rather than local `--help` output.
