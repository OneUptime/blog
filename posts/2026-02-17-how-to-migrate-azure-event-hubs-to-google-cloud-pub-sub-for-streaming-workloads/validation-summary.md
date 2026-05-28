# Validation Summary: How to Migrate Azure Event Hubs to Google Cloud Pub/Sub for Streaming Workloads

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Event Hubs
- Google Cloud Pub/Sub
- Google Cloud CLI
- Python
- Azure Event Hubs Python SDK
- Google Cloud Pub/Sub Python client
- BigQuery subscriptions
- Cloud Storage subscriptions
- Pub/Sub schemas and ordered delivery

## Sources Consulted
- Google Cloud Pub/Sub ordering documentation: https://docs.cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub Python PublisherOptions reference: https://docs.cloud.google.com/python/docs/reference/pubsub/latest/google.cloud.pubsub_v1.types.PublisherOptions
- Google Cloud Pub/Sub schemas overview: https://docs.cloud.google.com/pubsub/docs/schemas
- Google Cloud SDK reference for `gcloud pubsub schemas create`: https://docs.cloud.google.com/sdk/gcloud/reference/pubsub/schemas/create
- Google Cloud Pub/Sub schema association documentation: https://docs.cloud.google.com/pubsub/docs/associate-schema-topic
- Google Cloud Pub/Sub BigQuery subscription documentation: https://docs.cloud.google.com/pubsub/docs/create-bigquery-subscription
- Google Cloud Pub/Sub Cloud Storage subscription documentation: https://docs.cloud.google.com/pubsub/docs/create-cloudstorage-subscription
- Google Cloud Pub/Sub dead-letter topics documentation: https://docs.cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub quotas and limits: https://docs.cloud.google.com/pubsub/quotas
- Microsoft Learn Azure Event Hubs overview: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-about
- Microsoft Learn Azure Event Hubs tier comparison: https://learn.microsoft.com/en-us/azure/event-hubs/compare-tiers
- Microsoft Learn Azure Event Hubs Capture overview: https://learn.microsoft.com/en-us/azure/event-hubs/event-hubs-capture-overview
- Microsoft Learn Azure Event Hubs Schema Registry concepts: https://learn.microsoft.com/en-us/azure/event-hubs/schema-registry-concepts
- Microsoft Learn Azure Event Hubs Python `EventHubConsumerClient` reference: https://learn.microsoft.com/en-us/python/api/azure-eventhub/azure.eventhub.eventhubconsumerclient

## Issues Found
- Pub/Sub ordered delivery was described as requiring only publisher ordering keys. I added the required subscription creation flag `--enable-message-ordering`, because Pub/Sub ordered delivery must be enabled on the receiving subscription.
- The BigQuery subscription example used `my-project:events_dataset.raw_events`. I changed it to the current documented `PROJECT.DATASET.TABLE` format: `my-project.events_dataset.raw_events`.
- The Event Hubs scaling comparison only mentioned throughput units. I updated it to mention throughput or capacity units depending on tier.
- The Event Hubs message size comparison said Event Hubs allows 1 MB by default. I changed it to the current tier-specific limits: 256 KB in Basic, 1 MB in Standard and Premium, and 20 MB in Dedicated.
- The Event Hubs retention comparison said 1-90 days depending on tier. I changed it to the current tier-specific maximums: up to 1, 7, or 90 days depending on tier.

## Review Notes
- Python code blocks were parsed locally with Python `ast` and are syntactically valid.
- The local environment did not have `gcloud` installed, so Google Cloud CLI command verification was performed against official Google Cloud SDK and Pub/Sub documentation.
- BigQuery and Cloud Storage subscriptions require the destination resources and Pub/Sub service agent IAM permissions to be configured before the commands will succeed.
