# Validation Summary: How to Send Dapr Logs to GCP Cloud Logging

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar injection annotations, JSON logging)
- Google Kubernetes Engine (GKE)
- GCP Cloud Logging (formerly Stackdriver Logging)
- gcloud CLI (container clusters, logging, monitoring commands)
- Fluent Bit (Stackdriver output plugin)
- GCP Cloud Monitoring (log-based metrics, alerting policies)

## Sources Consulted
- Fluent Bit official documentation for the Stackdriver output plugin (parameter names: `export_to_project_id`, `resource`, `k8s_cluster_name`, `k8s_cluster_location`, `labels_key`)
- Fluent Bit documentation for input parsers (`cri` vs `docker` parser for containerd-based Kubernetes)
- Dapr documentation for Kubernetes annotations (`dapr.io/log-as-json`, `dapr.io/log-level`, `dapr.io/enabled`, `dapr.io/app-id`, `dapr.io/app-port`)
- GCP Cloud Logging filter syntax documentation (resource types, jsonPayload fields, severity, regex matching with `=~`)
- gcloud CLI reference for `gcloud container clusters describe/update`, `gcloud logging read`, `gcloud logging metrics create`, `gcloud alpha monitoring policies create`

## Issues Found
1. **Fluent Bit `project` parameter incorrect**: The Stackdriver output plugin parameter for specifying the GCP project is `export_to_project_id`, not `project`. Changed `project ${GCP_PROJECT_ID}` to `export_to_project_id ${GCP_PROJECT_ID}`.
2. **Fluent Bit parser incorrect for modern GKE**: GKE uses containerd as the default container runtime (since GKE 1.24+), which produces logs in CRI format, not Docker JSON format. Changed `Parser docker` to `Parser cri` in the Fluent Bit INPUT section.

## Review Notes
- The `gcloud alpha monitoring policies create` command is in the alpha command group, which means its syntax may change in future gcloud SDK releases. Readers should check current documentation.
- The Fluent Bit plugin name `stackdriver` is still valid, though future versions of Fluent Bit may rename it to `google_cloud_logging`.
- All Cloud Logging filter queries use correct syntax including the regex operator (`=~`), resource types, and jsonPayload field references.
- The Dapr annotations are all current and correctly specified.
