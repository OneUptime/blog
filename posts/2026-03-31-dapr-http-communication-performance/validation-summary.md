# Validation Summary: How to Optimize Dapr HTTP Communication Performance

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dapr (sidecar model, service invocation, resiliency policies, middleware, Kubernetes annotations)
- Node.js (@dapr/dapr SDK)
- Python (httpx async HTTP client)
- Go (compress/gzip, net/http)
- hey (HTTP load testing tool)
- Kubernetes (kubectl, pod annotations)

## Sources Consulted
- Dapr JS SDK source code (dapr/js-sdk on GitHub) — DaprClient constructor options and HTTPClient agent handling
- Dapr official documentation — Kubernetes annotations reference (https://docs.dapr.io/reference/arguments-annotations-overview/)
- Dapr official documentation — Resiliency policies (https://docs.dapr.io/operations/resiliency/)
- Dapr official documentation — Middleware components (https://docs.dapr.io/reference/components-reference/supported-middleware/)
- httpx documentation and source code — AsyncClient and Limits class parameters
- rakyll/hey GitHub repository — CLI flag reference

## Issues Found

1. **Node.js DaprClient constructor used invalid options**: The code passed `httpEndpoint` and `agent` to the `DaprClient` constructor, neither of which are valid options in the @dapr/dapr SDK. The SDK manages its own internal HTTP agents with keep-alive already enabled by default. Fixed by removing the custom `http.Agent` setup and the invalid options, and using the correct `isKeepAlive` option instead.

2. **Resiliency YAML timeout name mismatch**: The `targets.apps.orderservice.timeout` referenced `httpTimeout`, but the timeout was defined as `defaultTimeout` under `policies.timeouts`. This would cause Dapr to fail to resolve the timeout policy. Fixed by changing the reference to `defaultTimeout`.

3. **Non-existent `dapr.io/http2-enabled` annotation**: There is no `dapr.io/http2-enabled` Kubernetes annotation in Dapr. HTTP/2 is enabled by setting `dapr.io/app-protocol: "h2c"` (HTTP/2 cleartext). Fixed by removing the fake annotation and changing the protocol to `h2c`.

4. **Deprecated and malformed `dapr.io/http-read-buffer-size` annotation**: The annotation name `dapr.io/http-read-buffer-size` is deprecated in favor of `dapr.io/read-buffer-size`. Additionally, the value `"32"` lacked size units — the correct format is `"32Ki"` (kilobytes). Fixed both the name and value.

5. **Misleading compression section with unrelated middleware**: The section titled "Compress Large Response Payloads" showed a `middleware.http.routeralias` component YAML, which is a route alias middleware, not a compression middleware. This was misleading. Removed the irrelevant routeralias YAML and kept the Go gzip handler example, which actually demonstrates compression.

6. **Go code missing imports**: The Go compression snippet used `strings.Contains` without importing the `strings` package, and was missing the `net/http` import. Added the complete import block.

## Review Notes
- The @dapr/dapr Node.js SDK already enables keep-alive by default (`isKeepAlive: true`), so the connection reuse section's value is more about awareness than configuration. Users don't need to do anything special for keep-alive in the JS SDK.
- The `gzipResponseWriter` type used in the Go snippet is still not defined in the code example — it would need a custom struct wrapping `gzip.Writer` and `http.ResponseWriter`. This is acceptable for a snippet but readers would need to implement it.
- The `dapr.io/max-body-size` annotation is the current preferred name; the deprecated `dapr.io/http-max-request-size` should be avoided.
