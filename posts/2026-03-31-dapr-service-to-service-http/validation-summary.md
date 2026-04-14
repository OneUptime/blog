# Validation Summary: How to Set Up Dapr Service-to-Service Communication with HTTP

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Dapr (service invocation building block)
- Python (Flask)
- Node.js (axios)
- Kubernetes (pod annotations, namespaces)
- Zipkin (distributed tracing)
- W3C Trace Context

## Sources Consulted
- Dapr Service Invocation API Reference: https://docs.dapr.io/reference/api/service_invocation_api/
- Dapr CLI Reference (dapr run): https://docs.dapr.io/reference/cli/dapr-run/
- Dapr Service Invocation Namespaces: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/service-invocation-namespaces/
- Dapr mTLS Documentation: https://docs.dapr.io/operations/security/mtls/
- Dapr Environment Variables Reference: https://docs.dapr.io/reference/environment/
- Dapr W3C Tracing Overview: https://docs.dapr.io/operations/observability/tracing/w3c-tracing-overview/
- Dapr Zipkin Tracing Setup: https://docs.dapr.io/operations/observability/tracing/setup-tracing/
- Dapr How-To: Invoke Services: https://docs.dapr.io/developing-applications/building-blocks/service-invocation/howto-invoke-discover-services/

## Issues Found
1. **Namespace-aware invocation mixed URL patterns**: The "FQDN format" example for cross-namespace invocation incorrectly combined the `/v1.0/invoke/` endpoint URL (`http://localhost:3500/v1.0/invoke/service-b/method/hello`) with a `dapr-app-id: service-b.production` header. The `dapr-app-id` header is used with Dapr's HTTP proxy invocation method, not the `/v1.0/invoke/` API. Fixed by changing the URL to the proxy format (`http://localhost:3500/hello`) with the `dapr-app-id` header, which is the correct documented pattern.

## Review Notes
- The `invoke_service_b` function in `service_a.py` uses a parameter named `method` that actually represents the app ID. This is misleading but not technically incorrect since the code works as intended.
- The tracing configuration uses `http://zipkin:9411/api/v2/spans` as the endpoint address, which is correct for a Kubernetes deployment where Zipkin is accessible via its service name. The official docs often show `http://localhost:9411/api/v2/spans` for local development; both are valid depending on the deployment context.
