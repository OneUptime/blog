# Validation Summary: How to Use Dapr Service Invocation with Node.js

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Service Invocation building block)
- Node.js
- @dapr/dapr SDK (v3.x)
- Dapr Resiliency policies (YAML configuration)

## Sources Consulted
- @dapr/dapr npm package source (v3.6.1) — TypeScript type definitions for DaprClient, DaprServer, HttpMethod, DaprInvokerCallbackContent, InvokerListenOptionsType
- Dapr official documentation — Service Invocation API, Resiliency spec (https://docs.dapr.io/operations/resiliency/)
- Dapr official documentation — Node.js SDK usage (https://docs.dapr.io/developing-applications/sdks/js/)

## Issues Found

1. **`daprHost` included protocol prefix**: Both `DaprClient` and `DaprServer` constructors used `"http://localhost"` for `daprHost`. The SDK expects a plain hostname/IP (`"127.0.0.1"`), not a URL with protocol. Changed to `"127.0.0.1"` in both locations.

2. **`data.params` does not exist on callback content**: The server handler used `data.params?.productId` to extract a route parameter. The `DaprInvokerCallbackContent` type only exposes `body`, `query`, `metadata`, and `headers` — there is no `params` property. Changed the server route from `"stock/:productId"` to `"stock"` and switched to `data.query?.productId`. Updated the client invocation path from `` `stock/${productId}` `` to `` `stock?productId=${productId}` `` to match.

3. **`invoker.listen()` method option used raw string instead of enum**: The third argument to `server.invoker.listen()` was `{ method: "GET" }` (uppercase string). The `InvokerListenOptionsType` expects an `HttpMethod` enum value, where `HttpMethod.GET` equals `"get"` (lowercase). Using the uppercase string `"GET"` would not match. Changed to `{ method: HttpMethod.GET }` and added `HttpMethod` to the DaprServer import.

4. **Resiliency YAML `kind` was wrong**: The blog used `kind: ResiliencyPolicy`. The correct Dapr CRD kind is `kind: Resiliency`. Fixed.

5. **Resiliency `targets.apps` had incorrect nesting**: The blog nested the retry policy under `outbound` (`targets.apps.inventory-service.outbound.retry`). For app targets, the structure should be flat (`targets.apps.inventory-service.retry`). The `outbound`/`inbound` nesting is only used for component targets. Removed the `outbound` level.

## Review Notes
- The `DaprClient` and `DaprServer` constructor options, `invoker.invoke()` signature, and `HttpMethod` enum export are all correct and current for the @dapr/dapr v3.x SDK.
- The `dapr run` CLI commands with `--app-id` and `--app-port` flags are correct.
- The retry policy fields (`policy: exponential`, `maxInterval`, `maxRetries`) are valid Dapr resiliency configuration values.
- The post's description of Dapr Service Invocation capabilities (service discovery, load balancing, mTLS, retries) is accurate.
