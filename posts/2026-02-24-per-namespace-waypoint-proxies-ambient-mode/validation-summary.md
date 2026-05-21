# Validation Summary: How to Configure Per-Namespace Waypoint Proxies in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Kubernetes Gateway API
- Istio AuthorizationPolicy
- Gateway API HTTPRoute
- Kubernetes Deployments and HorizontalPodAutoscaler

## Sources Consulted
- Istio documentation: Configure waypoint proxies - https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio documentation: Use Layer 7 features - https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio documentation: Enforce authorization policies - https://istio.io/latest/docs/ambient/getting-started/enforce-auth-policies/
- Istio documentation: Manage traffic - https://istio.io/latest/docs/ambient/getting-started/manage-traffic/
- Istio documentation: Ambient data plane - https://istio.io/latest/docs/ambient/architecture/data-plane/
- Istio documentation: Kubernetes Gateway API resource attachment and scaling - https://istio.io/latest/docs/tasks/traffic-management/ingress/gateway-api/
- Istio documentation: Resource labels - https://istio.io/latest/docs/reference/config/labels/

## Issues Found

1. **Manual Gateway example used an outdated API version.** Changed `gateway.networking.k8s.io/v1beta1` to `gateway.networking.k8s.io/v1` and added the generated waypoint label `istio.io/waypoint-for: service` to match current Istio waypoint output and document the traffic type handled by the waypoint.

2. **AuthorizationPolicy example was not attached correctly for waypoint enforcement.** Ambient L7 authorization policies must use `targetRefs` to attach to a waypoint or to a service using that waypoint. Added `targetRefs` for the waypoint Gateway and changed the example from an incomplete JWT-style policy to an HTTP method/path allow policy.

3. **Traffic routing example used VirtualService as the primary waypoint routing example.** Current Istio L7 ambient documentation recommends Gateway API route resources, and VirtualService use with ambient is alpha. Replaced the VirtualService example with an HTTPRoute attached to the `reviews` service.

4. **Waypoint Deployment and Pod lookup commands used a less appropriate controller label.** Updated the commands to use the documented generated Gateway label `gateway.networking.k8s.io/gateway-name=waypoint`.

5. **Troubleshooting and summary text implied L7 policies and VirtualServices could be applied as usual.** Updated the text to mention `targetRefs` and HTTPRoute attachment to the waypoint or services that use it.

## Review Notes
- The remaining DestinationRule example is syntactically valid Istio `networking.istio.io/v1`, but future ambient-focused traffic examples should prefer Gateway API resources where possible because Istio documents waypoint routing primarily through Gateway API route attachment.
- The `kubectl exec ... curl localhost:15000/stats` command assumes the waypoint proxy image has a usable `curl` binary. If that is not true in a given environment, users may need to use `istioctl proxy-config` or another debug approach.
