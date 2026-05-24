# Validation Summary: How to Create GCP Monitoring Dashboards in Terraform

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Terraform (HCL)
- Google Cloud provider for Terraform (hashicorp/google ~> 5.0)
- Google Cloud Monitoring (Dashboards API)
- Google Compute Engine (GCE) metrics
- Google Kubernetes Engine (GKE) metrics
- Cloud SQL metrics
- Ops Agent metrics (`agent.googleapis.com/*`)

## Sources Consulted
- Terraform `google_monitoring_dashboard` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard
- GCP Cloud Monitoring Dashboards API reference (Dashboard, MosaicLayout, Tile, Widget, XyChart, Scorecard): https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- GCP metrics list (compute, kubernetes, cloudsql, agent): https://cloud.google.com/monitoring/api/metrics_gcp
- GCP Aggregation API (alignmentPeriod, perSeriesAligner, crossSeriesReducer, groupByFields): https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies#Aggregation
- HCL2 language specification (object expression syntax)

## Issues Found
No technical issues found.

- The `google_monitoring_dashboard` resource and its `dashboard_json` argument are correct for the `hashicorp/google ~> 5.0` provider.
- `mosaicLayout` with `columns = 12` and `tiles` (each having `xPos`, `yPos`, `width`, `height`, `widget`) matches the Dashboard API schema.
- All metric types referenced are valid:
  - `compute.googleapis.com/instance/cpu/utilization`
  - `agent.googleapis.com/memory/percent_used` (requires Ops Agent on VMs)
  - `compute.googleapis.com/instance/disk/read_ops_count` / `write_ops_count`
  - `compute.googleapis.com/instance/network/received_bytes_count`
  - `kubernetes.io/container/cpu/core_usage_time`
  - `kubernetes.io/container/memory/used_bytes`
  - `kubernetes.io/container/restart_count`
  - `cloudsql.googleapis.com/database/cpu/utilization`
  - `cloudsql.googleapis.com/database/network/connections`
  - `cloudsql.googleapis.com/database/disk/utilization`
- Aligners (`ALIGN_MEAN`, `ALIGN_RATE`, `ALIGN_MAX`) and reducer (`REDUCE_SUM`) are valid enum values.
- The `groupByFields = ["resource.label.\"namespace_name\""]` quoted-label form matches the format used in the official Terraform provider examples for dashboards.
- HCL syntax such as `xPos = 0, yPos = 0, width = 4, height = 4` on a single line is valid HCL2 (object elements may be separated by either commas or newlines).
- Widget types `xyChart` and `scorecard` are valid Dashboard API widget kinds; `plotType` values `LINE` and `STACKED_AREA` are valid.

## Review Notes
- The `agent.googleapis.com/memory/percent_used` metric requires the Google Cloud Ops Agent (or legacy monitoring agent) to be installed on the VM; without it that tile will be empty. This is not an error in the post but is a deployment prerequisite worth noting.
- The `provider "google"` block sets a `region`, but `google_monitoring_dashboard` is a global resource and does not use the region. Harmless and a common pattern.
- The post uses `metric.type=...` filter strings without `project=` scoping; this is the standard form because the resource is scoped to the provider project.
- For full provider compatibility going forward, the dashboard resource schema is unchanged in `hashicorp/google` 6.x as well, so the snippets will continue to work if readers upgrade.
