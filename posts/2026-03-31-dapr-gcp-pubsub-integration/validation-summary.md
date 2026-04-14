# Validation Summary: How to Use Dapr with GCP Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Google Cloud Pub/Sub
- gcloud CLI
- Python (Dapr SDK)
- JavaScript / Express.js
- Kubernetes (declarative component and subscription YAML)

## Sources Consulted
- Dapr GCP Pub/Sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-gcp-pubsub/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr dead letter topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Python SDK source (publish_event method): https://github.com/dapr/python-sdk/blob/master/dapr/clients/grpc/client.py
- gcloud pubsub topics create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create

## Issues Found

1. **Incorrect metadata field name `maxConcurrentHandlers`**: The Dapr GCP Pub/Sub component does not have a metadata field called `maxConcurrentHandlers`. The correct field name is `maxConcurrentConnections`. Changed `maxConcurrentHandlers` to `maxConcurrentConnections` in the component YAML.

2. **Python SDK `data` parameter does not accept a dict**: The `publish_event` method in the Dapr Python SDK only accepts `str` or `bytes` for the `data` parameter. Passing a dict directly would raise a `ValueError`. Added `import json` and wrapped the dict with `json.dumps()` to serialize it properly.

## Review Notes
- The dead letter configuration is shown as component-level metadata fields (`deadLetterTopic`, `maxDeliveryAttempts`), which is correct for GCP-native dead lettering at the component level. Dapr also supports dead letter configuration at the subscription level via the `deadLetterTopic` field in the Subscription spec. The blog post's approach is valid.
- The `--message-retention-duration=1d` flag on `gcloud pubsub topics create` is valid syntax.
- The declarative Subscription uses `apiVersion: dapr.io/v2alpha1`, which is the current correct version.
- The `gcloud pubsub subscriptions create` command with `--ack-deadline=60` is valid (range is 10-600 seconds).
