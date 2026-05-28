# Validation Summary: How to Configure dbt Cloud with BigQuery Service Account Authentication

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- dbt Cloud
- dbt Core
- BigQuery
- Google Cloud IAM
- Google Cloud CLI
- GitHub integration
- CI/CD
- dbt Cloud Administrative API
- dbt Cloud webhooks

## Sources Consulted
- dbt Developer Hub: Connect BigQuery - https://docs.getdbt.com/docs/platform/connect-data-platform/connect-bigquery
- dbt Developer Hub: Continuous integration jobs - https://docs.getdbt.com/docs/deploy/ci-jobs
- dbt Developer Hub: Defer - https://docs.getdbt.com/reference/node-selection/defer
- dbt Developer Hub: Node selector methods - https://docs.getdbt.com/reference/node-selection/methods
- dbt Developer Hub: schema config - https://docs.getdbt.com/reference/resource-configs/schema
- dbt Developer Hub: severity config - https://docs.getdbt.com/reference/resource-configs/severity
- dbt Developer Hub: store_failures config - https://docs.getdbt.com/reference/resource-configs/store_failures
- dbt Developer Hub: About dbt versions - https://docs.getdbt.com/docs/dbt-versions
- dbt Developer Hub: Connect to GitHub - https://docs.getdbt.com/docs/platform/git/connect-github
- dbt Developer Hub: Administrative API - https://docs.getdbt.com/docs/dbt-apis/admin-api
- dbt Developer Hub: API v2 reference - https://docs.getdbt.com/dbt-cloud/api-v2
- Google Cloud: BigQuery IAM roles and permissions - https://cloud.google.com/bigquery/docs/access-control
- Google Cloud: Writing query results required permissions - https://cloud.google.com/bigquery/docs/writing-results
- Google Cloud CLI reference: gcloud iam service-accounts create - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/create
- Google Cloud CLI reference: gcloud projects add-iam-policy-binding - https://cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding
- Google Cloud CLI reference: gcloud iam service-accounts keys create - https://cloud.google.com/sdk/gcloud/reference/iam/service-accounts/keys/create

## Issues Found
- The BigQuery IAM section incorrectly described BigQuery Data Owner as the optional role needed to create new datasets. dbt's BigQuery guidance lists BigQuery User as the role that supports job execution and dataset creation, while BigQuery Job User is the narrower role for job execution only. I changed the role guidance and command comments accordingly.
- The role list included both BigQuery User and BigQuery Job User as part of the minimum set. Since BigQuery User already covers job creation for the typical setup, I removed BigQuery Job User from the default command block and documented it as the narrower alternative when datasets already exist.
- The environment examples pinned `dbt_version: 1.7.0`, which is end-of-life as of the current dbt version support table. I updated the examples to `1.11.0`, a currently supported dbt Core version.
- The `dbt_project.yml` example used the older `tests:` project config key. Current dbt documentation uses `data_tests:` for project-level data test configuration, so I updated the key.
- The BigQuery connection example labeled `timeout_seconds` as a current query timeout field. Current dbt Cloud BigQuery docs describe Timeout as deprecated and retained for backwards compatibility, so I changed the comment to identify it as a legacy setting.

## Review Notes
The post remains technically relevant and accurate after the corrections. dbt Cloud now also offers BigQuery Workload Identity Federation for deployment environments on eligible plans, which may be worth covering in a future update, but the service JSON flow described here is still documented and supported.
