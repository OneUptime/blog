# Validation Summary: How to Monitor Pub/Sub with Cloud Monitoring

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Monitoring (formerly Stackdriver)
- gcloud CLI (pubsub, monitoring, logging subcommands)
- Terraform (`google_monitoring_dashboard` resource)
- Python (`google-cloud-monitoring` client library, `monitoring_v3`)
- Node.js (`@google-cloud/pubsub`, `@google-cloud/monitoring`)
- YAML alerting policies
- Cloud Monitoring REST API

## Sources Consulted
- [gcloud monitoring command group reference](https://cloud.google.com/sdk/gcloud/reference/monitoring)
- [gcloud monitoring policies create](https://cloud.google.com/sdk/gcloud/reference/monitoring/policies/create)
- [Pub/Sub Subscription REST resource schema](https://cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions)
- [Pub/Sub monitoring metrics list](https://cloud.google.com/pubsub/docs/monitoring)
- [gcloud pubsub subscriptions update](https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update)
- [gcloud logging metrics create](https://cloud.google.com/sdk/gcloud/reference/logging/metrics/create)
- [nodejs-monitoring client library](https://github.com/googleapis/nodejs-monitoring)
- [google-cloud-monitoring Python client](https://cloud.google.com/python/docs/reference/monitoring/latest)
- [Cloud Monitoring API: projects.timeSeries.list](https://cloud.google.com/monitoring/api/ref_v3/rest/v3/projects.timeSeries/list)
- [google_monitoring_dashboard Terraform resource](https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/monitoring_dashboard)

## Issues Found

1. **Invalid `gcloud monitoring metrics list` command.** The `gcloud monitoring` command group does not include a `metrics list` subcommand in GA. Replaced the snippet with a working Cloud Monitoring REST API call using `curl` and a bearer token from `gcloud auth print-access-token`, querying the `timeSeries` endpoint with an appropriate time interval.

2. **`gcloud pubsub subscriptions describe ... --format="value(numUndeliveredMessages)"` would return empty.** The `numUndeliveredMessages` field is not part of the Subscription REST resource — it is a runtime metric available only through Cloud Monitoring. Replaced with a `curl` call to the Cloud Monitoring API that queries `subscription/num_undelivered_messages`, and added a clarifying sentence explaining why the previous approach does not work.

3. **Incorrect Node.js `@google-cloud/monitoring` import.** The original code used `const { Monitoring } = require("@google-cloud/monitoring"); new Monitoring.MetricServiceClient()`, which does not match the library's exports. Fixed to `const { MetricServiceClient } = require("@google-cloud/monitoring"); new MetricServiceClient()`, matching the official quickstart pattern.

4. **Outdated `gcloud alpha monitoring policies create`.** The command has been promoted to GA. Changed to `gcloud monitoring policies create`, which is the current recommended invocation. The `--policy-from-file` flag is unchanged.

## Review Notes
- The Python `get_oldest_unacked_age` and `get_backlog_size` examples carry unused imports (`from google.protobuf import timestamp_pb2`, `from google.api import metric_pb2`). They are harmless and were left in place per the "only fix technical errors" guidance.
- The Node.js publisher monitoring example uses in-memory counters and never actually forwards metrics to Cloud Monitoring even though the `monitoring` client is now correctly imported. This is consistent with the section's intent (showing client-side tracking) but readers may expect the metrics to be exported — a future revision could add a `createTimeSeries` call.
- The `metric.type` values used throughout (`subscription/oldest_unacked_message_age`, `subscription/num_undelivered_messages`, `subscription/dead_letter_message_count`) are all valid Pub/Sub Cloud Monitoring metrics.
- All `gcloud pubsub subscriptions update` flags (`--ack-deadline`, `--message-retention-duration`, `--enable-exactly-once-delivery`) are valid.
- The Terraform `google_monitoring_dashboard` resource and `dashboard_json` attribute usage is correct.
- The alert policy YAML structure follows the AlertPolicy proto and is compatible with `--policy-from-file`.
