# Validation Summary: How to Monitor and Alert on IAM Policy Changes in Real Time with Google Cloud

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud IAM
- Cloud Audit Logs
- Cloud Logging log-based metrics and sinks
- Cloud Monitoring alerting policies and dashboards
- Pub/Sub
- Cloud Functions / Cloud Run functions
- BigQuery
- Python
- Slack incoming webhooks

## Sources Consulted
- Google Cloud: Understanding audit logs: https://cloud.google.com/logging/docs/audit/understanding-audit-logs
- Google Cloud IAM audit logging: https://cloud.google.com/iam/docs/audit-logging
- Google Cloud Logging CLI reference for logs-based metrics: https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create
- Google Cloud Monitoring CLI reference for alerting policies: https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create
- Google Cloud Logging sinks and routed destinations: https://cloud.google.com/logging/docs/export/configure_export_v2
- Google Cloud Logging routed logs to Pub/Sub: https://cloud.google.com/logging/docs/export/pubsub
- Google Cloud Functions deploy CLI reference: https://cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud Run functions event-driven Python guide: https://cloud.google.com/run/docs/write-event-driven-functions
- Google Cloud Pub/Sub CloudEvent Python sample: https://cloud.google.com/functions/docs/samples/functions-cloudevent-pubsub
- BigQuery bq CLI reference: https://cloud.google.com/bigquery/docs/reference/bq-cli-reference

## Issues Found
- The audit-log verification example used `gcloud projects get-iam-policy` and `auditConfigs`, which doesn't verify Admin Activity audit logs. I changed it to query the Admin Activity log directly with `log_id("cloudaudit.googleapis.com/activity")`.
- The `gcloud monitoring policies create` example used unsupported flags (`--condition-threshold-value`, `--condition-threshold-comparison`, and `--condition-threshold-aggregation-alignment-period`). I replaced them with the documented `--if` and `--aggregation` flags.
- The service account key log metric excluded `TYPE_GOOGLE_CREDENTIALS_FILE`, which is the common downloaded key type and would miss the event the metric is meant to detect. I removed that filter.
- The Cloud Function used the legacy background function `(event, context)` signature while deploying Python 3.11. I updated the example to a CloudEvent handler and added `--gen2` to the deploy command.
- The Python sample imported unused Pub/Sub client code and depended on `requests` without showing a `requirements.txt`. I replaced the Slack POST with the standard-library `urllib.request`.
- The BigQuery sink permission command used `bq add-iam-policy-binding` against a dataset, but the bq CLI doesn't support dataset IAM bindings with that command. I changed it to the documented project IAM binding approach for granting `roles/bigquery.dataEditor` to the sink writer identity.

## Review Notes
The local environment did not have `gcloud` installed, so CLI flags were checked against the current official Google Cloud SDK reference instead of local `--help` output. The post is technically relevant and the corrected snippets are consistent with current official documentation.
