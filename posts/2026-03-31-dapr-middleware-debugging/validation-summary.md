# Validation Summary: How to Debug Middleware Issues in Dapr

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar, middleware pipeline, metadata API)
- Dapr CLI (`dapr run`)
- Kubernetes (annotations, kubectl commands)
- Dapr HTTP middleware components (routerchecker, uppercase, wasm)
- WebAssembly (WASM) middleware and validation tooling

## Sources Consulted
- Dapr supported middleware reference: https://docs.dapr.io/reference/components-reference/supported-middleware/
- Dapr routerchecker middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-routerchecker/
- Dapr metadata API reference: https://docs.dapr.io/reference/api/metadata_api/
- Dapr CLI reference (`dapr run`): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Kubernetes annotations reference: https://docs.dapr.io/reference/arguments-annotations-overview/
- Dapr Configuration spec (httpPipeline): https://docs.dapr.io/operations/configuration/configuration-overview/

## Issues Found

1. **Metadata API response field name was incorrect.** The post used `registeredComponents` but the correct field name in the Dapr metadata API response is `components`. Changed `registeredComponents` to `components` in the example JSON response.

2. **routerchecker metadata field name was incorrect.** The post used `allowedPattern` as the metadata key for the routerchecker component, but the correct field name per official docs is `rule`. Changed `allowedPattern` to `rule`.

3. **routerchecker was inaccurately described as a logging middleware.** The post claimed the routerchecker could be used to "capture raw request and response data." In reality, the routerchecker middleware only validates HTTP request paths against a regex pattern — it does not log or capture request/response data. Updated the description to accurately reflect that it serves as a permissive passthrough to verify the pipeline is assembled correctly, and updated the section title from "Use a Passthrough Middleware for Request Inspection" to "Use a Passthrough Middleware to Verify the Pipeline." Also updated the summary paragraph accordingly.

## Review Notes
- `middleware.http.uppercase` is a real Dapr built-in middleware, but it is a demo/test component intended only for local development to verify that the HTTP pipeline is working. This is appropriate in the context of a debugging guide.
- The metadata API response field `registeredComponents` may still work in some Dapr versions for backward compatibility, but `components` is the current and documented field name as of Dapr 1.12+.
- The `middleware.http.routerchecker` component is in Alpha status (v1). Users should be aware it may change in future Dapr releases.
