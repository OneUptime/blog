# Validation Summary: How to Migrate from Pub/Sub Lite to Standard Pub/Sub

## Status
validated

## Post Type
Technical migration guide

## Technologies Covered
- Google Cloud Pub/Sub
- Google Cloud Pub/Sub Lite
- Terraform Google provider
- Python Google Cloud Pub/Sub client library
- Google Cloud Monitoring

## Sources Consulted
- Google Cloud Pub/Sub Lite documentation: https://docs.cloud.google.com/pubsub/lite/docs
- Google Cloud "Choose Pub/Sub or Pub/Sub Lite": https://docs.cloud.google.com/pubsub/docs/choosing-pubsub-or-lite
- Google Cloud Pub/Sub ordering documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publisher documentation: https://docs.cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub quotas and limits: https://docs.cloud.google.com/pubsub/quotas
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Terraform Google provider `google_pubsub_subscription` documentation: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/pubsub_subscription
- Python Pub/Sub `PublisherOptions` reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.PublisherOptions

## Issues Found
- The post described Pub/Sub Lite availability as only zonal. Google documents both zonal and regional Lite topics, so the introduction, comparison table, and regional/zonal migration note were updated.
- The post referred to Pub/Sub Lite deprecation without the official turn-down date. Added the March 18, 2026 turn-down date from Google Cloud documentation.
- The Terraform example referenced `google_pubsub_topic.events_dlq` without defining it. Added a dead-letter topic resource.
- The Terraform dead-letter policy omitted the Pub/Sub service account IAM grants required for forwarding messages to a dead-letter topic. Added publisher permission on the dead-letter topic and subscriber permission on the source subscription.
- The subscriber Python snippet used `json.loads` without importing `json`. Added the missing import.
- The partition-to-ordering-key explanation implied ordering keys were a direct partition replacement. Added a caveat that ordering keys are only similar for per-entity ordering and are not a direct replacement for partitions.
- The validation script claimed to compare Lite and standard processing but only queried the standard Pub/Sub backlog. Renamed the function and comments so the code accurately describes what it checks.

## Review Notes
The guide is technically relevant and broadly accurate after the fixes. Future improvements could mention Google Cloud's Pub/Sub Lite export-to-Pub/Sub option and the 1 MBps publish throughput limit per Pub/Sub ordering key, but those omissions do not make the current migration guide incorrect.
