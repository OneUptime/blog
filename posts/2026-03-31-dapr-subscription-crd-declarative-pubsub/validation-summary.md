# Validation Summary: How to Use Dapr Subscription CRD for Declarative Pub/Sub

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr Subscription CRD (Custom Resource Definition)
- Kubernetes
- Node.js / Express (for bulk subscribe handler example)

## Sources Consulted
- Dapr Subscription Methods documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Dead Letter Topics documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Bulk Subscribe documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr Content-based Routing documentation: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/

## Issues Found

### 1. Outdated API version (all YAML examples)
- **What was wrong:** All Subscription CRD examples used `apiVersion: dapr.io/v1alpha1`. The current Dapr Subscription CRD uses `apiVersion: dapr.io/v2alpha1`.
- **What was changed:** Updated all five YAML examples from `dapr.io/v1alpha1` to `dapr.io/v2alpha1`.
- **Why:** The v2alpha1 API is the current version shown in all official Dapr documentation. Using v1alpha1 would result in incorrect or deprecated behavior.

### 2. Incorrect `route` field usage (basic, dead letter, and bulk subscribe examples)
- **What was wrong:** The basic subscription, dead letter topic, and bulk subscribe examples used `route: /orders/process` (singular field directly under `spec`). In v2alpha1, the correct structure uses `routes.default`.
- **What was changed:** Replaced `route: /orders/process` with `routes:\n    default: /orders/process` in the basic subscription, dead letter topic, and bulk subscribe YAML examples. Updated the field description from `route` to `routes.default`.
- **Why:** The `route` singular field was part of the older v1alpha1 CRD spec. The v2alpha1 CRD uses the `routes` object with a `default` sub-field for basic routing.

### 3. Incorrect `scopes` field placement
- **What was wrong:** The scopes example showed `scopes` nested under `spec:`, but `scopes` is a top-level field in the Subscription CRD (a sibling of `spec`, not a child).
- **What was changed:** Moved `scopes` to the top level of the YAML resource. Also made the example a complete CRD manifest (with apiVersion, kind, metadata) for clarity, and updated the description text to say "top-level `scopes` field".
- **Why:** Placing `scopes` under `spec` would cause it to be ignored or rejected by the Kubernetes API, meaning the subscription would not be correctly scoped.

## Review Notes
- The post mentions that a pod restart is required after applying a Subscription CRD. This is correct for default behavior, but since Dapr v1.14, the `HotReload` feature gate allows declarative subscriptions to be picked up without restart. Future updates to this post could mention this capability.
- The CEL expression syntax used in content-based routing (`event.type == "order.created"`) is correct and matches official documentation.
- The bulk subscribe response format (`statuses` array with `entryId` and `status` fields) is accurate. Valid status values are `SUCCESS`, `RETRY`, and `DROP`.
- The `deadLetterTopic` field name and usage are correct.
