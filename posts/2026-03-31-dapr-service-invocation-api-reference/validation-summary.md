# Validation Summary: How to Use the Dapr Service Invocation API Reference

## Status
validated

## Post Type
Reference

## Technologies Covered
- Dapr (service invocation building block)
- Dapr Sidecar (HTTP API)
- Dapr JavaScript SDK (`@dapr/dapr`)
- Dapr Resiliency resource
- Kubernetes (cross-namespace invocation)
- gRPC (mentioned)
- curl (CLI examples)

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr Service Invocation How-To: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/
- Dapr Service Invocation Namespaces: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-namespaces/
- Dapr Service Invocation Overview: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-overview/
- Dapr Resiliency Overview: https://docs.dapr.io/operations/resiliency/resiliency-overview/
- Dapr JavaScript SDK documentation: https://docs.dapr.io/developing-applications/sdks/js/

## Issues Found

### 1. Incorrect Response Codes table
**What was wrong:** The table listed `404` as a Dapr response for "Target app not found or endpoint not registered" and described `500` as "Target app returned 5xx." The official Dapr API reference does not document a 404 response for the service invocation endpoint. When a target app is unreachable, Dapr returns 500. The table also omitted documented response codes 400 (method name not given) and 403 (invocation forbidden by access control).

**What was changed:** Replaced the table with the officially documented response codes:
- `XXX` — Upstream status returned from target app (Dapr passes through the target's status code)
- `400` — Method name not given
- `403` — Invocation forbidden by access control
- `500` — Request failed or target app unreachable

**Why:** The original table could mislead readers into expecting a 404 when debugging service discovery issues, when in fact Dapr returns 500 in those scenarios.

## Review Notes
- The JavaScript SDK example uses CommonJS `require()` syntax while official Dapr JS SDK docs show ES module `import` syntax. Both are functionally correct; CommonJS is a valid choice for Node.js environments.
- The claim that custom headers are "forwarded to the target application" is a reasonable and practically accurate statement, though the official docs do not explicitly document header forwarding behavior for the HTTP API. The SDK docs do show passing custom headers through invoke options.
- The Overview mentions "automatic retries" as a sidecar feature. Dapr does provide built-in retry behavior for transient errors, though configurable retry policies require a Resiliency resource (which the post correctly covers in a later section).
