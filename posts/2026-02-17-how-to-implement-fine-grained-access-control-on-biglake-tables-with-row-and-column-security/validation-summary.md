# Validation Summary: How to Use Fine-Grained Access Control on BigLake Tables

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Cloud BigLake
- BigQuery external tables
- BigQuery row-level security
- BigQuery column-level access control
- Data Catalog policy tags
- BigQuery Data Policy API
- BigQuery INFORMATION_SCHEMA
- Google Cloud CLI and bq CLI

## Sources Consulted
- BigLake external tables for Cloud Storage: https://cloud.google.com/bigquery/docs/create-cloud-storage-table-biglake
- BigQuery column-level access control: https://cloud.google.com/bigquery/docs/column-level-security
- BigQuery column-level access control overview: https://cloud.google.com/bigquery/docs/column-level-security-intro
- BigQuery row-level security overview: https://cloud.google.com/bigquery/docs/row-level-security-intro
- BigQuery row-level security usage: https://cloud.google.com/bigquery/docs/managing-row-level-security
- BigQuery row-level security with other features: https://cloud.google.com/bigquery/docs/using-row-level-security-with-features
- BigQuery GoogleSQL DDL reference: https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery INFORMATION_SCHEMA JOBS view: https://cloud.google.com/bigquery/docs/information-schema-jobs
- BigQuery connection management: https://cloud.google.com/bigquery/docs/working-with-connections
- gcloud Data Catalog policy tag IAM binding reference: https://cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/policy-tags/add-iam-policy-binding
- BigQuery Data Policy API reference: https://cloud.google.com/bigquery/docs/reference/bigquerydatapolicy/rest

## Issues Found
- Column-level access control behavior was described as returning `NULL` for unauthorized users. BigQuery column-level access control returns an access denied error when unauthorized users query protected columns; `NULL` substitution is a data masking behavior. Updated the explanation and examples.
- The taxonomy enforcement command used `gcloud data-catalog taxonomies set-iam-policy`, which changes IAM bindings and does not enable column-level access control enforcement. Replaced it with the documented console enforcement step and noted the BigQuery Data Policy API option using `COLUMN_LEVEL_SECURITY_POLICY`.
- The post used `ALTER TABLE ... ALTER COLUMN ... SET OPTIONS(policy_tags = ...)` to apply policy tags. BigQuery documentation does not support setting policy tags that way, and `ALTER COLUMN SET OPTIONS` is not supported for external tables. Replaced it with the documented `bq show --schema`, edit `policyTags.names`, and `bq update` workflow.
- The unauthorized-user query example claimed protected columns would return `NULL`. Updated the comment to state that the query fails with an access denied error.
- The row access policy listing example queried `INFORMATION_SCHEMA.TABLE_OPTIONS`, which does not list row access policy definitions. Updated it to query `INFORMATION_SCHEMA.ROW_ACCESS_POLICIES`.
- The access monitoring query mixed Cloud Audit Logs fields with `INFORMATION_SCHEMA.JOBS`, and referenced the repeated `referenced_tables` field without `UNNEST`. Replaced it with a valid `INFORMATION_SCHEMA.JOBS` query using `user_email`, `job_id`, `creation_time`, `error_result`, and `UNNEST(referenced_tables)`.
- Added a note to retrieve the BigQuery connection service account so it can be granted access to the Cloud Storage bucket, which is required for BigLake external tables.

## Review Notes
The post is now technically accurate for BigQuery column-level access control and row access policy concepts. A future improvement would be to add a separate optional data masking example if the intended user experience is returning `NULL` instead of failing unauthorized queries.
