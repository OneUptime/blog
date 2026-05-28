# Validation Summary: How to Filter Pub/Sub Messages Using Subscription Filters

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub subscription filters
- Google Cloud CLI (`gcloud`)
- Terraform Google provider
- Python Pub/Sub client library
- Cloud Monitoring / PromQL

## Sources Consulted
- Google Cloud Pub/Sub: Filter messages from a subscription: https://docs.cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud SDK: `gcloud pubsub subscriptions create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud Pub/Sub: Publish messages and message attributes: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub: Monitor Pub/Sub in Cloud Monitoring: https://docs.cloud.google.com/pubsub/docs/monitoring
- Terraform Registry: `google_pubsub_subscription`: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription

## Issues Found
- The `gcloud pubsub subscriptions create` examples used `--filter`, which is a generic gcloud list/filter flag and not the Pub/Sub subscription filter flag. Changed these examples to use the documented `--message-filter` flag.
- The existence-check example used `hasPrefix(attributes.trace_id, "")`. Changed it to the documented attribute-key existence syntax, `attributes:trace_id`.
- The limitations section said changing a filter requires deleting and recreating the subscription and losing unprocessed messages. Updated this to match Google Cloud's documented snapshot-and-seek migration path, which can preserve messages during the transition.
- The billing explanation said filtering does not save on Pub/Sub costs. Updated it to clarify that automatically acknowledged filtered-out messages do not incur outbound message fees, but do incur message delivery fees and any seek-related storage fees.
- The monitoring example used an invalid `gcloud monitoring read` command and checked a backlog metric that does not show filtered-out messages. Replaced it with a PromQL query using `subscription/ack_message_count` with `delivery_type="filter"`, as documented for monitoring subscription filters.

## Review Notes
The Python publisher examples use the current `PublisherClient.publish()` attribute pattern, and the Terraform `google_pubsub_subscription` snippets use the documented `filter` field. The post does not specify provider or client-library versions, so the review was performed against current official documentation as of 2026-05-28.
