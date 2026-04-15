# Validation Summary: How to Use Dapr Bindings for Webhook Integration

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP output binding (`bindings.http`)
- Dapr input bindings
- Dapr Resiliency policies
- Dapr JavaScript SDK (`@dapr/dapr`)
- Express.js
- Node.js `crypto` module
- Webhooks (Slack, GitHub, PagerDuty, Microsoft Teams)

## Sources Consulted
- Dapr HTTP binding component spec: https://docs.dapr.io/reference/components-reference/supported-bindings/http/
- Dapr input bindings how-to: https://docs.dapr.io/developing-applications/building-blocks/bindings/howto-triggers/
- Dapr Resiliency overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr retry policies: https://docs.dapr.io/operations/resiliency/policies/retries/retries-overview/
- Dapr Resiliency schema: https://docs.dapr.io/reference/resource-specs/resiliency-schema/
- Dapr JavaScript SDK client docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr Bindings API reference: https://docs.dapr.io/reference/api/bindings_api/

## Issues Found

1. **Invalid `allowedOrigins` metadata field in HTTP binding component YAML**: The `allowedOrigins` field is not a valid metadata field for the `bindings.http` component. Removed it from the component configuration. Valid optional fields include `MTLSRootCA`, `MTLSClientCert`, `MTLSClientKey`, `securityToken`, `securityTokenHeader`, `maxResponseBodySize`, and `errorIfNot2XX`.

2. **Incorrect claim that HTTP binding can be used as an input binding**: The "Receiving Webhooks with Input Bindings" section stated that the HTTP binding could be configured as an input handler to receive webhooks. The `bindings.http` component is output-only and does not support input binding mode. Updated the section title and description to clarify that webhooks are received via direct HTTP endpoints on the application, not through the HTTP binding as an input binding.

3. **Invalid `initialInterval` field in Resiliency retry policy**: The exponential retry policy in Dapr does not have an `initialInterval` field. The valid fields for an exponential retry policy are `policy`, `maxInterval`, and `maxRetries`. Removed the `initialInterval: 1s` line from the resiliency configuration.

## Review Notes
- The `MTLSRootCA` metadata field in the HTTP binding component is set to an empty string, which is a no-op. While not technically wrong, it is unnecessary in a tutorial context and could confuse readers.
- The `verifyGitHubSignature` function uses `crypto.timingSafeEqual`, which will throw an error if the two buffers have different lengths (e.g., if the `signature` header is missing or malformed). Production code should add a length check or null guard before calling `timingSafeEqual`.
- The Dapr JS SDK's `client.binding.send` fourth parameter is `metadata`, not HTTP headers directly. For the HTTP binding specifically, metadata keys starting with a capital letter are forwarded as HTTP headers on the outgoing request. This is HTTP-binding-specific behavior, not a general SDK feature.
