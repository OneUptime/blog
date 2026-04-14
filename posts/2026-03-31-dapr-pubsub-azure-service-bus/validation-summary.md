# Validation Summary: How to Set Up Dapr Pub/Sub with Azure Service Bus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Service Bus (Topics)
- Python (Flask for subscriber, requests for publisher)
- Node.js (Express subscriber)
- Azure CLI
- Kubernetes (secrets)
- Managed Identity (Azure AD authentication)

## Sources Consulted
- Dapr Azure Service Bus Topics component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Pub/Sub overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Azure Service Bus Managed Identity docs: https://learn.microsoft.com/en-us/azure/service-bus-messaging/service-bus-managed-service-identity
- Azure CLI Service Bus reference: https://learn.microsoft.com/en-us/cli/azure/servicebus

## Issues Found

1. **Incorrect metadata field name for entity management in sessions section**: The "Message Sessions for Ordered Delivery" YAML snippet used `enableEntityManagement` set to `"true"`, but the correct Dapr Azure Service Bus metadata field is `disableEntityManagement`. Changed to `disableEntityManagement` with value `"false"` (meaning entity management is enabled). Note: `enableEntityManagement` is a field used by Azure Event Hubs, not Service Bus, which was likely the source of confusion.

2. **Incorrect casing on scheduled enqueue metadata parameter**: The publisher example used `metadata.scheduled_enqueue_time_utc` (snake_case), but the correct Dapr metadata key for Azure Service Bus is `ScheduledEnqueueTimeUtc` (PascalCase). Changed to `metadata={"ScheduledEnqueueTimeUtc": "2026-04-01T09:00:00Z"}`.

## Review Notes
- The subscriber Python example references `TransientError` which is not defined or imported. This appears intentional as illustrative pseudocode showing the retry pattern, with the comment "Your business logic here" indicating it's a placeholder.
- The `import json` in the subscriber and `import time` in the publisher are unused imports, but this is a minor style issue in example code and does not affect correctness.
- The post correctly notes that "Azure Service Bus Data Owner" is the required role for managed identity. In practice, more granular roles (Azure Service Bus Data Sender / Data Receiver) could be used for least-privilege, but the post's recommendation is valid.
- The `requireSessions` metadata field in the sessions section is a Service Bus subscription-level property that Dapr manages through entity management; the post's usage is consistent with how Dapr auto-creates subscriptions with session support enabled.
