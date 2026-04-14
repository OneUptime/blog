# Validation Summary: How to Use Dapr Pub/Sub for Audit Logging

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block)
- Apache Kafka (as pub/sub broker)
- TypeScript / Node.js (publisher service)
- Python / Flask (subscriber service)
- PostgreSQL (audit log storage via psycopg2)
- CloudEvents (Dapr's default message envelope format)
- CEL (Common Expression Language, used in subscription routing rules)

## Sources Consulted
- Dapr Pub/Sub publish API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr programmatic subscription docs: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr declarative subscription docs: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Kafka pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-apache-kafka/
- Dapr Resiliency docs: https://docs.dapr.io/operations/resiliency/
- Dapr dead-letter topic docs: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr CloudEvents and pub/sub: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-cloudevents/

## Issues Found

### 1. Deprecated `authRequired` field in Kafka component
**What was wrong:** The Kafka pub/sub component used `authRequired: "false"`, which has been deprecated since Dapr v1.6.
**What was changed:** Replaced with `authType: "none"`, which is the current recommended metadata field.
**Why:** `authRequired` is deprecated in favor of `authType`, which supports more granular authentication modes (`none`, `password`, `mtls`, `oidc`, etc.).

### 2. Incorrect `maxDeliveryCount` in subscription metadata
**What was wrong:** The dead-letter topic configuration included `metadata.maxDeliveryCount: "5"` as a field on the Subscription spec. This field does not exist in Dapr's Subscription resource.
**What was changed:** Removed the invalid `metadata` block and added a separate Resiliency resource example showing how to configure retry behavior (`maxRetries: 5`) that controls when messages are routed to the dead-letter topic.
**Why:** In Dapr, retry policies are configured via the Resiliency building block, not as metadata on subscriptions. The Resiliency resource targets components and controls inbound/outbound retry policies separately.

### 3. Incorrect subscriber response format
**What was wrong:** The Python subscriber returned `"", 200` (empty body with HTTP 200). Dapr expects a JSON response with a `status` field indicating how the message was handled.
**What was changed:** Updated the return to `{"status": "SUCCESS"}, 200`.
**Why:** Dapr uses the `status` field in the response to determine message disposition. Valid values are `SUCCESS` (processed), `RETRY` (redeliver), and `DROP` (discard). An empty response may work in some cases but does not follow the documented contract.

## Review Notes
- The declarative Subscription resource uses `apiVersion: dapr.io/v1alpha1`. The current Dapr documentation primarily shows `dapr.io/v2alpha1` for subscriptions. The v1alpha1 format still works but may be deprecated in future Dapr releases.
- The CEL expression `event.data.action.startsWith("user.")` in the routing rules is valid syntax, but requires that the published message data is nested JSON (not a JSON-escaped string). This is satisfied in this post since the publisher sends a JSON object directly.
- The programmatic subscription in the Flask example uses `"route"` (singular), which is the simpler format for subscriptions without routing rules. This is valid for basic use cases.
- The `get_db_connection()` function is referenced but not defined in the Python example. This is acceptable for a tutorial that focuses on the Dapr integration rather than database setup.
- Flask 2.2+ is required for the `return [...]` syntax in the `subscribe()` endpoint to work (automatic JSON serialization of lists). Older Flask versions would require `jsonify()`.
