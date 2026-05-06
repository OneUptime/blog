# Validation Summary: How to Configure BigQuery Data Transfer Service with OpenTofu

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud BigQuery
- BigQuery Data Transfer Service
- Google Ads transfer connector
- Scheduled queries
- OpenTofu / HCL
- Google Cloud IAM

## Sources Consulted
- Google Cloud: Enable the BigQuery Data Transfer Service - https://cloud.google.com/bigquery/docs/enable-transfer-service
- Google Cloud: Load Google Ads data into BigQuery - https://cloud.google.com/bigquery/docs/google-ads-transfer
- Google Cloud: Scheduling queries - https://cloud.google.com/bigquery/docs/scheduling-queries
- Google Cloud: Use service accounts with BigQuery Data Transfer Service - https://cloud.google.com/bigquery/docs/use-service-accounts
- Google Cloud: BigQuery IAM roles and permissions - https://cloud.google.com/bigquery/docs/access-control
- Google Cloud: BigQuery Data Transfer API REST resource for transfer configs - https://cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs
- Google Cloud: Scheduling jobs with cron.yaml - https://cloud.google.com/appengine/docs/standard/scheduling-jobs-with-cron-yaml
- HashiCorp Google provider docs source: `google_bigquery_data_transfer_config` - https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/bigquery_data_transfer_config.html.markdown

## Issues Found
- The post only enabled `bigquerydatatransfer.googleapis.com`. BigQuery itself also needs to be enabled for the dataset and transfer examples to work, so I added `bigquery.googleapis.com` and explicit dependencies.
- The Google Ads example said `every 24 hours` but described the run as happening at midnight UTC. I changed the schedule to `every day 00:00` so the configuration matches the explanation.
- The Google Ads example used `run_mode = "INCREMENTAL"`, but current Google Cloud documentation says Google Ads transfers do not support incremental transfers. I removed that parameter and replaced it with the supported `data_refresh_window_days = 7`.
- The Google Ads example used outdated report-style names in `table_filter`. Current Google Cloud examples use table names such as `Campaign` and `AdGroup`, so I removed the invalid filter instead of leaving a misleading example.
- The Google Ads customer ID comment said hyphens should be removed. Current Google Cloud examples allow digits and hyphens, so I corrected the comment.
- The scheduled query used a service account but the service account only had `roles/bigquery.dataOwner`. Scheduled queries also need `bigquery.jobs.create`, so I added `roles/bigquery.jobUser` and made the scheduled query depend on that binding.
- The scheduled query filtered for the previous day but named output tables with the current run date. I changed the destination table template to use a 24-hour offset so the table suffix matches the data date.
- The post did not mention that a service account used for Google Ads transfers must already be authorized in Google Ads. I added that note directly in the code comment.

## Review Notes
- The examples do not pin a Google provider version. The syntax was checked against the current provider documentation, but exact behavior can still vary across provider releases.
