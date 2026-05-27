# Validation Summary: How to Use Config Connector to Create and Manage Pub/Sub Topics

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Config Connector
- Kubernetes custom resources
- Google Cloud IAM
- Google Cloud CLI
- BigQuery subscriptions

## Sources Consulted
- Config Connector PubSubTopic reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubtopic
- Config Connector PubSubSubscription reference: https://docs.cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubsubscription
- Config Connector PubSubSchema reference: https://cloud.google.com/config-connector/docs/reference/resource-docs/pubsub/pubsubschema
- Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Pub/Sub schema overview: https://docs.cloud.google.com/pubsub/docs/schemas
- Pub/Sub subscription overview and properties: https://cloud.google.com/pubsub/docs/subscription-overview
- Config Connector annotations reference: https://docs.cloud.google.com/config-connector/docs/reference/annotations

## Issues Found
- The `PubSubSchema` example used `cnrm.cloud.google.com/project-id`, but the Config Connector `PubSubSchema` resource requires `spec.projectRef`. Changed the example to use `projectRef.external`.
- The topic-level message retention explanation said only undelivered messages stay in the topic. Updated it to match Pub/Sub behavior: messages published during the retention window remain available to subscribers.
- The dead-letter queue IAM example granted only `roles/pubsub.publisher` on the dead-letter topic. Added the required `roles/pubsub.subscriber` grant on the source subscription so Pub/Sub can acknowledge forwarded messages.
- The BigQuery subscription example omitted the required Pub/Sub service agent permissions for BigQuery export subscriptions. Added `roles/bigquery.metadataViewer` and `roles/bigquery.dataEditor` IAM examples.
- Removed `dropUnknownFields: true` from the BigQuery subscription example because that field applies when `useTopicSchema` is enabled, which the example did not configure.

## Review Notes
The remaining Config Connector resource kinds, API groups, field names, duration values, subscription expiration behavior, dead-letter service agent format, and deletion-policy annotation were consistent with current official documentation.
