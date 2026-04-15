# Validation Summary: How to Implement API Contracts Between Dapr Services

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (service invocation, sidecar architecture)
- OpenAPI 3.0.3 specification
- express-openapi-validator (Node.js middleware)
- Pact (@pact-foundation/pact) for consumer-driven contract testing
- @dapr/dapr JavaScript SDK
- GitHub Actions CI
- pact-broker CLI / pact-provider-verifier

## Sources Consulted
- Pact JS documentation: https://docs.pact.io/implementation_guides/javascript/docs/matching
- Pact JS consumer test docs: https://docs.pact.io/implementation_guides/javascript/docs/consumer
- Dapr JavaScript SDK docs: https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- express-openapi-validator npm: https://www.npmjs.com/package/express-openapi-validator
- OpenAPI 3.0.3 specification: https://spec.openapis.org/oas/v3.0.3

## Issues Found

1. **Missing `OrderItem` schema in OpenAPI spec**: The OpenAPI contract referenced `#/components/schemas/OrderItem` in the `CreateOrderRequest.items` array, but the `OrderItem` schema was never defined in the `components/schemas` section. This would cause a validation error when parsing the spec. **Fix:** Added the `OrderItem` schema with `productId` (string) and `quantity` (integer) properties, matching the data used in the Pact test examples.

2. **Invalid Pact matchers in `willRespondWith` body**: The test used `expect.stringMatching(/^ord-/)` (a Jest matcher) inside Pact's `willRespondWith.body`. Jest matchers are not valid in Pact interaction definitions; Pact requires its own matchers. **Fix:** Replaced with `Matchers.term({ generate: 'ord-12345', matcher: '^ord-' })` and added the `Matchers` import from `@pact-foundation/pact`.

3. **Missing `provider.verify()` call in Pact test lifecycle**: The test had `provider.setup()` in `beforeAll` and `provider.finalize()` in `afterAll`, but was missing `provider.verify()` in `afterEach`. Without this call, Pact does not verify that the mock server received the expected interactions. **Fix:** Added `afterEach(() => provider.verify())`.

4. **DaprClient used in Pact consumer test instead of direct HTTP client**: The test created a `DaprClient` configured to talk to `localhost:3500` (the Dapr sidecar), but the Pact mock server runs on port 1234. Even if the port were corrected, DaprClient routes requests through the Dapr sidecar URL format (`/v1.0/invoke/{appId}/method/{methodName}`), which would not match the Pact mock's expected path (`/v1/orders`). **Fix:** Replaced DaprClient with axios making a direct HTTP POST to the Pact mock server at `http://localhost:1234/v1/orders`, and updated the assertion to use `response.data.orderId`.

## Review Notes
- The `dapr init --slim` command in the CI workflow is correct for initializing Dapr in slim/self-hosted mode without Docker dependencies, which is appropriate for CI environments.
- The express-openapi-validator middleware API (`OpenApiValidator.middleware()`) is current and correct.
- The pact-broker publish and pact-provider-verifier CLI commands use correct flags.
- The overall architectural pattern of combining OpenAPI specs with consumer-driven contract testing is sound advice for Dapr microservices.
