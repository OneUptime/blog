# Validation Summary: How to Build an Incident Response Runbook System

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring alerting policies
- Google Cloud Monitoring dashboards
- Cloud Logging query language
- Cloud Run metrics and audit logs
- Google Cloud CLI
- Python Google Cloud Monitoring client library
- BigQuery
- PagerDuty

## Sources Consulted
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Cloud Monitoring AlertPolicy REST API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring Dashboard REST API reference: https://cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Cloud Monitoring filter syntax: https://docs.cloud.google.com/monitoring/api/v3/filters
- Google Cloud metrics list for Cloud Run metrics: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z
- Cloud Logging query language: https://docs.cloud.google.com/logging/docs/view/logging-query-language
- Logs Explorer overview and sharing behavior: https://cloud.google.com/logging/docs/view/overview
- Cloud Run audit logging method names: https://cloud.google.com/run/docs/audit-logging
- Cloud Run traffic migration and rollback command reference: https://cloud.google.com/run/docs/rollouts-rollbacks-traffic-migration
- Python Monitoring client library reference: https://cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.services.alert_policy_service

## Issues Found
- The alerting policy command used non-current `gcloud alpha monitoring policies create` flags: `--condition-threshold-value`, `--condition-threshold-comparison`, `--condition-threshold-duration`, `--documentation-content`, and `--documentation-mime-type`. Updated the example to use the current documented `gcloud monitoring policies create` flags: `--aggregation`, `--if`, `--duration`, `--documentation`, and `--documentation-format`.
- The alerting condition was described as "5xx error rate above 5%", but the filter selected only 5xx request-count time series and compared the aligned rate against `0.05`; that measures 5xx responses per second, not a percentage of total requests. Updated the condition display name and runbook text to describe the actual threshold.
- The Cloud Run deployment-event log query only checked the v1 `Services.ReplaceService` method. Updated it to include `protoPayload.serviceName="run.googleapis.com"` and also match the current v2 `Services.UpdateService` method.

## Review Notes
- `gcloud` is not installed in the local environment, so CLI validation was performed against official Google Cloud SDK documentation instead of local `--help` output.
- The Python audit snippet is syntactically valid. It assumes the `google-cloud-monitoring` package and Application Default Credentials are available at runtime.
