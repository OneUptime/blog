# Validation Summary: Kubernetes Ingress vs Gateway API: What to Use in 2026

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Kubernetes Ingress
- Kubernetes Gateway API
- GatewayClass, Gateway, HTTPRoute, GRPCRoute, TLSRoute, TCPRoute, UDPRoute
- ReferenceGrant and cross-namespace routing
- kubectl
- NGINX Gateway Fabric

## Sources Consulted
- Kubernetes Ingress documentation: https://kubernetes.io/docs/concepts/services-networking/ingress/
- Kubernetes Ingress v1 API reference: https://kubernetes.io/docs/reference/kubernetes-api/networking/ingress-v1/
- Gateway API overview: https://gateway-api.sigs.k8s.io/docs/concepts/api-overview/
- Gateway API versioning documentation: https://gateway-api.sigs.k8s.io/docs/concepts/versioning/
- Gateway API getting started and CRD install documentation: https://gateway-api.sigs.k8s.io/guides/getting-started/introduction/
- Gateway API cross-namespace routing guide: https://gateway-api.sigs.k8s.io/guides/user-guides/multiple-ns/
- Gateway API reference specification: https://gateway-api.sigs.k8s.io/reference/spec/
- Gateway API GitHub releases and project status: https://github.com/kubernetes-sigs/gateway-api/releases
- NGINX Gateway Fabric installation documentation: https://docs.nginx.com/nginx-gateway-fabric/install/manifests/open-source/

## Issues Found
- The post stated that Gateway API had reached GA broadly. Updated the wording to clarify that core resources such as GatewayClass, Gateway, HTTPRoute, GRPCRoute, TLSRoute, and ReferenceGrant are GA, while TCPRoute and UDPRoute remain experimental.
- The timeline listed Ingress GA as 2019. Corrected it to 2020, matching Kubernetes v1.19 stable status.
- The Gateway and HTTPRoute examples placed the Gateway in `gateway-system` and routes in `default`, but the Gateway listeners did not allow cross-namespace route attachment. Added `allowedRoutes.namespaces.from: All` to the listeners.
- The standalone HTTPRoute examples referenced `main-gateway` without a namespace. Added `namespace: gateway-system` to match the earlier Gateway example.
- The feature comparison listed TCP/UDP routing as a stable Gateway API capability. Updated it to call TCPRoute and UDPRoute experimental.
- The cross-namespace routing comparison attributed the capability only to ReferenceGrant. Updated it to mention `allowedRoutes` for route attachment and ReferenceGrant for cross-namespace object references.
- The Gateway API CRD install command used v1.2.0 and omitted server-side apply. Updated it to the current v1.5.1 release with `kubectl apply --server-side`.
- The NGINX Gateway Fabric example URL returned 404. Replaced it with the current documented v2.6.2 manifest install URL.

## Review Notes
The YAML snippets parse successfully. `kubectl` is not installed in this workspace, so commands could not be executed locally against a client or cluster; command syntax and URLs were verified against official documentation and direct HTTP checks.
