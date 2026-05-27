# Validation Summary: How to Set Up Alerting and Notifications for ML Model Degradation

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring
- Vertex AI endpoint metrics
- Cloud Monitoring alert policies and notification channels
- Google Cloud Python client libraries
- BigQuery
- Cloud Run functions / Cloud Functions gen2
- Cloud Scheduler
- gcloud CLI

## Sources Consulted
- Cloud Monitoring metrics for Vertex AI: https://docs.cloud.google.com/vertex-ai/docs/general/monitoring-metrics
- Google Cloud metrics list for `aiplatform.googleapis.com`: https://docs.cloud.google.com/monitoring/api/metrics_gcp_a_b
- Cloud Monitoring monitored resource types: https://docs.cloud.google.com/monitoring/api/resources
- Cloud Monitoring alert policy API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.alertPolicies
- Cloud Monitoring Python `AlertPolicy` reference: https://docs.cloud.google.com/python/docs/reference/monitoring/latest/google.cloud.monitoring_v3.types.AlertPolicy
- Cloud Monitoring notification channels API guide: https://docs.cloud.google.com/monitoring/alerts/using-channels-api
- Cloud Monitoring notification channel API reference: https://docs.cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.notificationChannels
- Cloud Monitoring user-defined metrics API guide: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Google Cloud SDK `gcloud functions deploy` reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK `gcloud scheduler jobs create http` reference: https://cloud.google.com/sdk/gcloud/reference/scheduler/jobs/create/http

## Issues Found
- The error alert claimed to alert on an error rate, but the code used the Vertex AI `prediction/online/error_count` metric with a raw count threshold. Changed the section and code to describe an error count alert instead of a percentage-based rate alert.
- Alert policies omitted the required `combiner` field. Added `ConditionCombinerType.OR` to each metric-threshold alert policy.
- The notification channel setup returned full `NotificationChannel` objects, but alert policies expect notification channel resource name strings. Changed the helper to return `channel.name` values.
- The Slack notification channel was missing the required authorization token label. Added an `auth_token` placeholder alongside `channel_name`.
- The latency alerts used `prediction/online/response_latencies`, which is not the documented Vertex AI endpoint latency metric. Updated them to `prediction/online/prediction_latencies` and filtered for `metric.labels.latency_type="total"`.
- The critical latency alert was constructed but never sent to `create_alert_policy`. Added the missing create call.
- The prediction distribution reporter consumed a BigQuery `RowIterator` while calculating `total`, so the subsequent loop would not emit metrics. Converted the iterator to a list before summing and iterating.
- The Cloud Functions gen2 deploy command used a deployed function name with hyphens but did not specify the Python entry point. Added `--entry-point report_model_metrics`.

## Review Notes
- The custom `custom.googleapis.com/ml/feature_drift_score` metric is treated as an application-defined metric. The post does not show the producer for that metric, so readers still need to implement or connect a drift scorer before the drift alert has data.
- The local environment did not have `gcloud` installed, so CLI command validation was performed against official Google Cloud SDK documentation rather than local `--help` output.
