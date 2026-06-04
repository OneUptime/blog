# Validation Summary: How to Configure Cross-Namespace Resource Sharing with ReferenceGrant

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Kubernetes Gateway API
- ReferenceGrant
- Gateway
- HTTPRoute
- Kubernetes Services and Secrets
- Kubernetes Python client

## Sources Consulted
- Gateway API ReferenceGrant documentation: https://gateway-api.sigs.k8s.io/reference/api-types/referencegrant/
- Gateway API API reference: https://gateway-api.sigs.k8s.io/reference/api-spec/main/spec/
- Gateway API v1.4.1 ReferenceGrant CRD: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_referencegrants.yaml
- Gateway API v1.4.1 Gateway CRD: https://raw.githubusercontent.com/kubernetes-sigs/gateway-api/v1.4.1/config/crd/standard/gateway.networking.k8s.io_gateways.yaml
- Gateway API GitHub releases: https://github.com/kubernetes-sigs/gateway-api/releases

## Issues Found
- The post described ReferenceGrant as enabling arbitrary cross-namespace sharing, including ConfigMaps and Route-to-Gateway attachment. Updated the wording to clarify that ReferenceGrant applies to supported Gateway API cross-namespace object references, and noted that cross-namespace Route-to-Gateway attachment is controlled by listener `allowedRoutes`.
- The install command used Gateway API v1.0.0. Updated it to v1.4.1, the current stable release checked during review.
- The basic example said it allowed a Gateway to reference services, but the grant actually permits HTTPRoutes to reference Services. Updated the surrounding text.
- The multi-tenant example incorrectly used ReferenceGrant to authorize an HTTPRoute parentRef to a Gateway. Replaced that with listener `allowedRoutes` and a namespace label selector, which is the Gateway API mechanism for cross-namespace route attachment.
- The multi-tenant Gateway referenced a TLS Secret in another namespace without a corresponding ReferenceGrant. Added a ReferenceGrant in the certificate namespace permitting the Gateway to reference that Secret.
- The Python audit script treated a missing `from.namespace` as possible even though ReferenceGrant requires it. Updated the script to read the required field directly.

## Review Notes
- `ReferenceGrant` remains served as `gateway.networking.k8s.io/v1beta1` in the Gateway API v1.4.1 standard CRD, so the post's ReferenceGrant API version is still correct.
- YAML snippets were parsed successfully after edits.
- Python code was checked for syntax with `ast.parse`. The local environment did not have `kubectl` installed, so CLI verification was based on official command examples and published release assets rather than local `kubectl` help output.
