# Validation Summary: How to Use Dapr with Kubernetes Gateway API

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Dapr (sidecar architecture, mTLS, service invocation)
- Kubernetes Gateway API (GatewayClass, Gateway, HTTPRoute)
- Envoy Gateway (as the Gateway API controller implementation)
- Helm (for installing Envoy Gateway)
- TLS termination at the Gateway level

## Sources Consulted
- Kubernetes Gateway API official documentation (https://gateway-api.sigs.k8s.io/)
- Gateway API GitHub releases (https://github.com/kubernetes-sigs/gateway-api/releases)
- Envoy Gateway official documentation (https://gateway.envoyproxy.io/)
- Envoy Gateway Helm chart registry (https://hub.docker.com/r/envoyproxy/gateway-helm)
- Envoy Gateway compatibility matrix for Gateway API versions
- Dapr documentation on sidecar architecture and mTLS (https://docs.dapr.io/)

## Issues Found
1. **Incorrect Envoy Gateway metrics access method**: The post originally used `kubectl port-forward svc/envoy-gateway-metrics 8888 -n envoy-gateway-system` with `curl http://localhost:8888/metrics`. The service name `envoy-gateway-metrics` is incorrect, and the port 8888 does not match Envoy Gateway's metrics endpoint. Fixed to use the documented approach of port-forwarding directly to the Envoy Gateway controller pod on port 19001, using the correct pod selector (`control-plane=envoy-gateway,app.kubernetes.io/instance=eg`).

## Review Notes
- Gateway API v1.2.0 and Envoy Gateway v1.2.0 are correctly paired (confirmed compatible per the Envoy Gateway compatibility matrix), though newer versions exist (Gateway API v1.5.x, Envoy Gateway v1.3.x+). The versions used are valid and self-consistent.
- The TLS `certificateRefs` omits the optional `group: ""` field, which defaults correctly to the core API group. This is fine in practice.
- All Gateway API YAML manifests (GatewayClass, Gateway, HTTPRoute) use correct field names and structure for the `gateway.networking.k8s.io/v1` API version.
- The architectural explanation of how external traffic flows through the Gateway while Dapr handles internal service-to-service communication is accurate.
