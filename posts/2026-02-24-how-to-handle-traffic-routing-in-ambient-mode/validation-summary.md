# Validation Summary: How to Handle Traffic Routing in Ambient Mode

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio ambient mode
- Istio ztunnel
- Istio waypoint proxies
- Istio VirtualService and DestinationRule APIs
- Kubernetes Gateway API
- Kubernetes namespaces, services, pods, and labels

## Sources Consulted
- Istio ambient mode waypoint proxy documentation: https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio ambient mode Layer 7 features documentation: https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio ambient mode traffic distribution documentation: https://istio.io/latest/docs/ambient/usage/traffic-distribution/
- Istio ambient mode manage traffic guide: https://istio.io/latest/docs/ambient/getting-started/manage-traffic/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio resource labels reference: https://istio.io/latest/docs/reference/config/labels/

## Issues Found
- The post implied VirtualService is fully equivalent to sidecar mode in ambient. Updated the text to note that VirtualService support with ambient mode is currently alpha and must not be mixed with Gateway API route configuration for the same traffic.
- The waypoint Gateway example used `gateway.networking.k8s.io/v1beta1` and omitted the current generated `istio.io/waypoint-for: service` label. Updated the snippet to `gateway.networking.k8s.io/v1` with the waypoint label.
- The post showed `istioctl waypoint apply --service-account`, but the current `istioctl waypoint apply` reference does not include that flag. Replaced it with a supported service-specific waypoint plus `istio.io/use-waypoint` service label.
- The post described service-account-level waypoint scoping. Updated this to namespace, service, and pod scoping, matching current Istio waypoint documentation and label support.
- The cross-namespace canary example routed to `stable` and `canary` subsets without defining a matching `DestinationRule`. Added the matching `DestinationRule` and placed the routing resources in the backend namespace where the destination waypoint enforces L7 behavior.
- The post said ztunnel does not support locality-aware routing. Updated this to explain that ztunnel can apply locality preferences through Istio's traffic-distribution annotation or Kubernetes `spec.trafficDistribution`, while HTTP-header consistent hashing still needs L7 processing at a waypoint.

## Review Notes
The VirtualService examples are syntactically valid Istio resources, but for new ambient mode traffic routing Istio's current documentation primarily demonstrates Gateway API route resources such as HTTPRoute. A future revision could convert the examples to Gateway API, while keeping VirtualService examples only where Istio-specific features such as fault injection are needed.
