# Validation Summary: How to Migrate On-Premises Kafka Clusters to Google Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Google Cloud Pub/Sub
- Apache Kafka
- Google Cloud CLI
- Python
- Google Cloud Pub/Sub Python client library
- Cloud Monitoring

## Sources Consulted
- Google Cloud Pub/Sub ordering documentation: https://cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publisher documentation: https://cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub exactly-once delivery documentation: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub subscription properties documentation: https://cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub replay and seek documentation: https://cloud.google.com/pubsub/docs/replay-overview
- Google Cloud Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub quotas and limits documentation: https://cloud.google.com/pubsub/quotas
- Google Cloud Pub/Sub monitoring documentation: https://cloud.google.com/pubsub/docs/monitoring
- Google Cloud Monitoring Pub/Sub metrics list: https://cloud.google.com/monitoring/api/metrics_gcp_p_z
- Google Cloud SDK `gcloud pubsub topics create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/topics/create
- Google Cloud SDK `gcloud pubsub subscriptions create` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK `gcloud pubsub subscriptions update` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Pub/Sub Python `PublisherOptions` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.PublisherOptions
- Apache Kafka design documentation: https://kafka.apache.org/documentation/#design
- Apache Kafka broker configuration documentation: https://kafka.apache.org/documentation/#brokerconfigs

## Issues Found
- The post showed `gcloud pubsub topics create orders-events --message-ordering`, but message ordering is enabled on subscriptions and publisher clients, not on topics. Removed the invalid topic flag and clarified that ordering is enabled on the subscription.
- The Pub/Sub Python publisher example used an `ordering_key` without enabling message ordering on the publisher client. Added `PublisherOptions(enable_message_ordering=True)` to make the ordered publishing example valid.
- The Kafka/Pub/Sub exactly-once comparison said Pub/Sub only provides at-least-once delivery. Updated it to reflect Pub/Sub's exactly-once delivery support for pull subscriptions while preserving the important caveat that application side effects still require idempotency or deduplication.
- The retention/replay rows were too imprecise for Pub/Sub. Clarified that the 7-day default applies to unacknowledged subscription messages and that Pub/Sub seek supports timestamps or snapshots.
- The dual-write Kafka snippet passed bytes and already-serialized JSON into a producer configured with serializers, which would not match the earlier Kafka producer example. Changed it to pass the string key and original order object.
- The monitoring section listed deprecated Pub/Sub metrics. Replaced them with current metrics recommended by Google Cloud documentation.

## Review Notes
The migration guidance is broadly accurate, but production migrations should also plan for IAM on dead-letter topics, ordering-region constraints, publisher error handling for ordered keys, and explicit validation of message schemas and idempotency.
