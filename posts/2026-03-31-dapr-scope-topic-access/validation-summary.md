# Validation Summary: How to Scope Topic Access to Specific Applications in Dapr

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr pub/sub topic scoping (`publishingScopes`, `subscriptionScopes`, `allowedTopics`)
- Dapr component-level scoping (`scopes`)
- Redis pub/sub component (`pubsub.redis`)

## Sources Consulted
- Dapr pub/sub scoping documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-scopes/
- Dapr pub/sub API reference (publish endpoint, HTTP status codes): https://docs.dapr.io/reference/api/pubsub_api/
- Dapr component schema reference: https://docs.dapr.io/operations/components/component-schema/
- Dapr Redis pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/

## Issues Found
1. **Incorrect delimiter in `publishingScopes` value (first YAML example)**: The original value was `"order-service=orders,inventory-service=inventory-updates;payment-service=payments"`. The comma between the first two app entries (`orders,inventory-service`) would be parsed as two topics for `order-service` rather than as a separator between two different app entries. Fixed to use semicolons consistently: `"order-service=orders;inventory-service=inventory-updates;payment-service=payments"`. The documented format is `appId1=topic1,topic2;appId2=topic3` where commas separate topics within one app and semicolons separate different apps.

## Review Notes
- The official Dapr docs also document a `protectedTopics` metadata field (topics that cannot be published or subscribed to unless explicitly granted via scopes). The blog does not mention this field, which is fine for a focused tutorial but could be a useful addition in the future.
- All other YAML examples, CLI commands, HTTP status codes (403 for unauthorized, 204 for success), API endpoint format (`v1.0/publish/{pubsubname}/{topic}`), and component YAML structure (`apiVersion: dapr.io/v1alpha1`, `kind: Component`) are correct and consistent with official Dapr documentation.
