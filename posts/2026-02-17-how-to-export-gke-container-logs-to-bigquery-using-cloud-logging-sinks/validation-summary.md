# Validation Summary: How to Export GKE Container Logs to BigQuery Using Cloud Logging Sinks

## Status
validated

## Post Type
Tutorial / technical guide

## Technologies Covered
- Google Kubernetes Engine (GKE)
- Cloud Logging
- Cloud Logging sinks / Log Router
- BigQuery
- Google Cloud CLI and bq CLI
- Terraform Google provider
- GoogleSQL

## Sources Consulted
- Google Cloud: About GKE logs: https://docs.cloud.google.com/kubernetes-engine/docs/concepts/about-logs
- Google Cloud: View GKE logs: https://cloud.google.com/kubernetes-engine/docs/how-to/view-logs
- Google Cloud: Monitored resources and services: https://cloud.google.com/logging/docs/api/v2/resource-list
- Google Cloud: Route logs to supported destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud SDK: gcloud logging sinks create: https://cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud: View logs routed to BigQuery: https://cloud.google.com/logging/docs/export/bigquery
- Google Cloud: BigQuery create datasets: https://cloud.google.com/bigquery/docs/datasets
- Google Cloud: BigQuery bq command-line reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- Google Cloud: Control access to BigQuery resources with IAM: https://cloud.google.com/bigquery/docs/control-access-to-resources-iam
- Google Cloud: BigQuery JSON functions: https://cloud.google.com/bigquery/docs/reference/standard-sql/json_functions
- Terraform Registry: google_logging_project_sink: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/logging_project_sink

## Issues Found
- The GKE resource-type table described `k8s_node` as node-level system logs and `k8s_cluster` as autoscaling/upgrades. Updated these to match GKE documentation: `k8s_node` is for node events, `k8s_cluster` is for Kubernetes cluster events that are not Pod or Node events, and `gke_cluster` covers GKE cluster operations logs.
- The permissions command used `bq add-iam-policy-binding` for a dataset, but the BigQuery CLI reference states that command doesn't support datasets. Replaced it with a BigQuery DCL `GRANT` statement for the dataset.
- The schema section and SQL examples used snake_case fields such as `text_payload` and `json_payload`. Cloud Logging routed BigQuery tables use LogEntry field names such as `textPayload` and `jsonPayload`, so those references were corrected.
- The post said the BigQuery table for `k8s_container` logs would be named like `k8s_container`. Cloud Logging names BigQuery tables from log IDs; GKE container stdout/stderr logs usually route to `stdout` and `stderr` tables when partitioned tables are enabled. Updated the explanation and examples to query both tables with a wildcard and `_TABLE_SUFFIX`.
- Several BigQuery examples used `severity >= 'ERROR'`, which is a string comparison in BigQuery rather than Cloud Logging's enum severity ordering. Replaced those comparisons with explicit severity lists for `ERROR`, `CRITICAL`, `ALERT`, and `EMERGENCY`.
- Structured payload examples used `JSON_VALUE(json_payload, ...)` as if the exported payload were a JSON column. Cloud Logging routed logs represent structured payload fields under `jsonPayload`, so the examples now use nested field access such as `jsonPayload.message`.
- The `SUBSTR` example used a zero start position. Updated it to start at position 1 for standard BigQuery string slicing.

## Review Notes
- The local environment did not have `gcloud` or `bq` installed, so command verification was performed against official Google Cloud documentation instead of local CLI help.
- The structured JSON query examples still assume those `jsonPayload` fields exist in the exported table schema. That is normal for example queries, but real deployments with inconsistent structured log schemas can produce schema mismatch tables or require query adjustments.
