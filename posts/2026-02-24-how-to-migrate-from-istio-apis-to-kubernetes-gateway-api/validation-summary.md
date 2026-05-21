# Validation Summary: How to Migrate from Istio APIs to Kubernetes Gateway API

## Status
validated

## Post Type
Tutorial / migration guide

## Technologies Covered
- Istio Gateway, VirtualService, DestinationRule, ServiceEntry, Sidecar, and AuthorizationPolicy
- Kubernetes Gateway API GatewayClass, Gateway, HTTPRoute, TLSRoute, TCPRoute, GRPCRoute, and ReferenceGrant
- Kubernetes Services and Secrets
- kubectl

## Sources Consulted
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Gateway API getting started and CRD installation guide: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Gateway API API overview: https://gateway-api.sigs.k8s.io/concepts/api-overview/
- Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Gateway API HTTP redirects and rewrites guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-redirect-rewrite/
- Gateway API HTTP request mirroring guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-request-mirroring/
- Gateway API standard specification: https://gateway-api.sigs.k8s.io/reference/spec/

## Issues Found
- The Gateway API CRD installation commands used the older v1.2.0 release bundle. Updated the examples to v1.5.1 and added `--server-side`, matching current Gateway API/Istio installation guidance.
- The post described GRPCRoute as an experimental resource. GRPCRoute has been in the Standard Channel since Gateway API v1.1.0, so the experimental install comment was changed to mention TCPRoute and UDPRoute only.
- The post stated that request mirroring and timeouts still require Istio resources. HTTPRoute supports request mirroring and has standard timeout fields, so the wording now distinguishes those features from fault injection and advanced retry behavior that may still require Istio-specific resources.

## Review Notes
- Gateway API support levels vary by implementation, especially for Extended and Experimental features. The post now calls out implementation-specific support where relevant.
- The remaining YAML examples use current API groups and field names for the resources shown.
