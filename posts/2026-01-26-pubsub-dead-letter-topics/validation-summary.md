# Validation Summary: How to Implement Pub/Sub Dead Letter Topics

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Google Cloud Pub/Sub dead-letter topics
- Google Cloud CLI (`gcloud`)
- Python Pub/Sub and BigQuery client libraries
- Node.js Pub/Sub client library
- Go Pub/Sub client library
- Terraform Google provider
- Cloud Monitoring alerts and MQL

## Sources Consulted
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub subscription properties documentation: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud SDK `gcloud pubsub subscriptions create` reference: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud SDK `gcloud pubsub subscriptions update` reference: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics#set_a_dead-letter_topic_for_an_existing_subscription
- Google Cloud Pub/Sub REST subscription reference: https://docs.cloud.google.com/pubsub/docs/reference/rest/v1/projects.subscriptions
- Google Cloud Monitoring Pub/Sub metrics reference: https://docs.cloud.google.com/monitoring/api/metrics_gcp_p_z#pubsub
- Google Cloud Monitoring alert policy CLI documentation: https://docs.cloud.google.com/monitoring/alerts/policies-in-api
- Terraform Google provider `google_pubsub_subscription` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Terraform Google provider `google_pubsub_topic` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_topic

## Issues Found
- The post described dead-letter forwarding as exact and automatic after a specified number of attempts. Updated the wording to reflect Pub/Sub's documented best-effort behavior and approximately configured delivery attempts.
- The Go consumer dereferenced `msg.DeliveryAttempt` without checking for nil. Updated the example to handle nil delivery attempts safely.
- The dead-letter attributes table omitted `CloudPubSubDeadLetterSourceTopicPublishTime`. Added the missing documented attribute.
- The dead-letter BigQuery example tried to read `message_id` from message attributes. Updated it to pass `message.message_id` explicitly.
- The Monitoring alert used deprecated `topic/send_message_operation_count`. Updated the alert and MQL examples to use `subscription/dead_letter_message_count`.
- The Monitoring command used `gcloud alpha monitoring policies create`. Updated it to the current GA `gcloud monitoring policies create` command.
- Removed an unused Python import from the consumer example.

## Review Notes
Python and JavaScript code blocks were syntax-checked locally. `gcloud`, `go`, and `terraform` were not installed in the local environment, so those commands and snippets were verified against official documentation rather than executed locally.
