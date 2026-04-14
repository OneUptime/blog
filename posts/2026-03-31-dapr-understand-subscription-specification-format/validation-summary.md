# Validation Summary: How to Understand Dapr Subscription Specification Format

## Status
validated

## Post Type
Reference / Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub building block
- Dapr declarative Subscription CRD (v2alpha1)
- YAML configuration
- Common Expression Language (CEL)
- Kubernetes

## Sources Consulted
- Dapr official docs — Subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr official docs — Bulk subscribe: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-bulk/
- Dapr official docs — Pub/Sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

### 1. Incorrect apiVersion (`dapr.io/v1alpha2` does not exist)
- **What was wrong:** All six YAML examples and the Summary section used `apiVersion: dapr.io/v1alpha2`. This apiVersion does not exist in Dapr. The valid versions are `dapr.io/v1alpha1` (legacy) and `dapr.io/v2alpha1` (current).
- **What was changed:** Replaced all instances of `dapr.io/v1alpha2` with `dapr.io/v2alpha1`.
- **Why:** The v2alpha1 API is the current documented version for declarative subscriptions.

### 2. Used `route` (singular) instead of `routes.default`
- **What was wrong:** The basic subscription, dead-letter topic, bulk subscribe, and scoping examples all used `route: /orders` as a direct field under `spec`. In the v2alpha1 subscription schema, the `route` shorthand does not exist; routing is configured via `routes.default` and `routes.rules`.
- **What was changed:** Replaced `route: /orders` with `routes:\n    default: /orders` in four YAML blocks. Updated the bullet point explanation from `spec.route` to `spec.routes.default`.
- **Why:** The `route` field was part of the v1alpha1 schema and programmatic subscriptions. The v2alpha1 declarative format requires the `routes` object.

### 3. `scopes` nested inside `spec` instead of at top level
- **What was wrong:** In the scoping example, `scopes` was indented under `spec`. In the v2alpha1 subscription CRD, `scopes` is a top-level field (sibling to `spec`), not a child of `spec`.
- **What was changed:** Moved `scopes` from inside `spec` to the top level of the YAML resource.
- **Why:** Placing `scopes` inside `spec` would cause it to be ignored or produce a validation error.

### 4. Misleading text about `routes` vs `route`
- **What was wrong:** The content-based routing section said "Use the `routes` field (instead of `route`)" which implied `route` was used elsewhere. After fixing the basic examples to use `routes.default`, this parenthetical was inaccurate.
- **What was changed:** Updated to "Use the `routes.rules` field to route messages to different endpoints based on CloudEvents attributes."
- **Why:** Consistency with the corrected examples.

## Review Notes
- The self-hosted path `~/.dapr/components/` is the default resources directory and is correct, though the Dapr docs recommend using `--resources-path` for explicit control.
- The bulk subscribe request body format (`entries` array with `entryId`, `event`, `contentType`) is consistent with the docs, though the post omits the expected response format (`statuses` array with `entryId` and `status`). This is a minor omission, not an error.
- The CEL expression examples (`event.type == "order.created"`) are correct and match official documentation patterns.
