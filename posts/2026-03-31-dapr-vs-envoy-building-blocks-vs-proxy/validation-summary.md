# Validation Summary: Dapr vs Envoy: Building Blocks vs Proxy

## Status
validated

## Post Type
Comparison / Reference

## Technologies Covered
- Dapr (application runtime, sidecar model)
- Envoy Proxy (L4/L7 proxy, data plane)
- Istio, Consul Connect, AWS App Mesh (service meshes using Envoy)
- gRPC (inter-sidecar communication)
- OAuth2 (middleware example)

## Sources Consulted
- Envoy Proxy official documentation — https://www.envoyproxy.io/docs/envoy/latest/
- Dapr State Management API reference — https://docs.dapr.io/reference/api/state_api/
- Dapr Pub/Sub API reference — https://docs.dapr.io/reference/api/pubsub_api/
- Dapr OAuth2 middleware documentation — https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2/
- Dapr OAuth2 Client Credentials middleware documentation — https://docs.dapr.io/reference/components-reference/supported-middleware/middleware-oauth2clientcredentials/
- Dapr mTLS Configuration documentation — https://docs.dapr.io/operations/security/mtls/
- Envoy xDS protocol documentation — https://www.envoyproxy.io/docs/envoy/latest/api-docs/xds_protocol

## Issues Found
1. **Envoy protocol listing was incomplete and misleading**: The post listed "TCP and HTTP/2 proxying" as an Envoy capability, omitting HTTP/1.1 and HTTP/3 (QUIC). Envoy has supported HTTP/1.1 since its inception and it remains the most common protocol proxied. HTTP/3 (QUIC) support is also available in current releases. Changed to "TCP, HTTP/1.1, HTTP/2, and HTTP/3 (QUIC) proxying" for accuracy.

## Review Notes
- The Dapr middleware YAML example uses `middleware.http.oauth2` which is the valid type for the OAuth2 Authorization Code flow. Dapr also has a separate `middleware.http.oauth2clientcredentials` type for the Client Credentials flow. The example is correct as-is.
- The mTLS configuration snippet is a partial YAML showing only the `spec` section. The full Dapr Configuration resource would include `apiVersion`, `kind`, and `metadata` fields. This is acceptable as an illustrative snippet since the surrounding context makes the purpose clear.
- The Dapr state and pub/sub curl examples use correct API paths and payload formats per current Dapr documentation.
- The post's framing of Dapr and Envoy as complementary rather than competing tools is accurate and well-articulated.
