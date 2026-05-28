# Validation Summary: How to Create BigQuery Views and Authorized Views for Secure Data Sharing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery logical views
- BigQuery authorized views
- BigQuery table functions and authorized routines
- bq command-line tool
- gcloud CLI
- Terraform Google provider

## Sources Consulted
- BigQuery authorized views documentation: https://docs.cloud.google.com/bigquery/docs/authorized-views
- BigQuery create authorized views guide: https://docs.cloud.google.com/bigquery/docs/create-authorized-views
- BigQuery bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery IAM access control documentation: https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam
- BigQuery table functions documentation: https://docs.cloud.google.com/bigquery/docs/table-functions
- gcloud projects add-iam-policy-binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Terraform google_bigquery_dataset resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- Terraform google_bigquery_table resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_table

## Issues Found
- The `bq mk --view` example did not set `--use_legacy_sql=false`. The bq CLI can default view queries to legacy SQL, while the example uses GoogleSQL backtick table identifiers. Added the flag.
- The examples used `bq update --dataset --access_entry`, which is not documented in the current bq CLI reference. Replaced those snippets with the documented `bq show --format=prettyjson`, edit `access`, and `bq update --source` workflow.
- The permissions explanation said users only need dataset access to the view. BigQuery users also need permission to run query jobs in the project where queries run. Added that caveat and a `gcloud projects add-iam-policy-binding` example for `roles/bigquery.jobUser`.
- The table function example omitted the required parentheses around the query body. Updated the `CREATE TABLE FUNCTION` statement to use `AS (...)`.
- The table function section could imply that a table function alone lets users without source table access query restricted data. Added a note that it must be authorized as an authorized routine when users lack direct source access.
- The post did not mention the BigQuery location restriction for authorized views. Added a common pitfall noting that source and authorized view datasets must be in the same BigQuery location.
- The revoke example referred to reapplying with `bq update` but did not show the required `--source` flag. Added the concrete command.

## Review Notes
The Terraform example uses the documented `access.view` and `view.use_legacy_sql = false` fields. It is illustrative and assumes the referenced datasets, source tables, APIs, provider configuration, and IAM permissions exist.
