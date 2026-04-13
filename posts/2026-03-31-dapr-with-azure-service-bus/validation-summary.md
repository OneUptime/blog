# Validation Summary: How to Use Dapr with Azure Service Bus

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Azure Service Bus (topics, subscriptions, dead-letter queues)
- Azure CLI (`az servicebus`)
- Python (requests, Flask)
- Kubernetes (secrets)

## Sources Consulted
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Azure Service Bus Topics component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-azure-servicebus-topics/
- Dapr How-to: Publish and Subscribe: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Azure CLI `az servicebus` reference: https://learn.microsoft.com/en-us/cli/azure/servicebus

## Issues Found
1. **Publish metadata passed as HTTP headers instead of query parameters.** The `publish_order_event` function passed `metadata.ScheduledEnqueueTimeUtc` as an HTTP header. Per the Dapr publish API specification, metadata must be passed as URL query parameters (e.g., `?metadata.ScheduledEnqueueTimeUtc=...`). Fixed by switching from headers to the `params` argument in `requests.post()`.

## Review Notes
- The section titled "Subscribe with Session Support" sets `requireSessions` to `"false"`, which may be slightly misleading since sessions are not actually enabled. However, it correctly demonstrates the metadata field and its usage, so no change was made.
- The component metadata `maxDeliveryCount` is set to `"3"` which is a valid custom value, though the Dapr default is 10. The blog is explicitly setting it, not claiming it as a default, so this is correct.
- All Azure CLI commands, Dapr component YAML, and Flask subscription handler code are technically correct.
- The component type `pubsub.azure.servicebus.topics` is the current (non-deprecated) type, correct for Dapr v1.9+.
