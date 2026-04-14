# Validation Summary: How to Use Dapr with GCP Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (distributed application runtime)
- Google Cloud Logging (formerly Stackdriver Logging)
- Google Kubernetes Engine (GKE)
- Google Cloud Monitoring (alerting policies)
- BigQuery (log analysis)
- Helm (Dapr installation/configuration)
- gcloud CLI

## Sources Consulted
- Dapr Logging documentation: https://docs.dapr.io/operations/observability/logging/logs/
- Dapr arguments and annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Helm chart values.yaml: https://github.com/dapr/dapr/blob/master/charts/dapr/values.yaml
- gcloud logging metrics create reference: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- gcloud alpha monitoring policies create reference: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- gcloud logging sinks create reference: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Cloud Logging BigQuery export documentation: https://cloud.google.com/logging/docs/export/bigquery

## Issues Found
1. **Overview incorrectly stated Dapr emits JSON logs by default.** Dapr's default log format is plain text, not JSON. JSON logging must be explicitly enabled via `global.logAsJson=true` (Helm) or the `dapr.io/log-as-json: "true"` annotation. Changed "Dapr emits structured JSON logs by default" to "Dapr can be configured to emit structured JSON logs".

2. **Invalid Helm value `global.logLevel=info`.** The Dapr Helm chart does not have a `global.logLevel` parameter. Log levels are configured per control-plane component (e.g., `dapr_operator.logLevel`, `dapr_sentry.logLevel`) or per sidecar via the `dapr.io/log-level` annotation. Removed `--set global.logLevel=info` from the Helm command. The per-app annotation `dapr.io/log-level: "info"` shown later in the post is correct.

3. **Incorrect flags on `gcloud alpha monitoring policies create`.** The flags `--condition-threshold-value` and `--condition-threshold-duration` do not exist. The correct flags are `--if="> 10"` (for threshold comparison) and `--duration=60s` (for how long the condition must hold). Updated the command accordingly.

4. **Incorrect BigQuery table name `k8s_container_*`.** Cloud Logging exports to BigQuery create tables named after the log name (e.g., `stdout`, `stderr`), not the resource type (`k8s_container`). Since the post uses `--use-partitioned-tables`, the table is a single partitioned table named `stdout`, not a wildcard table. Changed `k8s_container_*` to `stdout`.

## Review Notes
- The `gcloud alpha monitoring policies create` command uses the alpha track, which has an unstable interface. For production use, consider defining the alerting policy in a JSON file and using `--policy-from-file`, or using Terraform/Infrastructure-as-Code for reproducibility.
- The Dapr annotations section correctly shows `dapr.io/log-level: "info"` — this is the proper way to set sidecar log level, as opposed to any global Helm value.
- The Cloud Logging query syntax, log-based metrics command, and sink creation command are all correct.
- The Dapr JSON log structure example accurately reflects all documented fields (`level`, `msg`, `app_id`, `instance`, `scope`, `time`, `ver`, `type`).
- The BigQuery query only queries the `stdout` table. If users need stderr logs as well, they would need to query the `stderr` table separately or use a UNION.
