# Validation Summary: How to Correlate VPC Flow Logs with Firewall Rules Logging for Security Analysis

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud VPC Flow Logs
- Google Cloud Firewall Rules Logging
- Cloud Logging
- Cloud Logging sinks
- BigQuery
- Cloud Monitoring log-based metrics and alerting policies
- Google Cloud CLI (`gcloud`) and BigQuery CLI (`bq`)

## Sources Consulted
- Google Cloud VPC Flow Logs overview: https://cloud.google.com/vpc/docs/flow-logs
- Google Cloud VPC Flow Logs configuration guide: https://cloud.google.com/vpc/docs/using-flow-logs
- Google Cloud VPC Flow Logs record format: https://cloud.google.com/vpc/docs/about-flow-logs-records
- Google Cloud Firewall Rules Logging overview and log format: https://cloud.google.com/firewall/docs/firewall-rules-logging
- Google Cloud Firewall Rules Logging usage guide: https://cloud.google.com/firewall/docs/using-firewall-rules-logging
- `gcloud compute networks subnets update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/networks/subnets/update
- `gcloud compute firewall-rules create` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/create
- `gcloud compute firewall-rules update` reference: https://cloud.google.com/sdk/gcloud/reference/compute/firewall-rules/update
- Cloud Logging routing to BigQuery: https://cloud.google.com/logging/docs/export/configure_export_v2
- Cloud Logging BigQuery schema and table naming: https://cloud.google.com/logging/docs/export/bigquery
- BigQuery `bq` command-line reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference
- `gcloud monitoring policies create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The VPC Flow Logs aggregation interval used the Compute API enum `INTERVAL_5_SEC`, but the `gcloud compute networks subnets update` command expects `interval-5-sec`. Updated the command.
- The post said `--logging-flow-sampling=1.0` captures every flow. VPC Flow Logs also uses a primary sampling stage, so this setting reports all collected flows after primary sampling. Updated the explanation.
- The firewall rule creation example included `icmp`, but Firewall Rules Logging records TCP and UDP connections only. Removed `icmp` from the logged rule example and added a brief clarification.
- The Cloud Logging section described joining flow logs and firewall logs, but Logs Explorer queries filter entries and do not perform SQL joins. Updated the wording and headings to reserve joins for BigQuery.
- The BigQuery sink IAM example used `bq add-iam-policy-binding` on a dataset, but the `bq` command does not support dataset IAM bindings. Replaced it with `gcloud projects add-iam-policy-binding` using the documented sink writer identity role.
- The BigQuery correlation query did not join on the full connection tuple and could match unrelated flows. Added source port, protocol, and a timestamp window to reduce false matches.
- The Cloud Monitoring alert policy command used non-existent threshold flags. Updated it to the current `gcloud monitoring policies create` syntax with `--if` and `--duration`.

## Review Notes
- The BigQuery sink IAM command now grants `roles/bigquery.dataEditor` at the project level for a concise CLI example. In production, dataset-scoped access is usually preferable.
- Firewall Rules Logging is connection-based and limited to TCP and UDP, while VPC Flow Logs are sampled and aggregated. Correlation should be treated as best-effort unless you account for sampling, time windows, and duplicated allow logs from egress and ingress rules.
