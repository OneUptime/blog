# Validation Summary: How to Migrate Amazon SQS Queues to Google Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Amazon SQS
- Google Cloud Pub/Sub
- Terraform Google provider
- Python
- boto3
- google-cloud-pubsub Python client
- Redis / Memorystore

## Sources Consulted
- Google Cloud Pub/Sub ordering documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub pull subscription documentation: https://docs.cloud.google.com/pubsub/docs/pull
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub exactly-once delivery documentation: https://docs.cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub subscription overview and properties: https://cloud.google.com/pubsub/docs/subscription-overview and https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub REST subscription resource reference: https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
- Terraform Google provider `google_pubsub_topic` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Terraform Google provider `google_pubsub_subscription` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Amazon SQS `SendMessage` API reference: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/APIReference/API_SendMessage.html
- Amazon SQS FIFO exactly-once processing documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/FIFO-queues-exactly-once-processing.html
- Amazon SQS visibility timeout documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-visibility-timeout.html
- Amazon SQS delay queues documentation: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-delay-queues.html

## Issues Found
- The post described Pub/Sub as push-based and grouped StreamingPull with push delivery. Updated the introduction to state that Pub/Sub supports pull subscriptions, StreamingPull clients, and push subscriptions.
- The concept map said FIFO queues map to a "subscription with ordering." Updated it to include both ordering keys and subscription message ordering, which are both required for ordered delivery.
- The Terraform topic comment said `message_storage_policy` enables message ordering. Changed the comment because this block constrains message storage regions; ordering is controlled by ordering keys and subscription settings.
- The dead-letter Terraform example granted only publisher permission on the dead-letter topic. Added the source subscription IAM binding for the Pub/Sub service account with `roles/pubsub.subscriber`, which is required so Pub/Sub can acknowledge messages when forwarding to the dead-letter topic.
- The Python Pub/Sub producer examples published with an `ordering_key` but did not enable message ordering on the publisher client. Added `PublisherOptions(enable_message_ordering=True)` to both producer snippets.
- The dual-write SQS example set `MessageGroupId` for FIFO ordering but had no way to set `MessageDeduplicationId`. Added an optional `deduplication_id` argument and forwarded it to SQS when provided.
- The deduplication section implied Pub/Sub exactly-once delivery is a replacement for SQS FIFO publish-side deduplication. Updated the wording to clarify that Pub/Sub exactly-once delivery prevents duplicate redelivery after successful acknowledgment but does not deduplicate separate publish attempts with different message IDs.
- The deduplication code used Pub/Sub `message_id` as the idempotency key. Changed it to use an application-level key (`order_id`) so it also handles duplicate publishes that receive different Pub/Sub message IDs.

## Review Notes
- Python code blocks were parsed with `ast.parse` and are syntactically valid.
- Terraform snippets were reviewed against the current provider documentation, but Terraform was not run because the post snippet does not include a complete module with provider variables.
