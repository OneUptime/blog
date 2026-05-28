# Validation Summary: Use Row-Level Security Policies in BigQuery with Column-Level Access Controls

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google BigQuery
- BigQuery row-level security
- BigQuery column-level access control
- Data Catalog policy tags
- Google Cloud CLI
- BigQuery SQL

## Sources Consulted
- BigQuery row-level security introduction: https://docs.cloud.google.com/bigquery/docs/row-level-security-intro
- BigQuery row-level security management: https://docs.cloud.google.com/bigquery/docs/managing-row-level-security
- BigQuery row-level security best practices: https://docs.cloud.google.com/bigquery/docs/best-practices-row-level-security
- BigQuery column-level access control: https://docs.cloud.google.com/bigquery/docs/column-level-security
- BigQuery GoogleSQL DDL reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- Google Cloud SDK policy tag IAM command reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/policy-tags/add-iam-policy-binding
- Data Catalog taxonomy creation sample: https://docs.cloud.google.com/data-catalog/docs/samples/data-catalog-ptm-create-taxonomy

## Issues Found
- The post said the table owner always has full access regardless of row access policies. Google documentation says users who previously had full access must be added to a `TRUE` filter policy to maintain unfiltered access, so the policy evaluation notes were corrected.
- The taxonomy creation command did not activate fine-grained access control. I added `--activated-policy-types=FINE_GRAINED_ACCESS_CONTROL` so the taxonomy is suitable for BigQuery column-level access control.
- The policy tag application example used unsupported BigQuery SQL DDL with `ALTER COLUMN ... SET OPTIONS (policy_tags = ...)`. Google documentation says policy tags are set by updating the table schema with the console, `bq`, or API, so I replaced the SQL with a JSON schema update and `bq update`.
- The policy tag IAM examples mixed short IDs and `--taxonomy` flags. I changed them to pass the full policy tag resource name as the positional argument, matching the `gcloud` command reference.
- The combined RLS and CLS example implied `SELECT *` silently hides unauthorized columns. BigQuery returns an access denied error when a query selects a restricted column, so I changed the example to query allowed columns explicitly and noted the actual `SELECT *` behavior.
- The testing notes referenced a "BigQuery Data Policy Troubleshooter." I changed this to IAM Troubleshooter for policy tag permissions, which is what the Google documentation references.
- The performance section said RLS filters are pushed down so only matching rows are read and recommended clustering on the RLS filter column. Google best practices state row access policy filters do not participate in query pruning for partitioned and clustered tables, so I corrected the performance guidance.

## Review Notes
The tutorial is technically relevant and valid after the corrections. The examples still use placeholder project, taxonomy, and policy tag IDs; readers must replace them with their own resource names.
