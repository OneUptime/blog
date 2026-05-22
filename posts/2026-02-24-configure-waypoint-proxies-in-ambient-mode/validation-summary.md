# Validation Summary: How to Configure Waypoint Proxies in Ambient Mode

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- ztunnel
- Kubernetes Gateway API
- Istio AuthorizationPolicy
- Istio VirtualService and DestinationRule
- Kubernetes HorizontalPodAutoscaler
- kubectl and istioctl

## Sources Consulted
- Istio documentation: Configure waypoint proxies, https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio documentation: Use Layer 7 features, https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio documentation: istioctl command reference, https://istio.io/latest/docs/reference/commands/istioctl/
- Istio documentation: Resource labels, https://istio.io/latest/docs/reference/config/labels/
- Istio documentation: AuthorizationPolicy reference, https://istio.io/latest/docs/reference/config/security/authorization-policy/
- Kubernetes documentation: HorizontalPodAutoscaler walkthrough and autoscaling/v2 API behavior, https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/

## Issues Found
- The `istioctl waypoint apply -n bookinfo --enroll-namespace` command would create the default waypoint named `waypoint`, while the rest of the post refers to `bookinfo-waypoint`. Changed the command to include `--name bookinfo-waypoint` so the generated Gateway, Deployment, labels, and later examples are consistent.
- The deployment section did not show that the namespace must be enrolled into ambient mode for ambient waypoint routing to apply. Added the `istio.io/dataplane-mode=ambient` namespace label command before waypoint creation.
- The "Waypoint Proxy per Service Account" section described service-account-specific waypoints but the YAML and command actually configure a Service waypoint. Renamed the section and adjusted the text to refer to services or pods, matching Istio's supported `istio.io/use-waypoint` resource types.
- The post presented VirtualService routing as generally current for waypoint traffic. Istio's current documentation states that VirtualService usage in ambient mode is Alpha and stable waypoint traffic routing should use Kubernetes Gateway API route resources such as HTTPRoute. Added that caveat while keeping the author's examples intact.
- The waypoint deletion command omitted the custom waypoint name used elsewhere in the post. Updated it to `istioctl waypoint delete bookinfo-waypoint -n bookinfo`.

## Review Notes
The remaining examples are syntactically plausible for the APIs shown. The VirtualService examples are retained as Alpha ambient-mode examples; future revisions should consider converting routing, retry, timeout, and fault-injection examples to Gateway API resources where Istio documents stable support.
