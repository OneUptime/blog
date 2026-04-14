# Validation Summary: How to Handle Permanent Errors in Dapr Applications

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (pub/sub, service invocation, dead letter topics)
- Python (Flask framework)
- Dapr Python SDK (`dapr-client`)
- CloudEvents
- YAML declarative subscriptions

## Sources Consulted
- Dapr Pub/Sub API Reference: https://docs.dapr.io/reference/api/pubsub_api/
- Dapr Dead Letter Topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr Subscription Methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr Python SDK source (GitHub): https://github.com/dapr/python-sdk
- Dapr runtime CloudEvents source: https://github.com/dapr/dapr/blob/master/pkg/runtime/pubsub/cloudevents.go

## Issues Found

### 1. Incorrect subscriber response for permanent errors (Critical)
**What was wrong:** The post instructed readers to return HTTP 404 to signal permanent failure and route messages to the dead letter topic. While HTTP 404 does cause Dapr to drop a message, it is treated as a routing/configuration error (logged at error level). The correct and intended mechanism is to return HTTP 200 with `{"status": "DROP"}` in the response body, which is the designed API contract for intentional permanent failure handling.

**What was changed:** Updated the subscriber code to return `jsonify({"status": "DROP"}), 200` instead of `jsonify({"error": validation_error}), 404`. Also updated the success path to return `jsonify({"status": "SUCCESS"}), 200` and the transient error path to return `jsonify({"status": "RETRY"}), 200` for consistency with the Dapr subscriber response protocol.

**Why:** Dapr pub/sub subscribers communicate message handling decisions via the `status` field in the response body (`SUCCESS`, `RETRY`, `DROP`), not via HTTP status codes. Using HTTP 404 relies on a side effect and produces misleading error-level logs in the Dapr sidecar.

### 2. Removed unused PERMANENT_ERROR_CODES constant
**What was wrong:** The constant `PERMANENT_ERROR_CODES = {400, 401, 403, 404, 422}` was defined but never referenced in the code. It was misleading because it suggested these HTTP status codes have special handling in Dapr, when in fact Dapr only distinguishes between 2xx, 404, and other non-2xx codes.

**What was changed:** Removed the unused constant.

### 3. Incorrect Subscription API version
**What was wrong:** The declarative YAML subscription used `apiVersion: dapr.io/v1alpha1` with `routes.default`, but the `routes` field (with `default` and `rules` sub-fields) is a `v2alpha1` feature. The v1alpha1 API uses `route` (singular) as a top-level field in spec.

**What was changed:** Updated `apiVersion` from `dapr.io/v1alpha1` to `dapr.io/v2alpha1`.

### 4. Updated summary text
**What was wrong:** The summary paragraph referenced "non-retryable HTTP status codes" which was inaccurate after the code fixes.

**What was changed:** Updated to reference "a `DROP` status" instead.

## Review Notes
- The Dapr Python SDK's `DaprInternalError` exception class, `invoke_method()` API, and `publish_event()` with `publish_metadata` parameter were all verified as correct.
- The `{"cloudevent.id": idempotency_key}` metadata key for setting CloudEvent ID was verified against Dapr runtime source code.
- The programmatic subscription format via `/dapr/subscribe` with `deadLetterTopic` field was verified as correct.
- The dead letter subscriber pattern (subscribing to the dead letter topic and returning 200) is correct.
- The `json.loads(response.data)` usage with `InvokeMethodResponse` is correct since `.data` returns bytes and `json.loads` accepts bytes.
