# Validation Summary: How to Use Bulk Publish API in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Pub/Sub building block, Bulk Publish API)
- JavaScript / Node.js
- Dapr JavaScript SDK (`@dapr/dapr`)
- HTTP REST API (curl)
- Apache Kafka, Azure Service Bus, Azure Event Hubs (as supported pub/sub components)

## Sources Consulted
- Dapr Pub/sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Bulk Publish and Subscribe guide — https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr v1.17 release blog (Feb 27, 2026) — https://blog.dapr.io/posts/2026/02/27/dapr-v1.17-is-now-available/
- Dapr JS SDK PubSubBulkPublishMessage type — https://github.com/dapr/js-sdk/blob/main/src/types/pubsub/PubSubBulkPublishMessage.type.ts
- Dapr JS SDK PubSubBulkPublishResponse type — https://github.com/dapr/js-sdk/blob/main/src/types/pubsub/PubSubBulkPublishResponse.type.ts
- Dapr components-contrib Kafka implementation — https://github.com/dapr/components-contrib/blob/main/pubsub/kafka/kafka.go

## Issues Found
1. **Outdated API endpoint (3 occurrences)**: The post used the alpha endpoint `/v1.0-alpha1/publish/bulk/...` which was promoted to stable `/v1.0/publish/bulk/...` in Dapr v1.17 (released February 2026). Updated all three occurrences (section heading description, curl example, and JavaScript fetch example) to use the stable `/v1.0/` path.

2. **Incorrect JS SDK field name**: The JavaScript SDK example used `data: order` as the message field, but the Dapr JS SDK `PubSubBulkPublishMessage` type uses `event`, not `data`. Changed `data` to `event` to match the SDK's actual API.

3. **Incomplete component support list**: The post listed Kafka and Azure Service Bus as having native bulk publish support but omitted Azure Event Hubs, which also implements native bulk publish. Added Azure Event Hubs to the list.

## Review Notes
- The batch size recommendation of 50-200 messages is not from official Dapr documentation but is a reasonable engineering guideline based on community testing. Community benchmarks showed that batch sizes of 500+ can trigger "message too large" errors depending on the broker.
- The JS SDK (v3.6.0) still internally calls the alpha endpoint — a future SDK release will likely update to the stable path. The HTTP examples in this post correctly use the stable path after our fix.
- The post's description of the fallback behavior for unsupported components is correct — Dapr does fall back to individual publishes. It's worth noting that Dapr performs these fallback publishes in parallel, not sequentially, which still provides some optimization at the app-to-sidecar level.
- A successful bulk publish returns HTTP 204 with no body; the `failedEntries` response only appears on partial failure (HTTP 500). The post could be more explicit about this but the current description is not incorrect.
