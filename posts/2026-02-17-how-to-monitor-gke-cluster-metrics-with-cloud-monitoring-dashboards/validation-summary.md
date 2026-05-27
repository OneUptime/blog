# Validation Summary: How to Monitor GKE Cluster Metrics with Cloud Monitoring Dashboards

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Kubernetes Engine
- Cloud Monitoring
- Cloud Monitoring dashboards
- PromQL
- GKE system metrics
- GKE kube state metrics
- Google Cloud CLI
- Terraform Google provider

## Sources Consulted
- Google Cloud: GKE system metrics, https://cloud.google.com/monitoring/api/metrics_kubernetes
- Google Cloud: Configure metrics collection for GKE, https://cloud.google.com/kubernetes-engine/docs/how-to/configure-metrics
- Google Cloud: Collect and view kube state metrics, https://cloud.google.com/kubernetes-engine/docs/how-to/kube-state-metrics
- Google Cloud: PromQL for Cloud Monitoring metric name mapping, https://cloud.google.com/monitoring/promql/promql-mapping
- Google Cloud: Monitoring Query Language deprecation notice, https://cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud: Create and manage dashboards by API, https://cloud.google.com/monitoring/dashboards/api-dashboard
- Google Cloud SDK: gcloud monitoring dashboards create, https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Terraform Registry: google_monitoring_dashboard resource, https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard

## Issues Found
- The post recommended creating new Cloud Monitoring dashboard charts with MQL. Google Cloud no longer recommends MQL, ended support for writing valid MQL on July 22, 2025, and states that new MQL charts, dashboards, and alerts are no longer available through the Google Cloud console shortly after that date. I changed the chart examples to PromQL.
- The pod phase example used `kubernetes.io/pod/phase`, which is not listed as a GKE system metric. I changed the query to use `kube_pod_status_phase`, which is provided by the GKE kube state metrics package, and added the prerequisite note.
- The MQL examples used query syntax and value field references that would not be appropriate for the current recommended Cloud Monitoring console workflow. I replaced them with PromQL queries for node CPU, node memory, container restart count, CPU request utilization, network receive throughput, and volume utilization.
- The dashboard API section said the JSON created CPU, memory, and pod restart widgets, but the JSON included only CPU and memory widgets. I corrected the description to match the snippet.

## Review Notes
The Cloud Monitoring API JSON and Terraform dashboard examples use the documented `Dashboard` resource shape and `google_monitoring_dashboard.dashboard_json`. The `gcloud monitoring dashboards create --config-from-file=gke-dashboard.json` command is current. In a future update, the post could add a complete PromQL-based dashboard JSON example, but the current API examples are technically valid.
