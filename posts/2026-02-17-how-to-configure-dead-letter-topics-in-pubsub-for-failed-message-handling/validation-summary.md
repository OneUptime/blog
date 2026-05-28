# Validation Summary: How to Configure Dead Letter Topics in Pub/Sub for Failed Message Handling

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub dead-letter topics
- Google Cloud CLI
- Terraform Google provider
- Python Google Cloud Pub/Sub client library
- Cloud Monitoring alert policies

## Sources Consulted
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud SDK `gcloud pubsub subscriptions update` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Google Cloud Pub/Sub subscription properties documentation: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Terraform Google provider `google_pubsub_subscription` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Terraform Google provider `google_pubsub_topic` resource documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic
- Google Cloud Pub/Sub Python publisher client source/API behavior: https://github.com/googleapis/python-pubsub

## Issues Found
- The post said a failed message sits in a subscription forever without a dead-letter topic. Pub/Sub retains unacknowledged messages only until the subscription message retention duration expires, so this was corrected.
- The post described dead-letter forwarding as happening after an exact configured number of delivery attempts. Pub/Sub documents this as approximate and best effort, so the wording was updated.
- The post said missing service-agent permissions cause dead-letter forwarding to silently fail indefinitely. Pub/Sub only counts delivery attempts for dead lettering when the dead-letter topic is configured correctly with the required IAM permissions, and messages remain subject to retention, so this was corrected.
- The DLQ Python processor republished a message and then immediately acknowledged the DLQ message without waiting for the publish future to complete. The sample now waits for `future.result()` before acknowledging, avoiding message loss on publish failure.
- The DLQ Python processor assumed every valid JSON message was an object and would crash on valid JSON arrays or scalars. A type guard was added before mutating the decoded payload.
- The monitoring wording implied `num_undelivered_messages` was the general key metric for dead lettering. It was narrowed to backlog-based alerts, while the official forwarded-message metric remains `subscription/dead_letter_message_count`.

## Review Notes
The `gcloud` flags, Terraform Pub/Sub resource fields, required Pub/Sub service-agent IAM roles, delivery-attempt range of 5-100, and Python publish attribute usage were verified against current official documentation or source. The local environment did not have `gcloud` installed, so CLI validation used official Google Cloud SDK reference documentation rather than local `--help` output.
