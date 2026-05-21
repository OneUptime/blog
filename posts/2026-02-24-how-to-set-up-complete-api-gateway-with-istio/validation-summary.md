# Validation Summary: How to Set Up Complete API Gateway with Istio

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ingress gateways
- Istio Gateway, VirtualService, DestinationRule, RequestAuthentication, AuthorizationPolicy, and EnvoyFilter resources
- Envoy local rate limiting
- Kubernetes TLS secrets
- cert-manager Certificate resources
- curl and istioctl verification commands

## Sources Consulted
- Istio Secure Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/secure-ingress/
- Istio InvalidGatewayCredential analysis message: https://istio.io/latest/docs/reference/config/analysis/ist0161/
- Istio Ingress Gateways: https://istio.io/latest/docs/tasks/traffic-management/ingress/ingress-control/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio RequestAuthentication reference: https://istio.io/latest/docs/reference/config/security/request_authentication/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio Envoy rate limiting task: https://istio.io/latest/docs/tasks/policy-enforcement/rate-limit/
- Istio EnvoyFilter reference: https://istio.io/latest/docs/reference/config/networking/envoy-filter/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- cert-manager Certificate resource documentation: https://cert-manager.io/docs/usage/certificate/

## Issues Found
- The gateway architecture list claimed generic request/response transformation. Istio's documented VirtualService examples support header operations, redirects, rewrites, CORS, and direct responses, but not arbitrary request/response body transformation through these resources. Changed this to "Request header and response header manipulation."
- The AuthorizationPolicy public endpoint paths used exact matches for `/v1/products` and `/v1/search`, which would not cover subpaths such as `/v1/products/123`. Updated them to Istio's documented prefix wildcard form: `/v1/products*` and `/v1/search*`.
- The rate limiting section and verification text implied a single quota across the whole gateway. Envoy local rate limiting is enforced locally by each proxy instance. Added that caveat and updated the verification expectation to "per gateway proxy instance."

## Review Notes
- The examples use current Istio `networking.istio.io/v1` and `security.istio.io/v1` APIs where available. `EnvoyFilter` remains `networking.istio.io/v1alpha3` and is still the documented mechanism for Envoy rate limiting, but Istio warns that EnvoyFilter patches expose internal implementation details that require care during upgrades.
- The TLS secret must exist in the namespace where the selected gateway workload runs. The post uses `istio-system`, which matches the default Istio ingress gateway installation.
