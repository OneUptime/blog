# Validation Summary: How to Optimize Compute Engine Costs by Rightsizing VM Instances

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Compute Engine
- Compute Engine machine type recommendations
- Google Cloud CLI
- Cloud Monitoring
- PromQL
- BigQuery billing export
- Managed instance groups and autoscaling
- Bash and jq

## Sources Consulted
- Google Cloud Compute Engine: Apply machine type recommendations to VM instances: https://docs.cloud.google.com/compute/docs/instances/apply-machine-type-recommendations-for-instances
- Google Cloud SDK: gcloud recommender recommendations list: https://cloud.google.com/sdk/gcloud/reference/recommender/recommendations/list
- Google Cloud Recommender API usage: https://docs.cloud.google.com/recommender/docs/use-api
- Google Cloud Observability: MQL deprecation notice: https://docs.cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud Monitoring: PromQL for Cloud Monitoring: https://cloud.google.com/monitoring/promql/promql-mapping
- Google Cloud Billing: Detailed billing export schema: https://docs.cloud.google.com/billing/docs/how-to/export-data-bigquery-tables/detailed-usage
- Google Cloud SDK: gcloud compute instance-groups managed set-autoscaling: https://docs.cloud.google.com/sdk/gcloud/reference/compute/instance-groups/managed/set-autoscaling

## Issues Found
- The post recommended MQL for new Cloud Monitoring analysis. Google no longer recommends MQL, and new MQL charts, dashboards, and alerting policies are no longer available in the Google Cloud console after July 22, 2025. Changed the example to PromQL.
- The Cloud Monitoring section said CPU, memory, and disk metrics are collected for all VMs. Compute Engine provides default metrics such as CPU utilization, while detailed memory, disk, network, and process metrics require the Ops Agent. Updated the wording.
- The BigQuery example used the standard billing export table pattern while selecting VM-level information. Resource-level VM identifiers are in the detailed billing export table. Updated the table pattern to `gcp_billing_export_resource_v1_*` and selected `resource.name` / `resource.global_name`.
- The BigQuery example claimed to correlate cost with utilization but only queried billing rows. Updated the wording and comments to describe the query as identifying high-cost instances to compare with Cloud Monitoring utilization.
- The automation script applied recommendations without confirmation. The commands were valid, but the surrounding guidance was too risky for a production resizing workflow. Added an interactive confirmation before stopping and resizing each VM.

## Review Notes
Google Cloud's machine type recommendations use the previous 8 days of CPU and memory utilization data and have documented limitations, including unsupported VM categories and short-spike/monthly-spike workloads. The post already advises longer manual review windows, which is appropriate. The local environment did not have `gcloud` installed, so CLI checks were verified against official Google Cloud SDK documentation rather than local `--help` output.
