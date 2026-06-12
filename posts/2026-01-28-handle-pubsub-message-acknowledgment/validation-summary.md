# Validation Summary: How to Handle Pub/Sub Message Acknowledgment

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub pull subscriptions
- Google Cloud Pub/Sub push subscriptions
- Pub/Sub acknowledgment deadlines and redelivery
- Pub/Sub dead-letter topics
- Python Google Cloud Pub/Sub client library
- Express.js HTTP endpoint handling
- Google Cloud Monitoring metrics for Pub/Sub

## Sources Consulted
- Google Cloud Pub/Sub pull subscriptions: https://docs.cloud.google.com/pubsub/docs/pull
- Google Cloud Pub/Sub push subscriptions: https://docs.cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub subscription properties and ack deadlines: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub REST subscription reference: https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
- Google Cloud Pub/Sub acknowledge method reference: https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions/acknowledge
- Google Cloud Pub/Sub dead-letter topics: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub monitoring: https://docs.cloud.google.com/pubsub/docs/monitoring
- Google Cloud Pub/Sub Python SubscriberClient reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.client.Client

## Issues Found
- Clarified that a subscriber does not directly send an unprocessed source message to a dead letter topic by choosing not to ack it. Dead-letter forwarding must be configured on the subscription, and Pub/Sub forwards the message after repeated delivery attempts.
- Clarified that delivery attempts should be tracked when a dead letter policy is configured, because Pub/Sub delivery-attempt counting is tied to correctly configured dead lettering and IAM permissions.
- Replaced "Ack deadline exceeded errors" with "Expired ack deadline count" to match the documented Pub/Sub monitoring terminology and metric behavior.

## Review Notes
The Python sample uses current `SubscriberClient.pull`, `modify_ack_deadline`, and `acknowledge` APIs. For production consumers, the higher-level streaming pull subscriber is usually preferred because the client library manages lease extension automatically, but the low-level pull example is technically valid for demonstrating explicit ack deadline extension.
