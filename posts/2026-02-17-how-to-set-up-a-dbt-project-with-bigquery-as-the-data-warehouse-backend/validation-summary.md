# Validation Summary: How to Set Up a dbt Project with BigQuery as the Data Warehouse Backend

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- dbt Core
- dbt-bigquery
- Google BigQuery
- Google Cloud SDK
- Google Cloud IAM
- YAML
- SQL

## Sources Consulted
- dbt BigQuery setup documentation: https://docs.getdbt.com/docs/local/connect-data-platform/bigquery-setup
- dbt init command documentation: https://docs.getdbt.com/reference/commands/init
- dbt node selection graph operators: https://docs.getdbt.com/reference/node-selection/graph-operators
- dbt node selector methods: https://docs.getdbt.com/reference/node-selection/methods
- dbt project configuration reference: https://docs.getdbt.com/reference/dbt_project.yml
- Google Cloud BigQuery IAM roles and permissions: https://cloud.google.com/bigquery/docs/access-control
- Google Cloud SDK `gcloud projects add-iam-policy-binding` reference: https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud SDK `gcloud iam service-accounts create` reference: https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create

## Issues Found
- The authentication section described service account key files as the recommended local development approach. dbt's current BigQuery setup documentation recommends OAuth for local development and service account authentication for scheduled/server runs, so the wording was corrected.
- The BigQuery profile examples used older `timeout_seconds` and `retries` fields. dbt's current BigQuery adapter documentation identifies the current names as `job_execution_timeout_seconds` and `job_retries`, so both profile examples were updated.
- The command `dbt run --select customer_orders+` was described as running a model and its dependencies, but the trailing plus selects descendants. The command was changed to `dbt run --select +customer_orders` and the comment now says "upstream dependencies."

## Review Notes
The tutorial is technically relevant and accurate after the targeted fixes. Service account key files remain supported, but OAuth or keyless service account patterns are preferable for reducing local key management risk.
