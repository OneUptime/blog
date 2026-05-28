# Validation Summary: How to Build a Terraform Module for BigQuery Datasets with Authorized Views

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- Terraform
- HashiCorp Google provider
- Data Catalog policy tags
- BigQuery authorized views
- BigQuery column-level access control
- bq command-line tool

## Sources Consulted
- BigQuery authorized views documentation: https://docs.cloud.google.com/bigquery/docs/authorized-views
- BigQuery column-level access control documentation: https://docs.cloud.google.com/bigquery/docs/column-level-security
- BigQuery column-level access control introduction: https://docs.cloud.google.com/bigquery/docs/column-level-security-intro
- BigQuery running queries documentation: https://docs.cloud.google.com/bigquery/docs/running-queries
- Terraform Google provider `google_bigquery_dataset` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- Terraform Google provider `google_bigquery_table` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_table
- Terraform Google provider `google_data_catalog_taxonomy` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_catalog_taxonomy
- Terraform Google provider `google_data_catalog_policy_tag_iam` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_catalog_policy_tag_iam
- Terraform type constraints documentation: https://developer.hashicorp.com/terraform/language/expressions/type-constraints

## Issues Found
- The module used `default_table_expiration_ms = 0` to mean no expiration, but the Terraform Google provider documents a one-hour minimum for that field. Changed the default to `null` and updated the description so Terraform omits the optional argument when no default expiration is desired.
- The `policy_tags.tf` snippet referenced `var.policy_tag_readers`, but the variables section did not define it. Added a `policy_tag_readers` map variable.
- The `google_bigquery_table` snippet used a dynamic `clustering` block, but the provider expects `clustering` as a list argument. Replaced it with a conditional `clustering` argument.
- The schema example omitted `country` and `created_at`, even though the later module example clustered by `country`, partitioned on `created_at`, and selected both fields in the view query. Added those fields to the schema example.
- The schema tagged `email` with a policy tag while the authorized view masked `email`. BigQuery column-level access control still applies through views, so users without Fine-Grained Reader access would not be able to query a view that references a protected column. Removed the email policy tag from the example and added a note explaining the permission behavior.
- The authorized view explanation said the view runs with the permissions of its dataset. Reworded it to match BigQuery's model: the source dataset grants read access to the view, and users need permissions on the view and its containing dataset.
- The module usage examples passed `description`, but the module variable is named `dataset_description`. Updated both module calls.
- The `bq query` testing commands did not explicitly select GoogleSQL, even though the examples use GoogleSQL syntax. Added `--use_legacy_sql=false`. Also added `--nouse_cache` so access-control tests are not affected by cached query results.

## Review Notes
- Terraform and the `bq` CLI were not installed in the local environment, so syntax and command validation were performed against official documentation rather than local execution.
- The post still uses inline dataset `access` blocks for authorized views, which the provider supports. For larger production deployments, `google_bigquery_dataset_access` can be easier to compose and order across modules.
