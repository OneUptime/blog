# Validation Summary: How to Set Up Retry Policies and Dead Letter Queues for Reliable Microservice

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub retry policies
- Pub/Sub dead-letter topics
- Google Cloud CLI
- Python Pub/Sub client library
- Cloud Firestore Python client library
- Cloud Monitoring alerting policies

## Sources Consulted
- Google Cloud Pub/Sub subscription retry policy documentation: https://cloud.google.com/pubsub/docs/subscription-retry-policy
- Google Cloud Pub/Sub dead-letter topics documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud SDK reference for `gcloud pubsub subscriptions create`: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Python Pub/Sub `Message` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.subscriber.message.Message
- Google Cloud Python Pub/Sub `FlowControl` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.FlowControl
- Google Cloud SDK reference for `gcloud alpha monitoring policies create`: https://cloud.google.com/sdk/gcloud/reference/alpha/monitoring/policies/create
- Google Cloud Firestore Python client reference: https://cloud.google.com/python/docs/reference/firestore/latest

## Issues Found
- The post said Pub/Sub uses exponential backoff by default. Google Cloud documentation states the default retry policy is immediate redelivery. Updated the explanation to describe immediate redelivery and message retention accurately.
- The retry-delay comments described exact attempt-by-attempt delays. Pub/Sub retry backoff is best-effort, so the comments now describe exponential backoff without promising exact timings.
- The DLQ explanation said messages are forwarded only after exhausting all retry attempts. Pub/Sub dead-letter forwarding and delivery-attempt tracking are approximate and best-effort, so the wording now reflects that.
- The consumer snippet referenced an undefined `process_order` function. Added a minimal `ProcessResult` and `process_order` placeholder so the example is syntactically complete.
- The DLQ processor used `message.delivery_attempt` as if it represented source-subscription delivery attempts. For dead-lettered messages, source delivery count is provided in the `CloudPubSubDeadLetterSourceDeliveryCount` attribute. Updated the Firestore record and log output to use the dead-letter source attributes.
- The replay snippet republished an `original_message_id` sourced from the DLQ message ID. Pub/Sub does not expose the original message ID in the documented dead-letter attributes, so the attribute was renamed to `dead_letter_message_id`.
- The Cloud Monitoring example used unsupported `--condition-threshold-value` and `--condition-threshold-comparison` flags. Updated it to use the documented `--if='> 0'` and `--duration=60s` flags.
- The summary recommended max delivery attempts between 3 and 10. Pub/Sub dead-letter policy requires a maximum delivery attempt value between 5 and 100, so the recommendation now starts at 5.

## Review Notes
The local workspace does not have `gcloud` installed, so CLI verification was performed against the official Google Cloud SDK reference instead of local `--help` output. Python snippets were syntax-checked with `python3` after edits.
