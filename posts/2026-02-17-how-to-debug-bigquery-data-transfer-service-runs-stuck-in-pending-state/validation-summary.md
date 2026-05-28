# Validation Summary: How to Debug BigQuery Data Transfer Service Runs Stuck in Pending State

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud
- BigQuery
- BigQuery Data Transfer Service
- bq command-line tool
- gcloud CLI
- Cloud Logging
- Cloud Monitoring
- BigQuery Reservations
- INFORMATION_SCHEMA

## Sources Consulted
- BigQuery bq command-line tool reference: https://docs.cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Manage BigQuery Data Transfer Service transfers: https://docs.cloud.google.com/bigquery/docs/working-with-transfers
- BigQuery Data Transfer Service REST API reference: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/rest
- BigQuery Data Transfer Service TransferConfig REST resource: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs
- BigQuery Data Transfer Service runs REST resource: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/projects.locations.transferConfigs.runs
- BigQuery Data Transfer Service TransferState reference: https://docs.cloud.google.com/bigquery/docs/reference/datatransfer/rest/v1/TransferState
- Monitor and view logs for BigQuery Data Transfer Service: https://docs.cloud.google.com/bigquery/docs/dts-monitor
- Use service accounts with BigQuery Data Transfer Service: https://docs.cloud.google.com/bigquery/docs/use-service-accounts
- BigQuery Data Transfer Service introduction and reservation slot behavior: https://docs.cloud.google.com/bigquery/docs/dts-introduction
- BigQuery quotas and limits: https://docs.cloud.google.com/bigquery/quotas
- Cloud Monitoring Google Cloud metrics reference for BigQuery Data Transfer Service: https://cloud.google.com/monitoring/api/metrics_gcp_a_b
- gcloud monitoring policies create reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- Removed the invalid combined `--message_type=messageTypes:ERROR,WARNING` example from the `bq ls --transfer_log` command. Listing all transfer log messages is valid and avoids an unsupported combined enum value.
- Changed the Cloud Logging output field from `textPayload` to `jsonPayload.message`, matching the documented BigQuery Data Transfer Service log format.
- Replaced the overly broad `roles/bigquery.admin` "minimum" service account guidance with the documented destination dataset permissions, `bigquery.datasets.get` and `bigquery.datasets.update`, plus source-specific access.
- Replaced the non-existent transfer run `:cancel` REST endpoint with the documented `DELETE` request for a specific transfer run.
- Clarified quota guidance so it refers to underlying BigQuery jobs and documented load/copy job quotas rather than an unsupported generic concurrent-transfer quota claim.
- Corrected the reservation examples to use documented `bq` global flags, and clarified that DTS-triggered query and load jobs can use `QUERY` and `PIPELINE` reservations while dataset copy jobs do not use reservation slots.
- Replaced the unsupported `bq update --disabled=true` command with a documented REST `PATCH` request using `updateMask=disabled`.
- Updated the flowchart label from "Cancel stuck run" to "Delete stuck run" to match the available API operation.
- Corrected the Monitoring alert metric from the non-existent `bigquerydatatransfer.googleapis.com/transfer_run_count` to `bigquerydatatransfer.googleapis.com/transfer_config/active_runs`, and added the required threshold predicate.

## Review Notes
The local environment did not have `bq` or `gcloud` installed, so CLI verification was performed against official Google Cloud CLI and BigQuery documentation rather than local `--help` output.
