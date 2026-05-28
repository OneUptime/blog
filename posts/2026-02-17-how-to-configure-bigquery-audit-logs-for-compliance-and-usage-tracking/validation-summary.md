# Validation Summary: How to Configure BigQuery Audit Logs for Compliance and Usage Tracking

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud
- BigQuery audit logs
- Cloud Audit Logs
- Cloud Logging log sinks
- Google Cloud CLI
- bq command-line tool
- GoogleSQL

## Sources Consulted
- Google Cloud: BigQuery audit logs overview, https://cloud.google.com/bigquery/docs/reference/auditlogs/
- Google Cloud: Introduction to audit logs in BigQuery, https://cloud.google.com/bigquery/docs/introduction-audit-workloads
- Google Cloud: Enable Data Access audit logs, https://cloud.google.com/logging/docs/audit/configure-data-access
- Google Cloud: Route logs to supported destinations, https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK: gcloud logging sinks create, https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud: BigQuery GoogleSQL JSON functions, https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Google Cloud: bq command-line tool reference, https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud: Control access to resources with IAM in BigQuery, https://cloud.google.com/bigquery/docs/control-access-to-resources-iam

## Issues Found
- The post incorrectly said BigQuery Data Access logs are not enabled by default and must be explicitly enabled. Google Cloud documentation states that BigQuery is the exception: BigQuery Data Access audit logs are enabled by default and cannot be disabled. I changed the section to describe checking audit configuration and enabling Data Access logs for other services if needed.
- The IAM audit configuration example targeted `bigquery.googleapis.com` as if BigQuery needed opt-in Data Access logging. I changed the example to `allServices` and framed it as an opt-in configuration for services that need it.
- The sink filter used monitored resource types and mixed older and newer BigQuery audit log formats. I changed it to filter for `protoPayload.metadata."@type"="type.googleapis.com/google.cloud.audit.BigQueryAuditMetadata"`, which matches Google's current BigQuery audit log export guidance.
- The exported-log SQL examples used the older `protopayload_auditlog.servicedata_v1_bigquery` / `jobservice.jobcompleted` schema. I updated the examples to use `protopayload_auditlog.metadataJson`, `JSON_VALUE`, `JSON_VALUE_ARRAY`, `jobChange.after = 'DONE'`, and `jobConfig.type = 'QUERY'` from the current `BigQueryAuditMetadata` format.
- The dataset permission command used `bq add-iam-policy-binding` on a dataset, but the bq reference states that command does not support datasets. I replaced it with the documented `gcloud projects add-iam-policy-binding` flow for granting the sink writer identity `roles/bigquery.dataEditor` on the destination project.
- The schema-change query omitted BigQuery `PatchTable`, `UpdateDataset`, and `PatchDataset` method names. I added those method names to cover current BigQuery metadata update operations.
- The retention command comment implied it updates retention for all existing audit log tables. I clarified that `--default_table_expiration` sets the default retention period for new tables in the dataset.

## Review Notes
The SQL examples now target partitioned exported log tables in the current BigQuery audit metadata format. I could not run a live BigQuery dry run because the local environment does not have authenticated `gcloud` or `bq` tooling available.
