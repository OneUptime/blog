# Validation Summary: How to Configure Pub/Sub Subscriptions

## Status
validated

## Post Type
Technical guide / tutorial

## Technologies Covered
- Google Cloud Pub/Sub
- gcloud CLI
- Node.js
- Express.js
- @google-cloud/pubsub
- google-auth-library
- Google Cloud Monitoring
- BigQuery
- Terraform Google provider

## Sources Consulted
- Google Cloud Pub/Sub subscription properties: https://cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud SDK `gcloud pubsub subscriptions create`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Pub/Sub push subscriptions: https://cloud.google.com/pubsub/docs/push
- Google Cloud Pub/Sub subscription filters: https://cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud Pub/Sub exactly-once delivery: https://cloud.google.com/pubsub/docs/exactly-once-delivery
- Google Cloud Pub/Sub dead-letter topics: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub monitoring metrics: https://cloud.google.com/monitoring/api/metrics_gcp_p_z#gcp-pubsub
- Node.js Pub/Sub `SubscriberOptions` reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/subscriberoptions
- Node.js Pub/Sub `Message` reference: https://cloud.google.com/nodejs/docs/reference/pubsub/latest/pubsub/message
- Terraform Google provider `google_pubsub_subscription` documentation: https://github.com/hashicorp/terraform-provider-google/blob/main/website/docs/r/pubsub_subscription.html.markdown

## Issues Found
- Corrected push acknowledgment handling. Pub/Sub push retries all status codes except `102`, `200`, `201`, `202`, and `204`; the post incorrectly said a `400` response would not be retried and implied any `2xx` response acknowledges the message.
- Updated Node.js subscriber flow-control options from outdated `maxMessages` / `allowExcessMessages` to current `maxOutstandingMessages`.
- Corrected the manual ack-deadline extension example to use the current Node.js `message.modAck()` API instead of the nonexistent `message.modifyAckDeadline()`.
- Corrected the exactly-once delivery example. Exactly-once is enabled on the subscription resource, not by passing `enableExactlyOnceDelivery` to `pubsub.subscription()`, and `ackWithResponse()` resolves or rejects rather than returning the string `"SUCCESS"`.
- Updated message retention limits from a 7-day maximum to the current 31-day maximum for subscriptions.
- Corrected subscription filter examples and limitations. Pub/Sub filters do not support numeric comparison operators, and the current maximum filter length is 256 bytes, not 4096 characters.
- Added required IAM grants for dead-letter topics so the Pub/Sub service agent can publish to the DLQ topic and acknowledge forwarded messages on the source subscription.
- Corrected dead-letter metadata extraction by removing the unsupported `CloudPubSubDeadLetterSourceMessageId` attribute and using documented dead-letter attributes.
- Updated the Terraform provider version constraint to a current major version, changed subscription topic references to topic IDs, replaced unsupported push custom attribute `x-custom-header` with supported `x-goog-version`, and added DLQ IAM resources.
- Corrected the Cloud Monitoring nack metric from nonexistent `subscription/nack_message_count` to `subscription/nack_requests`, and added `subscription/expired_ack_deadlines_count`.

## Review Notes
The post is technically relevant and useful after these corrections. Some examples remain illustrative and still require project-specific resources, IAM setup, API enablement, and application-specific handlers before they can be run unchanged in production.
