# Validation Summary: How to Implement Message Priority with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- RabbitMQ (priority queues)
- Python (httpx, FastAPI)
- Kubernetes (Deployment manifests)

## Sources Consulted
- Dapr RabbitMQ pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-rabbitmq/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr pub/sub how-to guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- RabbitMQ priority queue documentation: https://www.rabbitmq.com/docs/priority

## Issues Found

### 1. `maxPriority` incorrectly placed in Component metadata
- **What was wrong:** The `maxPriority` field was set in the Component spec metadata. Per the official Dapr docs, `maxPriority` is a per-subscription metadata field that belongs in the `Subscription` resource, not the `Component` resource.
- **What was changed:** Removed `maxPriority` from the Component metadata and added a separate `Subscription` resource (apiVersion `dapr.io/v2alpha1`) with `maxPriority: "9"` in its metadata section.
- **Why:** Queue priority configuration is per-subscription in Dapr's RabbitMQ integration. Different subscriptions may need different max priority values.

### 2. Priority metadata passed via HTTP headers instead of query parameters
- **What was wrong:** The `publish_with_priority` function passed `metadata.priority` as an HTTP header. The Dapr pub/sub HTTP API requires metadata to be passed as URL query parameters, not headers.
- **What was changed:** Changed from `headers={"metadata.priority": str(priority)}` to `params={"metadata.priority": str(priority)}` in the httpx POST call, keeping `Content-Type` as a header.
- **Why:** The Dapr pub/sub publish API specification states metadata must be prefixed with `metadata.` and sent as query string parameters.

### 3. `maxPriority` value off-by-one
- **What was wrong:** `maxPriority` was set to `"10"` while the post described a 0-9 priority range. Since `maxPriority` defines the maximum priority value (inclusive), setting it to 10 creates levels 0-10 (11 levels), not 0-9.
- **What was changed:** Changed `maxPriority` from `"10"` to `"9"` to correctly represent the 0-9 range described in the post.
- **Why:** Consistency between the documented range (0-9) and the actual configuration.

## Review Notes
- The `host` metadata field name in the RabbitMQ Component is the established field name for the AMQP connection URI in the Dapr RabbitMQ pub/sub component.
- The Kubernetes Deployment YAML snippets are abbreviated (missing selector, labels, container spec) which is acceptable for a blog post focused on the Dapr-specific configuration.
- The `asyncio` import in the consumer code is unused but harmless in context of an abbreviated example.
- The `await` calls at module level in the publisher examples would need to run inside an async context (e.g., `asyncio.run()`) in practice, but this is a standard simplification in async Python tutorials.
