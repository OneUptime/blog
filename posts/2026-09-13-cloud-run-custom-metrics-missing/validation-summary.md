# Validation Summary: Export Cloud Run Custom Metrics When Only Logs Appear

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Google Cloud Run
- Google Cloud Monitoring API v3
- Google Cloud Managed Service for Prometheus
- OpenTelemetry and OTLP
- Python and the `google-cloud-monitoring` client library
- Google Cloud CLI (`gcloud`)
- Google Cloud IAM
- Cloud Logging log-based metrics

## Sources Consulted
- [Cloud Run monitoring](https://docs.cloud.google.com/run/docs/monitoring)
- [Create user-defined metrics with the API](https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics)
- [Cloud Monitoring `projects.timeSeries.create` API](https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/create)
- [Python `MetricServiceClient.create_time_series` reference](https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.services.metric_service.MetricServiceClient.html)
- [Cloud Monitoring roles and permissions](https://docs.cloud.google.com/iam/docs/roles-permissions/monitoring)
- [`gcloud services enable` reference](https://docs.cloud.google.com/sdk/gcloud/reference/services/enable)
- [`gcloud projects add-iam-policy-binding` reference](https://docs.cloud.google.com/sdk/gcloud/reference/projects/add-iam-policy-binding)
- [Prometheus sidecar for Cloud Run](https://docs.cloud.google.com/run/docs/monitoring-managed-prometheus-sidecar)
- [OTLP metrics with an OpenTelemetry Collector sidecar](https://docs.cloud.google.com/run/docs/tutorials/custom-metrics-opentelemetry-sidecar)
- [Troubleshoot the Monitoring API](https://docs.cloud.google.com/monitoring/api/troubleshooting)

## Issues Found
No technical issues found.

## Review Notes
The Python example was syntax-checked locally and its protobuf construction and request structure were checked against the current official client-library documentation. The installed Google Cloud CLI recognizes both command groups used in the post. The post appropriately identifies the direct API write as an illustrative probe rather than evidence of a live Cloud Run deployment. Executing the probe still requires Application Default Credentials for an identity with the stated permission, and user-defined metric ingestion requires an active billing account; these are deployment prerequisites rather than errors in the post.
