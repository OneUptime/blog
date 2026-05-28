# Validation Summary: How to Choose Between Google Cloud Monitoring

## Status
validated

## Post Type
Guide

## Technologies Covered
- Google Cloud Monitoring
- Google Cloud Logging
- Google Cloud Trace
- Google Cloud Profiler
- Google Cloud CLI
- Datadog
- Grafana Cloud
- Prometheus
- Kubernetes / GKE
- Cloud Run

## Sources Consulted
- Google Cloud Observability pricing: https://cloud.google.com/products/observability/pricing
- Google Cloud SDK `gcloud monitoring policies create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud SDK `gcloud monitoring dashboards create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/dashboards/create
- Google Cloud SDK `gcloud logging read` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/read
- Google Cloud SDK `gcloud logging sinks create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/logging/sinks/create
- Google Cloud Monitoring MQL deprecation notice: https://cloud.google.com/stackdriver/docs/deprecations/mql
- Google Cloud request/response service metrics for Cloud Run: https://docs.cloud.google.com/stackdriver/docs/solutions/slo-monitoring/sli-metrics/req-resp-metrics
- Datadog Kubernetes DaemonSet documentation: https://docs.datadoghq.com/containers/guide/kubernetes_daemonset/
- Datadog Google Cloud integration documentation: https://docs.datadoghq.com/integrations/google-cloud-platform/
- Datadog pricing list: https://www.datadoghq.com/pricing/list/
- Grafana Cloud pricing: https://grafana.com/pricing/
- Grafana Cloud Prometheus remote write documentation: https://grafana.com/docs/grafana-cloud/send-data/metrics/metrics-prometheus/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/

## Issues Found
- The Cloud Logging and Cloud Monitoring free-tier claim was outdated. Updated it to the current 50 GiB/project/month Cloud Logging free allotment, free Google Cloud system metrics, and current Monitoring read-result free allotment language.
- The MQL discussion did not mention Google's current recommendation away from MQL for new queries. Added a brief note that Google now recommends PromQL for new Cloud Monitoring queries.
- The `gcloud monitoring policies create` example used non-current flags such as `--condition-threshold-value`, `--condition-threshold-comparison`, `--condition-threshold-duration`, and `--condition-threshold-aggregation`. Replaced them with the documented `--if`, `--duration`, and `--aggregation` flags.
- The Datadog GKE DaemonSet example used `gcr.io/datadoghq/agent:latest` and a non-standard `DD_GCP_ENABLED` environment variable. Changed the image to `gcr.io/datadoghq/agent:7`, added `DD_SITE`, and replaced `DD_GCP_ENABLED` with `DD_LOGS_CONFIG_CONTAINER_COLLECT_ALL`.
- The Datadog wording implied the agent enabled GCP service metric collection. Clarified that GCP service metrics require configuring the Datadog GCP integration.
- The cost table included stale Cloud Monitoring, Datadog, and Grafana Cloud pricing assumptions. Updated Cloud Logging, custom metric, Datadog APM, Grafana metrics, and alerting rows to match current public pricing models.
- The log sink filter used `severity >= "WARNING" OR resource.type="cloud_run_revision"`, which would export all Cloud Run logs rather than only important logs. Changed it to `severity>=WARNING AND resource.type="cloud_run_revision"`.

## Review Notes
Local `gcloud` was not installed in the review environment, so Google Cloud CLI syntax was verified against the official Google Cloud SDK reference documentation instead of local `--help` output.
