# Validation Summary: How to Implement Column-Level Security in BigQuery with Policy Tags

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery column-level access control
- Data Catalog policy tags and taxonomies
- BigQuery data policies and dynamic data masking
- Google Cloud CLI
- Python Google Cloud client libraries
- GoogleSQL

## Sources Consulted
- BigQuery: Restrict access with column-level access control - https://cloud.google.com/bigquery/docs/column-level-security
- BigQuery: Introduction to column-level access control - https://cloud.google.com/bigquery/docs/column-level-security-intro
- BigQuery: Impact on writes from column-level access control - https://cloud.google.com/bigquery/docs/column-level-security-writes
- BigQuery: Mask column data - https://cloud.google.com/bigquery/docs/column-data-masking
- BigQuery: Introduction to data masking - https://cloud.google.com/bigquery/docs/column-data-masking-intro
- BigQuery GoogleSQL DDL reference - https://cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- Google Cloud SDK: gcloud data-catalog taxonomies policy-tags set-iam-policy - https://cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/policy-tags/set-iam-policy
- Data Catalog Python client: PolicyTagManagerClient - https://cloud.google.com/python/docs/reference/datacatalog/latest/google.cloud.datacatalog_v1.services.policy_tag_manager.PolicyTagManagerClient
- BigQuery Python client: SchemaField and PolicyTagList - https://cloud.google.com/python/docs/reference/bigquery/latest/google.cloud.bigquery.schema.SchemaField

## Issues Found
- The post showed a `gcloud data-catalog taxonomies create` command, but the GA `gcloud data-catalog taxonomies` command group does not provide a `create` command. I removed that command and kept the supported Python client example for taxonomy creation.
- The post claimed policy-tag access controls whether users can "read or write" tagged columns. BigQuery's Fine-Grained Reader role is required for reading protected column data; write behavior depends on the write operation. I changed the explanation to focus on query-time read access.
- The post showed `CREATE TABLE` DDL with `OPTIONS(policy_tags=...)`. BigQuery documentation states that policy tags cannot be specified with `CREATE TABLE` DDL. I replaced the example with a supported JSON schema plus `bq mk --table`.
- The post did not explicitly mention the required enforcement step. I added a note to turn on **Enforce access control** in the taxonomy or create a BigQuery data policy with `dataPolicyType` set to `COLUMN_LEVEL_SECURITY_POLICY`.
- The data masking section suggested using authorized views as an alternative that allows masked access. BigQuery column-level security still applies through authorized views. I corrected the section to recommend native dynamic data masking and clarified the limitation of view-based masking.

## Review Notes
- The Python BigQuery schema update example is technically valid for simple schemas, but for production tables it is safer to preserve all existing `SchemaField` attributes when reconstructing fields.
- The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference documentation.
