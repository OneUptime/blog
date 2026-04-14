# Validation Summary: How to Migrate from Direct HTTP Calls to Dapr Service Invocation

## Status
validated

## Post Type
Tutorial / Migration Guide

## Technologies Covered
- Dapr (Service Invocation API, Resiliency policies, CLI)
- JavaScript / Node.js
- axios HTTP client
- @dapr/dapr JavaScript SDK (DaprClient)
- YAML configuration (Dapr Resiliency spec)

## Sources Consulted
- Dapr Service Invocation API Reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr JavaScript SDK Documentation — https://docs.dapr.io/developing-applications/sdks/js/js-client/
- Dapr JS SDK GitHub Repository — https://github.com/dapr/js-sdk
- Dapr Resiliency Policies — https://docs.dapr.io/operations/resiliency/
- Dapr CLI `dapr run` Command Reference — https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Getting Started API Guide — https://docs.dapr.io/getting-started/get-started-api/

## Issues Found
1. **SDK `invoker.invoke()` incorrect query parameter passing**: The `checkInventory` function using the Dapr SDK passed `{ quantity }` as a 5th argument to `client.invoker.invoke()`, treating it as query parameters. However, the 5th parameter of `invoke()` is an `options` object for headers, not query parameters. Fixed by encoding the query parameter directly in the method path: `inventory/${productId}?quantity=${quantity}`.

2. **Deprecated `--components-path` CLI flag**: Both `dapr run` commands used the `--components-path` flag, which is deprecated in favor of `--resources-path`. Updated both commands to use `--resources-path`.

## Review Notes
- The Dapr HTTP invocation URL pattern (`/v1.0/invoke/{appId}/method/{methodName}`) is correct and well-demonstrated.
- The DaprClient constructor signature is correct for the current @dapr/dapr SDK.
- The Resiliency YAML spec (apiVersion, kind, policies structure, targets structure) is accurate per official Dapr documentation.
- The default Dapr HTTP port of 3500 is correct.
- The post correctly notes that mTLS is enforced between sidecars — worth noting this applies automatically in Kubernetes mode with Dapr's sentry service, as the summary already clarifies ("mTLS between sidecars in Kubernetes").
- The post does not mention Dapr's gRPC invocation option, which is an alternative to HTTP invocation. This is fine for scope but could be a future enhancement.
