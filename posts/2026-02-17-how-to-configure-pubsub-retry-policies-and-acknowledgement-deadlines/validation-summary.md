# Validation Summary: How to Configure Pub/Sub Retry Policies and Acknowledgement Deadlines

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Google Cloud Pub/Sub
- Pub/Sub subscriptions, retry policies, acknowledgement deadlines, and dead letter topics
- Google Cloud CLI
- Terraform Google provider
- Python Pub/Sub client library
- Cloud Monitoring

## Sources Consulted
- Google Cloud Pub/Sub subscription properties: https://docs.cloud.google.com/pubsub/docs/subscription-properties
- Google Cloud Pub/Sub subscription retry policy: https://docs.cloud.google.com/pubsub/docs/subscription-retry-policy
- Google Cloud SDK `gcloud pubsub subscriptions update` reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/update
- Terraform Google provider `google_pubsub_subscription` resource: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Python Pub/Sub `FlowControl` reference: https://cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.FlowControl
- Pub/Sub monitoring guide: https://docs.cloud.google.com/pubsub/docs/monitoring
- Cloud Monitoring time series API guidance: https://docs.cloud.google.com/monitoring/custom-metrics/reading-metrics

## Issues Found
- The long-running processing Terraform example set `maximum_backoff = "3600s"`, but Pub/Sub subscription retry backoff values must be between 0 and 600 seconds. Changed it to `600s` and updated the comment.
- The monitoring section used older/general backlog metric names where current Pub/Sub monitoring guidance recommends the regional backlog metrics. Updated the examples to `num_unacked_messages_by_region` and `oldest_unacked_message_age_by_region`.
- The monitoring command used `gcloud monitoring read`, which is not a current GA `gcloud monitoring` command. Replaced it with a Monitoring API `timeSeries` request using `curl` and `gcloud auth print-access-token`.

## Review Notes
The Python examples use current Pub/Sub client library APIs, including `SubscriberClient`, `subscribe`, `FlowControl.max_lease_duration`, `pull`, `modify_ack_deadline`, and `acknowledge`. The retry and dead letter policy examples are valid, but dead letter forwarding also requires the Pub/Sub service agent to have publish permission on the dead letter topic in a real deployment.
