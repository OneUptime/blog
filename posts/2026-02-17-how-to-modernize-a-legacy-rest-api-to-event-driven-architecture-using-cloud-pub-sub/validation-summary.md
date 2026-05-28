# Validation Summary: Modernize a Legacy REST API to Event-Driven Architecture Using Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud CLI
- Cloud Run
- Python
- Flask-style REST APIs
- Event-driven architecture

## Sources Consulted
- Google Cloud Pub/Sub: Publish messages to topics: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub: Receive messages from pull subscriptions: https://docs.cloud.google.com/pubsub/docs/pull-messages
- Google Cloud Pub/Sub: Authentication for push subscriptions: https://docs.cloud.google.com/pubsub/docs/authenticate-push-subscriptions
- Google Cloud Pub/Sub: Dead-letter topics: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub: Subscription overview: https://docs.cloud.google.com/pubsub/docs/subscription-overview

## Issues Found
- The order API published to Pub/Sub without waiting for the publish future. Updated the example to call `future.result(timeout=10)` so the API only returns after Pub/Sub accepts the event or raises an error.
- The pull subscriber example started a streaming pull but did not block the process. Added `streaming_pull.result()` so the worker keeps listening.
- The authenticated push subscription example omitted required IAM setup for Cloud Run push delivery. Added commands to grant `roles/run.invoker` to the push service account and `roles/iam.serviceAccountTokenCreator` to the Pub/Sub service agent.

## Review Notes
- The post correctly notes that Pub/Sub subscribers should be idempotent because Pub/Sub defaults to at-least-once delivery and can redeliver messages.
- The `my-project`, service URL, region, and service account values remain placeholders and should be replaced in a real deployment.
