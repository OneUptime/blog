# Validation Summary: How to Configure Incident Management Workflows

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Monitoring
- Google Cloud alerting policies and incidents
- Google Cloud notification channels
- Google Cloud CLI
- Cloud Run metrics
- Pub/Sub
- Cloud Functions
- Slack webhooks
- Jira REST API

## Sources Consulted
- Google Cloud CLI reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud CLI reference for `gcloud alpha monitoring channels create`: https://docs.cloud.google.com/sdk/gcloud/reference/alpha/monitoring/channels/create
- Google Cloud Monitoring notification channels API guide: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Google Cloud Monitoring notification channel payload schema and Pub/Sub guide: https://cloud.google.com/monitoring/support/notification-options
- Google Cloud Monitoring incident documentation: https://docs.cloud.google.com/monitoring/alerts/incidents-events
- Google Cloud Monitoring alerting overview: https://docs.cloud.google.com/monitoring/alerts
- Google Cloud Monitoring alerting behavior and multi-condition incident behavior: https://cloud.google.com/monitoring/alerts/concepts-indepth
- Google Cloud Monitoring alert troubleshooting: https://docs.cloud.google.com/monitoring/alerts/troubleshooting-alerts
- Google Cloud Run metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z

## Issues Found
- The alerting policy `gcloud` command used non-existent flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, `--condition-threshold-duration`, `--condition-threshold-aggregation-alignment-period`, `--condition-threshold-aggregation-per-series-aligner`, and `--documentation-content`. Replaced them with current documented flags: `--if`, `--duration`, `--aggregation`, and `--documentation`.
- The post claimed Cloud Monitoring groups related alerts into a single incident and that one incident can contain multiple alerts. Google Cloud documentation says Monitoring can create one incident and notification per time series that causes a condition to be met, and that users can view related incidents rather than force a single combined incident. Updated the explanation and diagram to describe related incidents accurately.
- The incident workflow recommended adding annotations directly to Cloud Monitoring incidents. The official incident documentation describes acknowledgement, closing, timelines, metrics, logs, labels, documentation, and related incidents, but not adding responder annotations as a full incident-note workflow. Changed the guidance to capture investigation notes in an incident-management system or ticket.
- The Slack channel creation command repeated `--channel-labels`, which can replace the label map. Combined `channel_name` and `auth_token` into a single `--channel-labels` argument.
- The Python Pub/Sub example imported `google.cloud.monitoring_v3` but didn't use it. Removed the unused import so the example doesn't imply an unnecessary dependency.
- The post said to export incident data directly to BigQuery for long-term analysis. Cloud Monitoring incident docs expose incident listing through the console, gcloud CLI, and Monitoring API, but not a direct BigQuery incident export workflow. Updated this to list incidents and write the needed fields to BigQuery.

## Review Notes
- `gcloud` wasn't installed in the local environment, so command validation was performed against official Google Cloud CLI documentation rather than local `--help` output.
- The Cloud Run latency threshold uses milliseconds, which matches the documented `run.googleapis.com/request_latencies` metric unit.
