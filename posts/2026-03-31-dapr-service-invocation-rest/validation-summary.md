# Validation Summary: How to Use Dapr Service Invocation with REST APIs

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation API)
- REST / HTTP (methods, status codes, content negotiation)
- Node.js / Express.js
- curl (CLI HTTP client)
- axios (JavaScript HTTP client)

## Sources Consulted
- Dapr Service Invocation API reference — https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Service Invocation overview — https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Express.js API documentation — https://expressjs.com/en/4x/api.html
- axios documentation — https://axios-http.com/docs/handling_errors
- Cross-referenced with 170+ other Dapr blog posts in this repository for consistency

## Issues Found
No technical issues found.

## Review Notes
- The invoke URL pattern `http://localhost:3500/v1.0/invoke/{app-id}/method/{path}` is correct and current for Dapr v1.x.
- All HTTP methods (GET, POST, PUT, DELETE) are correctly demonstrated through the Dapr sidecar.
- The Express.js code uses proper REST conventions: 201 for resource creation, 204 for successful deletion with no body, 404 for not found.
- The error handling example with axios correctly uses optional chaining (`err.response?.status`) and handles appropriate HTTP status codes (404, 409, 422).
- Query parameters and content negotiation headers (Accept, Content-Type) are correctly shown as being passed through the Dapr invoke URL.
- The default Dapr HTTP port 3500 is correct (configurable via `--dapr-http-port` flag or `DAPR_HTTP_PORT` environment variable, but 3500 is the standard default).
- The summary statement accurately describes the invoke URL prepend pattern.
