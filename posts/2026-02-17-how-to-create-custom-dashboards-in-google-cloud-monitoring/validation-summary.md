# Validation Summary: How to Create Custom Dashboards in Google Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Cloud Monitoring Dashboards API
- gcloud CLI
- GKE system metrics
- Cloud Run metrics
- Terraform Google provider

## Sources Consulted
- Google Cloud Monitoring Dashboards API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud SDK `gcloud monitoring dashboards create` reference: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud Monitoring dashboard API guide: https://cloud.google.com/monitoring/dashboards/api-dashboard
- Google Cloud Monitoring GKE system metrics reference: https://cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud Monitoring Google Cloud metrics reference for Cloud Run: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud Monitoring monitored resource types reference: https://cloud.google.com/monitoring/api/resources
- Terraform Google provider `google_monitoring_dashboard` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard

## Issues Found
- The post described Cloud Monitoring dashboards as widgets arranged only in a grid layout. Cloud Monitoring supports multiple layout types, including grid, mosaic, row, and column layouts. Changed the wording to "arranged in a layout."
- The dashboard filter example used `templateVariable`, which creates label-based variables that must be referenced by widget queries, but the text said widgets would filter automatically. Changed the example to pinned resource-label filters by removing `templateVariable`, and adjusted the text to say relevant widgets filter accordingly.

## Review Notes
- The `gcloud monitoring dashboards` commands and `--config-from-file` flag match the official Google Cloud SDK reference.
- The dashboard JSON fields, widget types, threshold enums, mosaic layout fields, and plot types match the Cloud Monitoring Dashboards API reference.
- The GKE and Cloud Run metric names used in the examples match the official Google Cloud metrics references. The custom metrics under `custom.googleapis.com/` assume those descriptors already exist in the target project.
