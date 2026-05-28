# Validation Summary: How to Migrate Azure Service Bus to Google Cloud Pub/Sub

## Status
validated

## Post Type
Tutorial / Migration guide

## Technologies Covered
- Azure Service Bus
- Google Cloud Pub/Sub
- Google Cloud Tasks
- Google Cloud Firestore
- Azure CLI
- Google Cloud CLI
- Python

## Sources Consulted
- Google Cloud Pub/Sub ordering documentation: https://cloud.google.com/pubsub/docs/ordering
- Google Cloud Pub/Sub publisher documentation: https://cloud.google.com/pubsub/docs/publisher
- Google Cloud Pub/Sub subscription filtering documentation: https://cloud.google.com/pubsub/docs/subscription-message-filter
- Google Cloud Pub/Sub dead-letter topic documentation: https://cloud.google.com/pubsub/docs/dead-letter-topics
- Google Cloud Pub/Sub quotas and limits: https://cloud.google.com/pubsub/quotas
- Google Cloud CLI Pub/Sub subscriptions create reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/create
- Google Cloud CLI Pub/Sub subscriptions pull reference: https://cloud.google.com/sdk/gcloud/reference/pubsub/subscriptions/pull
- Google Cloud Tasks HTTP target task documentation: https://cloud.google.com/tasks/docs/creating-http-target-tasks
- Azure Service Bus quotas: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-quotas
- Azure Service Bus duplicate detection documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/duplicate-detection
- Azure Service Bus message sessions documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sessions
- Azure Service Bus transactions documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-transactions
- Azure Service Bus scheduled messages documentation: https://learn.microsoft.com/en-us/azure/service-bus-messaging/message-sequencing
- Azure Python SDK ServiceBusMessage reference: https://learn.microsoft.com/en-us/python/api/azure-servicebus/azure.servicebus.servicebusmessage

## Issues Found
- The Azure Service Bus message size comparison was too broad for Premium messaging. Updated it to specify that the 100 MB limit applies over AMQP for Premium.
- The dead-letter setup created only the dead-letter topic. Added a subscription for the dead-letter topic so failed messages can be retained and inspected.
- The Pub/Sub ordered publishing example used an ordering key but did not enable message ordering on the Python publisher client. Added `PublisherOptions(enable_message_ordering=True)`.
- The ordered publishing example used `json.dumps` without importing `json`. Added the missing import.
- The Azure Service Bus producer example used `json.dumps` and `timedelta` without importing `json` and `timedelta`. Added the missing imports.
- The Cloud Tasks example assigned the result of `Timestamp().FromDatetime(deliver_at)` directly to `schedule_time`. `FromDatetime` mutates the timestamp object, so the example now creates a `Timestamp`, calls `FromDatetime`, and assigns the populated object.
- The validation command used `gcloud pubsub subscriptions pull --auto-ack --limit=0` to check unacknowledged messages. Replaced it with a non-acknowledging pull of a small sample, avoiding accidental acknowledgement and using a meaningful limit.
- The validation step created a dead-letter reader subscription late in the process. Updated it to pull from the dead-letter subscription created during setup.

## Review Notes
The guide is technically valid for a conceptual migration, but production migrations should also account for IAM on Pub/Sub dead-letter topics, message attribute naming conventions, retry policy settings, exactly-once delivery tradeoffs, and regional ordering constraints.
