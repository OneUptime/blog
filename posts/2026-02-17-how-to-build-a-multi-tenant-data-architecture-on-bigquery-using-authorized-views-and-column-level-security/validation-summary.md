# Validation Summary: How to Build a Multi-Tenant Data Architecture on BigQuery Using Authorized Views

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google BigQuery
- BigQuery authorized views
- BigQuery row access policies
- BigQuery column-level access control
- Data Catalog policy tags
- BigQuery IAM and dataset access controls
- GoogleSQL
- bq command-line tool
- Google Cloud CLI
- Python BigQuery client library

## Sources Consulted
- BigQuery authorized views: https://docs.cloud.google.com/bigquery/docs/authorized-views
- BigQuery column-level access control: https://docs.cloud.google.com/bigquery/docs/column-level-security
- BigQuery GoogleSQL DDL reference: https://docs.cloud.google.com/bigquery/docs/reference/standard-sql/data-definition-language
- BigQuery bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery IAM resource access controls: https://docs.cloud.google.com/bigquery/docs/control-access-to-resources-iam
- BigQuery row-level security: https://docs.cloud.google.com/bigquery/docs/managing-row-level-security
- gcloud Data Catalog taxonomies reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies
- gcloud Data Catalog policy-tag IAM binding reference: https://docs.cloud.google.com/sdk/gcloud/reference/data-catalog/taxonomies/policy-tags/add-iam-policy-binding

## Issues Found
- The `bq update --authorized_view=...` examples used an unsupported flag. Replaced them with the documented `bq show --format=prettyjson`, edit dataset `access`, and `bq update --source=...` workflow.
- The `bq add-iam-policy-binding` examples attempted to grant access to datasets, but the bq reference states that command is for tables/views and does not support datasets. Replaced them with BigQuery SQL `GRANT roles/bigquery.dataViewer ON SCHEMA ...`.
- The post omitted the requirement for users to have `bigquery.jobs.create` to run queries. Added a note that users need `roles/bigquery.jobUser` or equivalent on the job-running project.
- The Data Catalog taxonomy and policy tag creation commands used non-current GA `gcloud ... create` commands. Replaced them with the documented console workflow for creating taxonomies and policy tags.
- The policy-tag application example used `ALTER COLUMN SET OPTIONS(policy_tags=...)`, but BigQuery documentation describes applying policy tags by updating the table schema through console, bq schema JSON, or API. Replaced the SQL snippet with the documented `bq show --schema`, edit `policyTags.names`, and `bq update` workflow.
- The policy-tag IAM commands used a full resource name without the required positional/flag form documented by `gcloud`. Updated the examples to pass the policy tag ID with `--location` and `--taxonomy`.
- The column-level security section did not mention enforcement. Added a short note that column-level access control must be enforced for the taxonomy.
- The row access policy section did not clarify that users still need read access to the table or dataset. Added a note explaining that row access policies filter rows after read access is granted.
- The onboarding Python example attempted to use `client.get_iam_policy(dataset)` and `client.set_iam_policy(dataset, policy)` for dataset access. Replaced it with the documented `dataset.access_entries` and `client.update_dataset(..., ["access_entries"])` pattern.
- The performance section overstated clustering behavior by saying clustering ensures only relevant tenant data is scanned. Reworded it to say clustering helps BigQuery prune clustered storage blocks when the tenant filter is selective.

## Review Notes
The local environment did not have `bq`, `gcloud`, or the Google Cloud BigQuery Python package installed, so CLI and Python validation was performed against official Google Cloud documentation rather than local command execution.
