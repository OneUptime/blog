# Validation Summary: How to Compare Istio Gateway API vs Istio Classic APIs

## Status
validated

## Post Type
Guide

## Technologies Covered
- Istio traffic management APIs
- Kubernetes Gateway API
- HTTPRoute
- Gateway
- VirtualService
- DestinationRule
- ServiceEntry
- AuthorizationPolicy and PeerAuthentication
- EnvoyFilter

## Sources Consulted
- Istio Kubernetes Gateway API documentation: https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio Gateway reference: https://istio.io/latest/docs/reference/config/networking/gateway/
- Istio traffic management concepts: https://istio.io/latest/docs/concepts/traffic-management/
- Istio mirroring task: https://istio.io/latest/docs/tasks/traffic-management/mirroring/
- Istio fault injection task: https://istio.io/latest/docs/tasks/traffic-management/fault-injection/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio PeerAuthentication reference: https://istio.io/latest/docs/reference/config/security/peer_authentication/
- Kubernetes Gateway API introduction: https://gateway-api.sigs.k8s.io/docs/introduction/
- Kubernetes Gateway API mesh overview: https://gateway-api.sigs.k8s.io/mesh/
- Kubernetes Gateway API HTTPRoute documentation: https://gateway-api.sigs.k8s.io/api-types/httproute/
- Kubernetes Gateway API HTTP traffic splitting guide: https://gateway-api.sigs.k8s.io/guides/traffic-splitting/
- Kubernetes Gateway API HTTP request mirroring guide: https://gateway-api.sigs.k8s.io/guides/user-guides/http-request-mirroring/
- Kubernetes Gateway API BackendTrafficPolicy documentation: https://gateway-api.sigs.k8s.io/api-types/backendtrafficpolicy/

## Issues Found
- The post referred to `BackendLBPolicy`, but current Gateway API documentation uses `BackendTrafficPolicy` for experimental backend traffic behavior. Updated the resource mapping and traffic policy discussion.
- The post mapped Istio `ServiceEntry` to `ServiceImport`, but `ServiceImport` is not a direct equivalent for Istio external-service registration. Updated the mapping to say there is no direct equivalent.
- Istio YAML examples used `networking.istio.io/v1beta1`. The current Istio documentation uses `networking.istio.io/v1` for these resources, so the examples were updated.
- The Istio canary and header-routing examples referenced DestinationRule subsets without defining the required `DestinationRule` resources. Added minimal `DestinationRule` examples with `v1` and `v2` subsets.
- The post said traffic mirroring is not available in Gateway API. Gateway API supports HTTP request mirroring through the `RequestMirror` HTTPRoute filter, while Istio classic APIs support subset-based mirroring. Updated the wording to reflect that distinction.
- The summary and recommendation sections listed traffic mirroring as requiring Istio classic APIs. Updated this to refer specifically to subset-based mirroring and advanced DestinationRule traffic policies.

## Review Notes
Gateway API feature support varies by conformance profile and support level. The post is accurate as a high-level comparison, but future updates could call out Core, Extended, and Experimental Gateway API support levels more explicitly.
