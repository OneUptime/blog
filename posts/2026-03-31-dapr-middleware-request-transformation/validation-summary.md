# Validation Summary: How to Use Middleware for Request Transformation in Dapr

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (middleware pipeline, HTTP middleware components)
- Dapr Wasm middleware (middleware.http.wasm, http-wasm ABI)
- Dapr Router Alias middleware (middleware.http.routeralias)
- Dapr Uppercase middleware (middleware.http.uppercase)
- Go / TinyGo (http-wasm guest SDK)
- Python / Flask (test application)
- Dapr CLI (dapr run)

## Sources Consulted
- Dapr supported middleware reference: https://docs.dapr.io/reference/components-reference/supported-middleware/
- Dapr uppercase middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-uppercase/
- Dapr Wasm middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-wasm/
- Dapr router alias middleware docs: https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-routeralias/
- Dapr Configuration spec: https://docs.dapr.io/reference/resource-specs/configuration-schema/
- Dapr CLI reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr service invocation API: https://docs.dapr.io/reference/api/service_invocation_api/
- http-wasm handler ABI spec: https://http-wasm.io/http-handler-abi/
- http-wasm guest TinyGo SDK: https://github.com/http-wasm/http-wasm-guest-tinygo

## Issues Found

1. **Wasm Go code used fictional API functions** (request handler section): The original code used `setRequestHeader()`, `generateCorrelationID()`, and an `//export handle_request` function signature that do not exist in the http-wasm guest SDK. Dapr's Wasm middleware uses the http-wasm ABI, and the TinyGo guest SDK (`github.com/http-wasm/http-wasm-guest-tinygo/handler`) provides a handler registration pattern with `handler.HandleRequestFn` and typed callback signatures (`func(req api.Request, resp api.Response) (next bool, reqCtx uint32)`). Replaced with correct SDK usage including proper imports and handler registration.

2. **Unused `"strings"` import**: The original Go code imported `"strings"` but never used it. Removed and replaced with the correct http-wasm SDK imports.

3. **Routeralias routes mapped between application-level paths**: The original routes mapped `/v1/order` to `/api/orders`, but the routeralias middleware operates at the Dapr sidecar level and should map alias paths to full Dapr API endpoint paths (e.g., `/v1.0/invoke/transform-service/method/api/orders`). Fixed the route targets to use the correct Dapr invoke path format, consistent with official documentation examples.

4. **Curl command was inconsistent with routeralias**: The original curl used the full Dapr invoke path (`/v1.0/invoke/transform-service/method/v1/order`), which would bypass the routeralias entirely since routeralias rewrites the incoming path before Dapr processes it. Updated the curl to use the short alias path (`http://localhost:3500/v1/order`) so the routeralias can rewrite it to the full Dapr invoke path.

5. **`--components-path` CLI flag is deprecated**: The `--components-path` flag for `dapr run` has been deprecated in favor of `--resources-path`. Updated the command to use the current flag.

6. **Response transformation Go code used fictional API**: The `handle_response` function used `setResponseHeader()` which doesn't exist. Replaced with correct http-wasm guest SDK pattern using `handler.HandleResponseFn` and the proper callback signature (`func(reqCtx uint32, req api.Request, resp api.Response, isError bool)`).

7. **Flask test app referenced removed header**: Updated the Flask application to match the corrected Wasm middleware code (removed `X-Correlation-ID` references since `generateCorrelationID()` was fictional).

## Review Notes
- The `middleware.http.uppercase` component is documented by Dapr as intended only for local development and testing. The blog correctly uses it as a simple introductory example, but readers should be aware it is not meant for production use.
- The pipeline example includes a `ratelimit` handler but no corresponding Component YAML is shown. This is fine for illustrative purposes but readers would need to define a `middleware.http.ratelimit` component with required metadata (e.g., `maxRequestsPerSecond`) for it to work.
- The Wasm component uses `file://./wasm/inject_headers.wasm` as a relative file path. While Dapr supports this, readers should be aware the path is relative to the Dapr process working directory.
