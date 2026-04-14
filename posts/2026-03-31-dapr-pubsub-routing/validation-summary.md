# Validation Summary: How to Use Dapr Pub/Sub Message Routing

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block with message routing
- Common Expression Language (CEL) for route rules
- CloudEvents specification
- Python (Flask) for programmatic subscriptions
- Node.js (Express) for programmatic subscriptions
- Dapr declarative subscriptions (YAML)
- Dapr HTTP publish API

## Sources Consulted
- Dapr pub/sub message routing documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CloudEvents customization documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr subscription methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/

## Issues Found
1. **Declarative subscription apiVersion was incorrect.** The post used `apiVersion: dapr.io/v1alpha1` for the declarative subscription YAML, but routing with `routes.rules` requires `apiVersion: dapr.io/v2alpha1`. The `v1alpha1` Subscription schema only supports a single `route` field, not the `routes` object with `rules` and `default`. Changed to `dapr.io/v2alpha1`.

## Review Notes
- The programmatic subscription format (JSON returned from `/dapr/subscribe`) is correct and matches official documentation.
- CEL expression syntax (`event.type`, `event.source`, `event.data.*`, `event.subject`, `int()` cast) is accurate per Dapr docs.
- The publish API URL with `?metadata.cloudevent.type=` query parameter is a valid approach — Dapr's HTTP publish API accepts metadata as query parameters with the `metadata.` prefix, and `cloudevent.type` is a documented metadata key for overriding the CloudEvent type field.
- The `scopes` field placement (outside `spec`, at top level) in the declarative subscription is correct.
- The Flask and Express code examples are syntactically correct and follow the expected patterns for Dapr programmatic subscriptions.
- The post correctly notes that routing rules are evaluated sequentially and a default route catches unmatched messages.
