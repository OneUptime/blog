# Validation Summary: How to Configure Idle Timeout and Auto-Stop Policies to Reduce Google Cloud

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Workstations
- Google Cloud CLI
- Cloud Logging and Cloud Audit Logs
- Cloud Billing budgets
- BigQuery billing export
- Organization Policy custom constraints
- Terraform Google provider
- tmux

## Sources Consulted
- Google Cloud Workstations API reference: https://docs.cloud.google.com/workstations/docs/reference/rpc/google.cloud.workstations.v1
- gcloud workstations configs create reference: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/create
- gcloud workstations configs update reference: https://docs.cloud.google.com/sdk/gcloud/reference/workstations/configs/update
- Cloud Workstations audit logging: https://docs.cloud.google.com/workstations/docs/audit-logging
- Cloud Workstations platform logging: https://docs.cloud.google.com/workstations/docs/platform-logging
- Cloud Workstations pricing: https://cloud.google.com/workstations/pricing
- Cloud Workstations custom constraints: https://docs.cloud.google.com/workstations/docs/custom-constraints
- Cloud Billing budgets gcloud reference: https://docs.cloud.google.com/sdk/gcloud/reference/billing/budgets/create
- Cloud Billing BigQuery export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables
- Terraform Google provider workstation config resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/workstations_workstation_config

## Issues Found
- The logging example claimed to query workstation uptime and used an unsupported-looking workstation resource filter for audit logs. I changed it to query Cloud Audit Logs for start events using `protoPayload.serviceName` and `protoPayload.methodName`, and added the documented Cloud Workstations platform log for shutdown events.
- The billing budget wording said the command created a budget specifically for Cloud Workstations, but the command was scoped only to the billing account. I changed the wording to match what the command actually does.
- The BigQuery billing export query referenced repeated `labels.value` without unnesting labels and attempted to sum `usage.amount` as hours across billing SKUs. I updated it to use the detailed export table, `UNNEST(labels)`, and report cost by a `workstation_name` label.
- The organization policy section implied a policy file alone could contain workstation timeout constraints. I replaced it with a custom Organization Policy constraint example using supported Cloud Workstations `WorkstationConfig` fields, followed by policy enforcement.
- The cost example used `$0.268/hour` for an `e2-standard-8` Cloud Workstations instance. Current official Cloud Workstations pricing for `e2-standard-8` in `us-central1` is about `$0.67/hour` for compute and management before Persistent Disk and control plane costs, so I updated the calculations.

## Review Notes
The `gcloud workstations configs create/update` flags for `--idle-timeout`, `--running-timeout`, `--machine-type`, `--pd-disk-size`, and `--pd-disk-type` match the current Google Cloud CLI reference. The Terraform `idle_timeout` and `running_timeout` fields are also current in the Google provider.
