# Validation Summary: How to Use Declarative Subscriptions in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (pub/sub building block, declarative subscriptions)
- Kubernetes (CRDs, kubectl)
- Node.js / Express (handler implementation)
- Common Expression Language (CEL) for routing rules

## Sources Consulted
- Dapr Subscription Schema Reference: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr Pub/Sub How-To Guide: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-publish-subscribe/
- Dapr Subscription Methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Message Routing: https://docs.dapr.io/developing-applications/building-blocks/pubsub/howto-route-messages/

## Issues Found

### 1. Deprecated API version `dapr.io/v1alpha1` used for simple subscription
- **What was wrong**: The simple subscription example used `apiVersion: dapr.io/v1alpha1` with the `route` field (singular). The v1alpha1 API version is deprecated in favor of `dapr.io/v2alpha1`.
- **What was changed**: Updated the simple subscription example to use `apiVersion: dapr.io/v2alpha1` with `routes.default` instead of `route`. Also updated the multi-route section heading text to remove the implication that v2alpha1 is only for multi-route subscriptions.
- **Why**: v1alpha1 is deprecated. The v2alpha1 API version supports both simple subscriptions (via `routes.default`) and multi-route subscriptions (via `routes.rules`), and is the current recommended version.

### 2. Undocumented metadata fields `maxConcurrentHandlers` and `ackWaitTime`
- **What was wrong**: The metadata section showed `maxConcurrentHandlers` and `ackWaitTime` as subscription metadata options. These fields are not documented in the official Dapr subscription specification and may be confused with component-level configuration.
- **What was changed**: Replaced the undocumented metadata fields with `rawPayload`, which is an actually documented subscription metadata option, and added a brief explanation of its purpose.
- **Why**: Using undocumented or non-existent metadata fields would mislead readers into thinking these are valid subscription-level settings. The `rawPayload` metadata option is explicitly documented in the Dapr subscription schema reference.

### 3. Metadata section also used deprecated `route` field
- **What was wrong**: The YAML snippet in the metadata section used `route:` (v1alpha1 syntax).
- **What was changed**: Updated to `routes.default:` (v2alpha1 syntax) for consistency with the rest of the corrected post.
- **Why**: Consistency with the v2alpha1 API version used throughout the post.

## Review Notes
- The `scopes` field placement at the top level (outside `spec`) is correct per the official Dapr schema.
- The CEL expression syntax `event.type == "PaymentSucceeded"` is correct — `event.type` refers to the CloudEvent `type` attribute, not a field inside the event data.
- The `GET /dapr/subscribe` programmatic subscription endpoint is correctly described.
- The Express.js handler code is syntactically correct and follows the expected Dapr callback pattern.
- The kubectl commands (`kubectl get subscriptions`, `kubectl describe subscription`) are standard Kubernetes resource operations that work with Dapr CRDs.
- If disambiguation from other CRDs is needed, the fully qualified resource name `subscriptions.dapr.io` can be used with kubectl.
