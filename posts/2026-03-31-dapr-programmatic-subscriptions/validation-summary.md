# Validation Summary: How to Use Programmatic Subscriptions in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, programmatic subscriptions)
- Node.js with Express
- Python with FastAPI and Dapr Python SDK
- Dapr CLI
- Common Expression Language (CEL) for routing rules

## Sources Consulted
- Dapr Subscription Methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Pub/Sub How-To guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Python SDK FastAPI extension: https://docs.dapr.io/developing-applications/sdks/python/python-sdk-extensions/python-fastapi/
- Dapr CLI run command reference: https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr message routing documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/

## Issues Found
1. **Python SDK `subscribe` decorator parameter name** (line 140): The `@dapr_app.subscribe()` decorator was using `pubsub_name="pubsub"` but the correct parameter name in the Dapr Python SDK is `pubsub` (not `pubsub_name`). Changed to `pubsub="pubsub"`.

## Review Notes
- The `metadata.maxDeliveryCount` field shown in the dead letter example is component-specific (e.g., supported by Azure Service Bus) rather than universally available across all pub/sub components. The post does not claim it is universal, so this is not an error, but readers should be aware it depends on the underlying message broker.
- The `route` field (singular) used in the basic examples is valid for simple programmatic subscriptions. The `routes` field (with `rules` and `default`) is used for content-based routing, which is also correctly demonstrated.
- The CEL expression syntax `event.type == "..."` is correct — Dapr uses CloudEvents attributes accessible via `event.type`, `event.source`, `event.data`, etc.
- All Node.js/Express code examples are syntactically correct and follow the expected Dapr programmatic subscription patterns.
- The `dapr run` CLI flags (`--app-id`, `--app-port`) and the metadata API endpoint (`/v1.0/metadata`) are correct.
