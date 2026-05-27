# Validation Summary: How to Set Up BigQuery Scheduled Queries for Automated Reporting

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud BigQuery
- BigQuery scheduled queries
- BigQuery Data Transfer Service
- bq command-line tool
- Terraform Google provider
- GoogleSQL
- Pub/Sub notifications
- BigQuery INFORMATION_SCHEMA

## Sources Consulted
- BigQuery scheduled queries documentation: https://docs.cloud.google.com/bigquery/docs/scheduling-queries
- BigQuery Data Transfer Service transfer management documentation: https://docs.cloud.google.com/bigquery/docs/working-with-transfers
- bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- BigQuery INFORMATION_SCHEMA JOBS view documentation: https://docs.cloud.google.com/bigquery/docs/information-schema-jobs
- Terraform `google_bigquery_data_transfer_config` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/bigquery_data_transfer_config
- BigQuery Data Transfer API `TransferConfig` resource documentation: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs

## Issues Found
- The post stated that scheduled queries support email notifications on success or failure. Google Cloud documents email notifications for transfer run failures, with Pub/Sub notifications available when runs finish. Updated the claim accordingly.
- The schedule syntax section said you can specify a time zone so the schedule follows local time. Google Cloud documents that console selections are converted from local time to UTC, while API-style schedule times are UTC. Updated the explanation to reflect that behavior.
- The write disposition section listed `WRITE_EMPTY` as a scheduled query option. The scheduled query documentation lists `WRITE_TRUNCATE` and `WRITE_APPEND` for the `write_disposition` parameter. Removed `WRITE_EMPTY`.
- The notification example used a `bq update` flag for Pub/Sub notifications. Google Cloud documentation states that notifications cannot be configured with the bq command-line tool. Replaced the command with the Terraform `email_preferences` and `notification_pubsub_topic` fields and added a note about the bq limitation.
- The INFORMATION_SCHEMA monitoring query selected `run_time` and `error_status`, which are not columns in the `JOBS_BY_PROJECT` view. Updated the query to use `creation_time` and `error_result.message`.

## Review Notes
The SQL examples use GoogleSQL scheduled-query parameters correctly. The bq scheduled-query creation example and Terraform resource fields match current documentation. The local environment did not have the `bq` CLI installed, so CLI verification was performed against official Google Cloud documentation rather than local `--help` output.
