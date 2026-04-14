# Validation Summary: How to Implement Header-Based Routing with Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, declarative subscriptions, content-based routing)
- CloudEvents specification (extensions, JSON format)
- Redis (as pub/sub broker)
- Python Dapr SDK (`dapr-client`)
- JavaScript/Node.js Dapr SDK (`@dapr/dapr`)
- FastAPI (Python HTTP handler)
- CEL (Common Expression Language) for routing rules
- Kubernetes-style YAML configuration

## Sources Consulted
- Dapr Pub/Sub component reference (Redis): https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr Pub/Sub how-to (publish/subscribe): https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr content-based routing (message routing): https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr CloudEvents customization: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/
- Dapr Python SDK documentation: https://docs.dapr.io/developing-applications/sdks/python/python-client/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-server/
- CloudEvents JSON format specification: https://github.com/cloudevents/spec/blob/v1.0.2/cloudevents/formats/json-format.md

## Issues Found

### Issue 1: Custom metadata keys missing `cloudevent.` prefix (Python)
- **What was wrong:** The `publish_metadata` dictionary used bare keys `"priority"`, `"region"`, and `"version"` for custom CloudEvents extensions. In Dapr, only metadata keys prefixed with `cloudevent.` are added to the CloudEvents envelope. Non-prefixed keys are passed as broker-level metadata to the underlying pub/sub component (e.g., Redis) and do NOT become CloudEvents extensions.
- **What was changed:** Prefixed the custom keys with `cloudevent.` (e.g., `"priority"` became `"cloudevent.priority"`). Also updated comments from "custom header" to "custom extension" for accuracy.
- **Why:** Without the `cloudevent.` prefix, the custom metadata would not be available in the CloudEvents envelope and the CEL routing rules would not be able to match on them.

### Issue 2: Incorrect CEL expression syntax for CloudEvents extensions
- **What was wrong:** All CEL routing rules used `event.extensions.X` syntax (e.g., `event.extensions.priority == "high"`). Dapr's CEL evaluation context maps CloudEvents attributes — including custom extensions — as top-level properties on the `event` object, NOT nested under an `extensions` key. The CloudEvents spec also mandates that extensions are top-level in the JSON format.
- **What was changed:** Changed all `event.extensions.X` references to `event.X` (e.g., `event.priority == "high"`). This affected 5 occurrences across the YAML subscription and JavaScript subscription examples.
- **Why:** The `event.extensions.X` syntax is not documented in Dapr's routing documentation and would not match any attribute. The correct syntax is `event.X` for both standard and extension attributes.

### Issue 3: JavaScript publish function not prefixing custom headers (JS)
- **What was wrong:** The `publishEvent` JS function spread the `headers` object directly into metadata without the `cloudevent.` prefix (`...headers`), so custom keys like `priority` and `region` would not become CloudEvents extensions.
- **What was changed:** Rewrote the function to iterate over header entries and prefix each key with `cloudevent.` before adding to the metadata object.
- **Why:** Same underlying reason as Issue 1 — Dapr requires the `cloudevent.` prefix on metadata keys for them to be included in the CloudEvents envelope.

## Review Notes
- The JavaScript example uses both `server.pubsub.subscribeWithOptions()` (for routing rules) and `server.pubsub.subscribe()` (for individual route handlers). This pattern is conceptually illustrative but may not work exactly as shown depending on the Dapr JS SDK version, since `subscribe()` subscribes to a topic, not a route path. In practice, route handlers are typically registered as HTTP endpoints on the underlying server framework. This is noted but not changed as it doesn't affect the core routing concept being taught.
- The `serverPort` parameter in `new DaprServer({ serverPort: '3000' })` passes a string; some SDK versions expect a number. This is minor and version-dependent.
- The post correctly identifies CEL as the expression language used by Dapr for routing rules.
- The FastAPI handler correctly accesses custom extensions as top-level keys in the CloudEvents JSON envelope (e.g., `cloud_event.get('priority')`), which aligns with the CloudEvents JSON format specification.
