# Validation Summary: How to Monitor IoT Fleet Health Using Cloud Monitoring Custom Metrics

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Google Cloud Monitoring custom metrics
- Google Cloud Pub/Sub
- Cloud Functions
- Cloud Scheduler
- BigQuery
- Google Cloud CLI
- Python client libraries for Google Cloud

## Sources Consulted
- Google Cloud Monitoring: Create user-defined metrics with the API: https://docs.cloud.google.com/monitoring/custom-metrics/creating-metrics
- Google Cloud Monitoring: User-defined metrics overview: https://docs.cloud.google.com/monitoring/custom-metrics
- Google Cloud Pub/Sub: Publish messages to topics and message attributes: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Functions Pub/Sub sample for 1st gen Python event signature: https://cloud.google.com/functions/docs/samples/functions-helloworld-pubsub
- Google Cloud Functions runtime support: https://docs.cloud.google.com/functions/docs/runtime-support
- Google Cloud SDK reference for `gcloud functions deploy`: https://docs.cloud.google.com/sdk/gcloud/reference/functions/deploy
- Google Cloud SDK reference for `gcloud monitoring policies create`: https://docs.cloud.google.com/sdk/gcloud/reference/monitoring/policies/create

## Issues Found
- The post described Pub/Sub-triggered Cloud Functions as processing messages "or batch of messages". The shown 1st gen Pub/Sub function signature receives one Pub/Sub event at a time, so the wording was corrected to "each message".
- The prerequisites listed Python 3.8+, but the deploy command uses the `python311` runtime and Python 3.8 is past Cloud Functions decommission. The prerequisite was updated to Python 3.11 for the deployed examples.
- The Pub/Sub publishing docstring said attributes are indexed by Pub/Sub. Official docs state attributes are custom metadata and can be used for subscription filtering; the wording was corrected.
- The Monitoring metric descriptor example used `monitoring_v3.MetricDescriptor` and `monitoring_v3.LabelDescriptor`. The official Python sample imports these protobuf types from `google.api.metric_pb2` and `google.api.label_pb2`, so the imports and constructors were updated.
- The custom metric write sample was adjusted to use the official `TimeInterval` and `Point` construction style and to call out Cloud Monitoring's per-time-series write rate guidance.
- The deployment command now includes `--no-gen2` because the Python code uses the 1st gen `event, context` Pub/Sub signature.
- The active-device count example assumed a BigQuery table existed without saying so. The text now states that raw Pub/Sub messages must also be stored in BigQuery.
- The alerting examples used obsolete/incorrect `gcloud alpha monitoring policies create` threshold flags. They were updated to the current `gcloud monitoring policies create` flags: `--if` and `--duration`.
- The cost guidance now mentions batching both for cost reduction and for Cloud Monitoring per-time-series write limits.

## Review Notes
The local environment did not have `gcloud` installed, so CLI validation was performed against the official Google Cloud SDK reference instead of local `--help` output.
