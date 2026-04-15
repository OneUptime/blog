# Validation Summary: How to Implement Error Handling Standards for Dapr Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr Resiliency component (retries, circuit breakers)
- Dapr Pub/Sub with dead-letter topics
- Dapr JavaScript SDK (`@dapr/dapr`)
- Node.js / Express error middleware
- W3C Trace Context (`traceparent` header)

## Sources Consulted
- Dapr Resiliency spec: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr circuit breaker policies: https://docs.dapr.io/operations/resiliency/policies/circuit-breakers/
- Dapr Subscription spec: https://docs.dapr.io/reference/resource-specs/subscription-schema/
- Dapr dead-letter topics: https://docs.dapr.io/developing-applications/building-blocks/pubsub/pubsub-deadletter/
- Dapr JS SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK GitHub (exports and API signatures): https://github.com/dapr/js-sdk

## Issues Found

1. **Resiliency YAML: `duration` field invalid for exponential retry policy**
   - **What was wrong:** The retry policy used `policy: exponential` with `duration: 1s`. The `duration` field only applies to the `constant` retry policy and is not valid for `exponential`.
   - **What was changed:** Removed the `duration: 1s` line from the `standard-retry` policy. The exponential policy uses its own internal backoff formula up to the `maxInterval` ceiling.
   - **Why:** Per official Dapr docs, `duration` is documented as applying only to the `constant` policy.

2. **JS SDK: `HttpStatusCode` is not an export of `@dapr/dapr`**
   - **What was wrong:** The import `const { DaprClient, HttpStatusCode } = require('@dapr/dapr')` references `HttpStatusCode`, which does not exist in the SDK. The actual export for HTTP-related enums is `HttpMethod`.
   - **What was changed:** Changed the import to `const { DaprClient, HttpMethod } = require('@dapr/dapr')`.
   - **Why:** Verified against the SDK source code (`src/index.ts`); no `HttpStatusCode` export exists.

3. **JS SDK: `invoke()` third parameter should be `HttpMethod` enum, not a string**
   - **What was wrong:** The call used `'GET'` (a string) as the third argument to `client.invoker.invoke()`. The SDK expects an `HttpMethod` enum value.
   - **What was changed:** Changed `'GET'` to `HttpMethod.GET`.
   - **Why:** The SDK's `HttpMethod` enum maps to lowercase strings internally (`HttpMethod.GET = "get"`), so passing the uppercase string `'GET'` would not match.

4. **JS SDK: Error object does not have `statusCode` property**
   - **What was wrong:** The catch block checked `err.statusCode`, but the Dapr JS SDK throws errors with the status code embedded in a JSON-stringified `err.message` (with a `status` field), not as a top-level `statusCode` property.
   - **What was changed:** Updated the error handling to parse `err.message` as JSON and check `parsed.status` instead of `err.statusCode`.
   - **Why:** Verified against the SDK HTTP client source code which constructs errors via `new Error(JSON.stringify({ error, error_msg, status }))`.

## Review Notes
- The declarative Subscription uses `apiVersion: dapr.io/v1alpha1`, which is valid but older. Dapr now recommends `dapr.io/v2alpha1` for declarative subscriptions, which supports rules-based routing via `routes` instead of a single `route`. This is not incorrect but could be noted in a future update.
- The circuit breaker `trip` expression uses `consecutiveFailures >= 5` (trips on 5th failure), whereas the Dapr docs default example uses `consecutiveFailures > 5` (trips on 6th). Both are valid CEL expressions; the blog's choice is intentional and slightly more aggressive.
- The DLQ handler accesses `failedEvent.topic`, but for dead-letter messages, the `topic` field in the CloudEvents envelope will contain the dead-letter topic name (e.g., `orders-dlq`), not the original source topic (`orders`). This could be misleading but is not technically incorrect in terms of code functionality.
