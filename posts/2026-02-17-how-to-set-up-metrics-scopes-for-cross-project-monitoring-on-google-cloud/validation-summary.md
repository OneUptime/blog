# Validation Summary: How to Set Up Metrics Scopes for Cross-Project Monitoring on Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Metrics scopes
- Google Cloud CLI
- Cloud Monitoring dashboards
- Cloud Monitoring alerting policies
- Google Cloud IAM
- Python Google Cloud Monitoring Metrics Scopes client

## Sources Consulted
- Google Cloud Monitoring metrics scopes overview: https://cloud.google.com/monitoring/settings
- Google Cloud Monitoring metrics scope console configuration: https://cloud.google.com/monitoring/settings/multiple-projects
- Google Cloud Monitoring metrics scope API and CLI configuration: https://cloud.google.com/monitoring/settings/manage-api
- Google Cloud SDK reference for `gcloud beta monitoring metrics-scopes create`: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/metrics-scopes/create
- Google Cloud SDK reference for `gcloud beta monitoring metrics-scopes describe`: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/metrics-scopes/describe
- Google Cloud SDK reference for `gcloud beta monitoring metrics-scopes list`: https://cloud.google.com/sdk/gcloud/reference/beta/monitoring/metrics-scopes/list
- Google Cloud SDK reference for `gcloud monitoring dashboards create`: https://cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud SDK reference for `gcloud alpha monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Python client reference for `MetricsScopesClient` and `CreateMonitoredProjectRequest`: https://docs.cloud.google.com/python/docs/reference/google-cloud-monitoring-metrics-scopes/latest
- Cloud Monitoring monitored resource descriptors and Google Cloud metric descriptors: https://cloud.google.com/monitoring/api/resources and https://cloud.google.com/monitoring/api/metrics_gcp
- Cloud Logging log-based metrics overview: https://cloud.google.com/logging/docs/logs-based-metrics

## Issues Found
- The post said metrics scopes expose metrics, logs, and uptime check results from monitored projects. Metrics scopes determine visibility for time-series data, including log-based metrics, but they do not make raw logs visible. Updated the description to focus on time-series metrics and log-based metrics.
- The setup enabled the Cloud Logging API even though the walkthrough is about metrics scopes and Cloud Monitoring metric visibility. Removed that command to avoid implying Cloud Logging is required for metrics scopes.
- The monitored-project setup section described a gcloud command as the API approach. Reworded it as the gcloud CLI approach while leaving the separate Python API example intact.
- The verification command used `gcloud beta monitoring metrics-scopes list --project=ops-monitoring` to list monitored projects in the scope. The `list` command requires a monitored resource container and lists metrics scopes that include it; `describe` is the command that shows the monitored projects in a metrics scope. Replaced the verification commands accordingly.
- The alerting policy examples used unsupported `--condition-threshold-*` flags for `gcloud alpha monitoring policies create`. Updated the examples to use the documented `--if`, `--duration`, and `--aggregation` flags.
- The IAM section incorrectly suggested granting `roles/monitoring.viewer` to a scoping project's service account on monitored projects. Updated it to document the required Monitoring Admin permissions for modifying metrics scopes and Monitoring Viewer on the scoping project for read-only access to aggregated metrics.
- The limitations section said each project can only be monitored by one metrics scope. Google Cloud documentation now states that a monitored project can belong to more than one metrics scope. Updated the limitation and clarified that metrics scopes are not transitive.

## Review Notes
The dashboard JSON, metric type strings, resource types, resource labels, Python client resource names, and dashboard creation command were consistent with current Google Cloud documentation. The `gcloud beta monitoring metrics-scopes` commands are still beta as of the reviewed documentation, so future readers should re-check the CLI reference if Google promotes or changes that command group.
