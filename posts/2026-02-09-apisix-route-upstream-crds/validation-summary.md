# Validation Summary: How to Configure APISIX Route and Upstream CRDs for Dynamic API Management

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Apache APISIX Ingress Controller
- Kubernetes Custom Resource Definitions
- ApisixRoute
- ApisixUpstream
- ApisixTls
- kubectl
- YAML

## Sources Consulted
- Apache APISIX Ingress Controller 2.1.0 CRD API Reference: https://apisix.apache.org/docs/ingress-controller/reference/apisix-ingress-controller/api-reference/
- Apache APISIX Ingress Controller 2.1.0 Configuration Examples: https://apisix.apache.org/docs/ingress-controller/reference/apisix-ingress-controller/examples/
- Apache APISIX Ingress Controller 1.8.0 ApisixRoute/v2 Reference: https://apisix.apache.org/docs/ingress-controller/1.8.0/references/apisix_route_v2/
- Apache APISIX Ingress Controller 1.8.0 ApisixUpstream Reference: https://apisix.apache.org/docs/ingress-controller/1.8.0/references/apisix_upstream/
- Apache APISIX Ingress Controller ApisixRoute Concepts: https://apisix.apache.org/docs/ingress-controller/concepts/apisix_route/

## Issues Found
- The post said CRDs translate to APISIX configuration in etcd. Current APISIX Ingress Controller documentation describes reconciliation through the controller and control plane, so the wording was changed to avoid an etcd-specific implementation claim.
- The route example used `upstreamName`, which is not a documented `ApisixRoute` v2 field. It was replaced with a backend service reference, and the `ApisixUpstream` name was aligned with that service as described by the ApisixUpstream concept documentation.
- The weighted routing example defined subsets but did not use them or assign traffic weights. A matching `ApisixRoute` was added using `subset` and `weight` on route backends.
- The post described upstream health checks as circuit breakers. APISIX upstream health checks provide active/passive health checking and failover, while circuit breaking is not configured by the shown `ApisixUpstream` fields. The section title, description, comment, and conclusion were updated accordingly.

## Review Notes
The examples omit `ingressClassName`, which is accepted in many single-controller installations but may need to be set in clusters with multiple ingress controllers or when the controller is configured to watch a specific class. The gateway Service name and namespace used in curl examples can vary by Helm release and installation choices.
