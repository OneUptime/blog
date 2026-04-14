# Validation Summary: How to Invoke Services Using Dapr HTTP API

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (Distributed Application Runtime)
- Dapr HTTP Service Invocation API (v1.0)
- curl (CLI HTTP client)
- Node.js with axios

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr How-To: Invoke Services: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Service Invocation Overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/

## Issues Found

### 1. Incorrect HTTP error codes in error handling section
**What was wrong:** The post listed `404 - app-id not found or method not registered`, `500 - target service returned an error`, and `503 - target service is unavailable` as Dapr error codes. According to the official Dapr API reference, the Dapr-specific error codes for the invoke API are 400 (method name not given), 403 (invocation forbidden by access control), and 500 (request failed). A 404 is not returned by Dapr when an app-id is not found — Dapr returns 500 in that case. The 503 code is also not a documented Dapr-specific error.
**What was changed:** Replaced the error code comments with the correct Dapr-documented codes: 400, 403, and 500 with accurate descriptions.

### 2. Invalid Node.js syntax — top-level await with CommonJS require
**What was wrong:** The Node.js example used `require('axios')` (CommonJS module syntax) combined with top-level `await`, which is not supported in CommonJS modules. This code would throw a `SyntaxError` at runtime.
**What was changed:** Wrapped the async code in an `async function createOrder()` and added a call to it, making the code syntactically valid in a CommonJS context.

## Review Notes
- The Dapr HTTP API also supports the PATCH method, which is not mentioned in the post. The post's examples cover GET, POST, PUT, and DELETE, and the summary states "all standard HTTP methods are supported," which is accurate — PATCH is simply not demonstrated.
- Dapr also supports alternative invocation formats (header-based with `dapr-app-id` header, and basic auth format), which the post does not cover. This is not an error — the post focuses on the standard `/v1.0/invoke/` path format.
- The URL format code block uses ```yaml syntax highlighting, which is not ideal for a URL but is not a technical error.
- The `v1.0` API version is confirmed as current in the official documentation.
