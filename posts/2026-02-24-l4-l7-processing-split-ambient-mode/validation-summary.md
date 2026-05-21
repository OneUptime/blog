# Validation Summary: How to Understand L4 and L7 Processing Split in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- ztunnel
- waypoint proxies
- Istio AuthorizationPolicy
- Istio telemetry metrics
- Kubernetes Gateway API
- Kubernetes CLI workflows

## Sources Consulted
- Istio Ambient Mode overview: https://istio.io/latest/docs/ambient/overview/
- Istio ambient data plane architecture: https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio Layer 4 security policy guide: https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio Layer 7 features guide: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio waypoint proxy guide: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient authorization policy getting started guide: https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio AuthorizationPolicy reference: https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Istio standard metrics reference: https://istio.io/latest/docs/reference/config/metrics/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/

## Issues Found
- The L4 authorization attribute list implied policies can directly match a destination namespace. Updated this to describe source namespace and the policy target namespace or workload, matching Istio's supported L4 attributes and policy scoping.
- The traffic flow incorrectly placed L4 authorization enforcement on the outbound ztunnel path. Updated the flow to show destination ztunnel enforcement, and noted that when traffic arrives through a waypoint, destination ztunnel sees the waypoint identity.
- The generic L7 AuthorizationPolicy example lacked `targetRefs`, which waypoint-enforced policies require in ambient mode. Added a Service `targetRefs` block.
- The section on L7 policies without a waypoint said they simply have no effect. Updated it to distinguish `targetRefs` policies that require a service using a waypoint from selector-based L7 policies, which ztunnel cannot evaluate and therefore fail safe as deny.
- The migration commands described all VirtualServices and advanced DestinationRules as needing waypoint proxies. Updated the wording to reflect that VirtualService use in ambient mode is Alpha, Gateway API HTTP routing is the preferred waypoint-compatible path, and DestinationRules may need migration review rather than directly implying all such resources are L7 waypoint inputs.

## Review Notes
The post is technically relevant and code-bearing. The remaining examples are illustrative and assume the referenced namespaces, services, CRDs, and Istio ambient installation already exist. Istio ambient support continues to evolve, so future reviews should re-check the status of VirtualService support and waypoint attachment semantics against the current Istio release.
