# Validation Summary: How to Filter Messages in Dapr Pub/Sub Subscriptions

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr Subscription routing rules
- Common Expression Language (CEL)
- CloudEvents specification
- Node.js / Express (for programmatic subscription examples)

## Sources Consulted
- Dapr docs: How to route messages to different handlers — https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/
- Dapr docs: Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr docs: Subscription methods — https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/

## Issues Found

### 1. Incorrect apiVersion for Subscription CRD
- **What was wrong:** The declarative subscription YAML used `apiVersion: dapr.io/v1alpha1`. Subscription CRDs that use routing rules require `dapr.io/v2alpha1`.
- **What was changed:** Updated `apiVersion` from `dapr.io/v1alpha1` to `dapr.io/v2alpha1`.
- **Why:** The `v1alpha1` Subscription spec does not support the `routes` field with `rules`. The `v2alpha1` apiVersion is required for message routing.

### 2. Missing int() cast in numeric CEL comparison
- **What was wrong:** The CEL expression `event.data.amount > 1000` lacks an explicit type cast. CloudEvents data fields are not guaranteed to be integers, so the comparison may not work as expected.
- **What was changed:** Updated to `int(event.data.amount) > 1000`.
- **Why:** The Dapr documentation shows that numeric comparisons on data fields require explicit casting with `int()` to ensure correct evaluation.

### 3. Metadata passed as HTTP headers instead of query parameters
- **What was wrong:** The curl example passed custom metadata as an HTTP header (`-H "metadata.region: us-east"`). Dapr's publish API accepts metadata as query string parameters, not headers.
- **What was changed:** Changed from `-H "metadata.region: us-east"` header to query parameter format: `?metadata.region=us-east` appended to the URL.
- **Why:** The Dapr publish API specification defines metadata as query parameters prefixed with `metadata.`, not as HTTP headers.

## Review Notes
- The post correctly describes the programmatic subscription pattern via `GET /dapr/subscribe` and the `DROP` status response for discarding messages.
- The suggestion to use narrow, purpose-specific topics as an alternative to filtering is a valid architectural pattern.
- The description of Dapr routing as "server-side filtering" is slightly imprecise — routing rules are evaluated by the Dapr sidecar, not the message broker itself — but this is a reasonable simplification for a tutorial audience.
