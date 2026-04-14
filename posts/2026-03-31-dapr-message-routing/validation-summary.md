# Validation Summary: How to Implement Message Routing with Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr Pub/Sub building block
- Dapr declarative subscriptions (v2alpha1)
- Dapr programmatic subscriptions
- CloudEvents specification
- Common Expression Language (CEL) for routing rules
- Redis as Pub/Sub broker
- Python / Flask subscriber service

## Sources Consulted
- Dapr Pub/Sub message routing documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr CloudEvents documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/

## Issues Found

### 1. Duplicate Content-Type header on standard order curl command
- **What was wrong:** The standard order `curl` command had `-H "Content-Type: application/json"` specified twice on consecutive lines.
- **What was changed:** Removed the duplicate header (and replaced the entire command — see issue 2).
- **Why:** Duplicate HTTP headers cause unpredictable behavior and are clearly a copy-paste error.

### 2. Standard order publish would not trigger routing rules
- **What was wrong:** The standard order was published with `Content-Type: application/json` and raw JSON body (no CloudEvent envelope). When Dapr receives a raw JSON payload, it auto-wraps it in a CloudEvent with `type` set to `com.dapr.event.sent`. This means the routing rule `event.type == "order.standard"` would never match — the message would always fall through to the default route, contradicting what the blog implies.
- **What was changed:** Replaced the raw JSON publish with a full CloudEvent envelope using `Content-Type: application/cloudevents+json`, explicitly setting `"type": "order.standard"` so the routing rule matches as intended. This is consistent with how the priority order example was already written.
- **Why:** For content-based routing to work on `event.type`, the publisher must explicitly set the CloudEvent type. Dapr's auto-generated type (`com.dapr.event.sent`) does not match custom routing rules.

## Review Notes
- The Dapr subscription API version `dapr.io/v2alpha1` is correct for routing-enabled declarative subscriptions. If Dapr promotes this to a stable version in the future, the post should be updated.
- The programmatic subscription format (returned from `/dapr/subscribe`) correctly includes the `routes` object with `rules` and `default`, matching official Dapr documentation.
- CEL expression syntax (`event.type`, `event.data.priority`, etc.) is correctly used throughout.
- The pub/sub component using `pubsub.redis` with `v1` is valid.
