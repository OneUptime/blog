# Validation Summary: How to Migrate Azure Application Insights to Google Cloud Monitoring

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Azure Application Insights
- Azure CLI
- Google Cloud Monitoring
- Google Cloud Trace
- Google Cloud Logging
- OpenTelemetry Python SDK
- OpenTelemetry JavaScript SDK
- Flask, Requests, and SQLAlchemy OpenTelemetry instrumentation
- Cloud Run metrics and alerting policies

## Sources Consulted
- Microsoft Learn: Azure CLI `az monitor app-insights component` reference, https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/component
- Microsoft Learn: Azure CLI `az monitor app-insights web-test` reference, https://learn.microsoft.com/en-us/cli/azure/monitor/app-insights/web-test
- Microsoft Learn: Azure CLI `az monitor metrics alert` reference, https://learn.microsoft.com/en-us/cli/azure/monitor/metrics/alert
- Google Cloud SDK: `gcloud monitoring uptime create`, https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/uptime/create
- Google Cloud SDK: `gcloud monitoring policies create`, https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK: `gcloud monitoring dashboards create`, https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud Monitoring dashboard REST reference, https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v1/projects.dashboards
- Google Cloud Monitoring metric descriptors REST reference, https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.metricDescriptors/list
- Google Cloud Trace REST `projects.traces.list` reference, https://docs.cloud.google.com/trace/docs/reference/v1/rest/v1/projects.traces/list
- Google Cloud OpenTelemetry Python Cloud Trace exporter docs, https://google-cloud-opentelemetry.readthedocs.io/en/latest/cloud_trace/cloud_trace.html
- Google Cloud OpenTelemetry Python Cloud Monitoring exporter docs, https://google-cloud-opentelemetry.readthedocs.io/en/latest/cloud_monitoring/cloud_monitoring.html
- OpenTelemetry Python instrumentation docs, https://opentelemetry.io/docs/languages/python/instrumentation/
- GoogleCloudPlatform OpenTelemetry Operations JS exporter README, https://github.com/GoogleCloudPlatform/opentelemetry-operations-js
- Google Cloud request-response SLI metrics docs for Cloud Run metrics, https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics

## Issues Found
- The service mapping listed Application Map as "Cloud Trace service graph", which is not a current Cloud Trace feature name. Changed it to Cloud Trace Trace Explorer.
- The Python install command omitted packages required by later snippets. Added `opentelemetry-instrumentation-sqlalchemy` and `google-cloud-logging`.
- The uptime-check examples used the obsolete/non-current `gcloud monitoring uptime-checks create https` form and flags like `--uri` and `--check-every`. Replaced them with current `gcloud monitoring uptime create` syntax, `--resource-type`, `--resource-labels`, `--protocol`, `--path`, `--period`, and current region values.
- The alert examples used non-existent `--condition-threshold-value` and `--condition-threshold-comparison` flags. Replaced them with current `--if`, `--duration`, and `--aggregation` flags.
- The high-error-rate alert described a percentage alert but filtered only 5xx request counts. Changed the example label to a 5xx request-rate alert to match the metric filter.
- The custom metric alert and validation command used `custom.googleapis.com`, but the Google Cloud OpenTelemetry Monitoring exporter defaults to `workload.googleapis.com`. Updated those examples to use `workload.googleapis.com`.
- The trace validation command used `gcloud trace traces list`, which is not a current Google Cloud CLI command. Replaced it with a Cloud Trace REST API call.
- The metric validation command used `gcloud monitoring metrics list`, which is not part of the current GA `gcloud monitoring` command group. Replaced it with the Monitoring metric descriptors REST API.
- The uptime validation command used the old `gcloud monitoring uptime-checks list-configs` command group. Replaced it with `gcloud monitoring uptime list-configs`.

## Review Notes
The post is now technically consistent with the current official documentation checked on 2026-05-28. The examples remain illustrative and still assume valid Google Cloud credentials, enabled APIs, and appropriate IAM permissions.
