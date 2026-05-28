# Validation Summary: How to Implement Column-Level Security with Data Catalog Policy Tags

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud BigQuery
- Data Catalog policy tags and taxonomies
- BigQuery column-level access control
- BigQuery data masking and data policies
- Terraform Google provider
- BigQuery `bq` CLI
- Google Cloud audit logs
- Python BigQuery client library

## Sources Consulted
- BigQuery column-level access control documentation: https://cloud.google.com/bigquery/docs/column-level-security
- BigQuery data masking documentation: https://cloud.google.com/bigquery/docs/column-data-masking
- BigQuery data masking introduction and role behavior: https://cloud.google.com/bigquery/docs/column-data-masking-intro
- Data Catalog Taxonomy REST resource documentation: https://cloud.google.com/data-catalog/docs/reference/rest/v1/projects.locations.taxonomies
- BigQuery Data Policy REST resource documentation: https://cloud.google.com/bigquery/docs/reference/bigquerydatapolicy/rest/v1/projects.locations.dataPolicies
- BigQuery table schema update documentation: https://cloud.google.com/bigquery/docs/managing-table-schemas
- BigQuery audit logs overview: https://cloud.google.com/bigquery/docs/reference/auditlogs
- Terraform Google provider documentation for `google_data_catalog_taxonomy`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/data_catalog_taxonomy
- Terraform Google provider documentation for BigQuery data policy IAM resources: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_datapolicy_data_policy_iam

## Issues Found
- The taxonomy creation command used `gcloud data-catalog taxonomies create`, but the documented current `gcloud data-catalog taxonomies` command group does not expose a GA `create` command. Replaced it with a Data Catalog REST API `curl` example that includes `activatedPolicyTypes`.
- The `bq update --schema '...'` example did not match the documented schema update pattern for existing tables. Updated it to write a JSON schema file and run `bq update PROJECT:DATASET.TABLE schema.json`.
- The IAM example said the analytics team could have parent PII access but not SSN, even though policy tag role evaluation inherits through parent tags. Changed the analytics grants to child tags and clarified that parent grants apply to all child tags.
- The inheritance section said to "remove the inheritance" for SSN, which is not how policy tag IAM inheritance works. Reworded it to say not to grant the parent tag when child tags need different permissions.
- The data masking section omitted the BigQuery Masked Reader role required to see masked data. Added a Terraform IAM binding for `roles/bigquerydatapolicy.maskedReader`.
- The `EMAIL_MASK` output example showed `j***@example.com`, but BigQuery's documented predefined email mask replaces the username with `XXXXX`. Updated the example output.
- The audit log filter only matched the older `bigquery_resource` resource type. Updated it to also include `bigquery_project`, which is used for BigQuery job methods in the newer audit metadata format.

## Review Notes
- Data Catalog documentation notes broader Data Catalog deprecation in favor of Dataplex Universal Catalog, but BigQuery column-level access control documentation still describes policy tags and the Data Catalog Fine-Grained Reader role for this feature.
