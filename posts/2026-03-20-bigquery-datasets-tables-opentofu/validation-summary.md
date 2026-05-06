# Validation Summary: How to Create BigQuery Datasets and Tables with OpenTofu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- OpenTofu
- HCL
- HashiCorp Google provider
- Google Cloud BigQuery
- Google Data Catalog policy tags
- GoogleSQL

## Sources Consulted
- HashiCorp Google provider docs for `google_bigquery_table`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_table
- HashiCorp Google provider docs for `google_bigquery_dataset`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_dataset
- HashiCorp Google provider docs for `google_data_catalog_taxonomy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_catalog_taxonomy
- HashiCorp Google provider docs for `google_data_catalog_policy_tag`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_catalog_policy_tag
- BigQuery partition filter requirements: https://cloud.google.com/bigquery/docs/managing-partitioned-tables
- BigQuery partition pruning and required partition filters in views: https://cloud.google.com/bigquery/docs/querying-partitioned-tables
- BigQuery clustered tables and clustering column order: https://cloud.google.com/bigquery/docs/clustered-tables
- BigQuery column-level access control overview: https://cloud.google.com/bigquery/docs/column-level-security-intro
- BigQuery column-level access control usage: https://cloud.google.com/bigquery/docs/column-level-security
- BigQuery JSON data type: https://cloud.google.com/bigquery/docs/json-data
- BigQuery datasets overview: https://cloud.google.com/bigquery/docs/datasets-intro
- BigQuery tables REST schema reference: https://cloud.google.com/bigquery/docs/reference/rest/v2/tables

## Issues Found
- The `google_bigquery_table` example placed `require_partition_filter` inside the `time_partitioning` block. In the current Google provider schema, `require_partition_filter` is a top-level table argument, so I moved it out of the nested block.
- The policy-tag taxonomy used `var.region`, which can diverge from the BigQuery dataset location. BigQuery column-level access control requires the taxonomy and table to be in the same location, so I changed the example to derive the taxonomy location from `var.location`.
- The post described the access configuration as IAM bindings / IAM access, but the example uses dataset `access` controls on `google_bigquery_dataset`. I corrected the wording to match the implementation shown.
- The provider version constraint was pinned to the older `~> 5.10` line. I updated it to `~> 7.0` so the tutorial reflects the current Google provider major line while keeping the same resource syntax.
- The clustering best-practice sentence implied ordering relative to the partition column. I reworded it to match BigQuery guidance that clustering column order itself determines precedence.

## Review Notes
- The dataset `access` example correctly uses legacy dataset roles like `OWNER` and `READER`, which avoids the permanent-diff issue called out in the Google provider docs for equivalent predefined roles.
- The view example remains compatible with the partition-filter guidance because required partition filters also apply through views that reference a partitioned table.
