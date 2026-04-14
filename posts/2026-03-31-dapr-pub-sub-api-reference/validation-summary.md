# Validation Summary: How to Use the Dapr Pub/Sub API Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Pub/Sub API (publish, subscribe, bulk publish)
- CloudEvents 1.0 specification
- Node.js / Express (for subscriber examples)
- YAML declarative subscriptions (Kubernetes-style)

## Sources Consulted
- Dapr Pub/Sub API reference documentation (https://docs.dapr.io/reference/api/pubsub_api/)
- Dapr Pub/Sub overview and how-to guides (https://docs.dapr.io/developing-applications/building-blocks/pubsub/)
- Dapr declarative subscriptions documentation (https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/)
- CloudEvents specification v1.0 (https://github.com/cloudevents/spec/blob/v1.0/spec.md)

## Issues Found

### 1. Incorrect bulk publish API version prefix
- **What was wrong:** The bulk publish endpoint was listed as `/v1.0.1/publish/bulk/{pubsubName}/{topic}` (both in the heading and the curl example).
- **What was changed:** Corrected to `/v1.0/publish/bulk/{pubsubName}/{topic}`. The bulk publish endpoint uses the standard `v1.0` prefix, same as the regular publish endpoint.
- **Why:** The `v1.0.1` prefix does not exist in the Dapr API. Historically the endpoint used `v1.0-alpha1` during preview, but the current stable version is `v1.0`.

### 2. Incorrect field name in programmatic subscription
- **What was wrong:** The `/dapr/subscribe` response used `route: "/orders-handler"` (a singular string).
- **What was changed:** Corrected to `routes: { default: "/orders-handler" }` (a plural object with a `default` key).
- **Why:** The programmatic subscription API uses `routes` (an object) to support content-based routing with a `default` fallback route. The singular `route` field is from the deprecated `v1alpha1` declarative YAML format and is not valid in the programmatic subscription response.

### 3. Incorrect HTTP status codes for message handling
- **What was wrong:** The message handler example used HTTP 404 for DROP and HTTP 500 for RETRY.
- **What was changed:** All three statuses (SUCCESS, DROP, RETRY) now return HTTP 200 with the appropriate `status` field in the JSON body.
- **Why:** The recommended Dapr pattern is to always return HTTP 200 and use the JSON `status` field to control message disposition. While Dapr does treat HTTP 404 as DROP and non-2xx as RETRY as a fallback, this is error-path behavior, not the documented recommended approach.

## Review Notes
- The CloudEvents `type` field value `com.dapr.event.sent` is correct per current Dapr documentation.
- The `deadLetterTopic` placement and `apiVersion: dapr.io/v2alpha1` in the declarative subscription YAML are correct for the current Dapr subscription spec.
- The `metadata.ttlInSeconds` and `metadata.rawPayload` query parameters on the publish endpoint are valid.
- The bulk publish request body structure (`entryId`, `event`, `contentType`) is correct.
