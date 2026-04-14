# Validation Summary: How to Configure Redis Streams for Dapr Pub/Sub

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Dapr (pub/sub building block)
- Redis Streams
- Python (publisher example using `requests`)
- Node.js / Express (subscriber example)
- Kubernetes (secrets, component deployment)
- Docker (local Redis)

## Sources Consulted
- Dapr Redis Streams pub/sub component reference: https://docs.dapr.io/reference/components-reference/supported-pubsub/setup-redis-pubsub/
- Dapr pub/sub overview: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-overview/
- Dapr subscription methods: https://docs.dapr.io/developing-applications/building-blocks/pubsub/subscription-methods/
- Dapr dead letter topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr resiliency policies: https://docs.dapr.io/operations/resiliency/policies/
- Dapr pub/sub API reference: https://docs.dapr.io/reference/api/pubsub_api/

## Issues Found

1. **Invalid component metadata fields `maxRetries` and `maxRetryWaitTime`**: The advanced configuration YAML included `maxRetries` and `maxRetryWaitTime` as component metadata fields. These are not valid metadata fields for the `pubsub.redis` component. The component does have `redisMaxRetries` for Redis *command*-level retries, but message delivery retries are controlled via Dapr resiliency policies, not component metadata. Removed both fields from the YAML example.

2. **Incorrect description of `maxRetries` metadata field**: The key metadata fields list described `maxRetries` as "retry count before sending to dead letter." This conflated Redis command retries with message delivery retries. Replaced with a description of the `concurrency` field, which is a valid and useful metadata field already present in the YAML.

3. **Deprecated Subscription API version**: The declarative subscription used `apiVersion: dapr.io/v1alpha1` with `kind: Subscription`, which is deprecated. Updated to the current default `apiVersion: dapr.io/v2alpha1`, which uses `routes.default` instead of the flat `route` field.

4. **Invalid `maxDeliveryCount` subscription metadata**: The subscription YAML included `metadata.maxDeliveryCount`, which is not a valid field in Dapr subscriptions. Retry-before-dead-letter behavior is controlled via Dapr resiliency policies. Removed the invalid field and added a resiliency policy example showing the correct way to configure retry count before dead-lettering.

## Review Notes
- The Redis CLI examples use `dapr-pubsub-orders` as the stream name. The actual stream key name Dapr uses in Redis may differ depending on the Dapr version and configuration. Users should use `KEYS *` first to discover the actual stream names in their environment.
- The publish API endpoint returns HTTP 204 on success (not 200). The blog does not explicitly mention the response code from the publish call, and uses `raise_for_status()` which handles both correctly, so this is not an error in the code.
- The subscriber returns HTTP 200 to acknowledge and 500 to trigger retry. While this works, Dapr also supports a JSON response body with `{"status": "SUCCESS"}`, `{"status": "RETRY"}`, or `{"status": "DROP"}` for more granular control. This is a potential improvement but not an error.
