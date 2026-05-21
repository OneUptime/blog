# Validation Summary: How to Troubleshoot Waypoint Proxy Issues in Ambient Mode

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Istio ambient mode
- Istio waypoint proxies
- Istio AuthorizationPolicy, VirtualService, DestinationRule, Telemetry, and proxy-config tooling
- Kubernetes Gateway API
- Kubernetes kubectl operations
- Envoy proxy diagnostics

## Sources Consulted
- Istio documentation: Configure waypoint proxies - https://istio.io/latest/docs/ambient/usage/waypoint/
- Istio documentation: Troubleshoot issues with waypoints - https://istio.io/latest/docs/ambient/usage/troubleshoot-waypoint/
- Istio documentation: Use Layer 7 features - https://istio.io/latest/docs/ambient/usage/l7-features/
- Istio documentation: Use Layer 4 security policy - https://istio.io/latest/docs/ambient/usage/l4-policy/
- Istio documentation: Telemetry API reference - https://istio.io/latest/docs/reference/config/telemetry/
- Istio documentation: Envoy Access Logs - https://istio.io/latest/docs/tasks/observability/logs/access-log/
- Istio preliminary migration documentation: Migrate from Sidecar to Ambient - https://preliminary.istio.io/latest/docs/ambient/migrate/
- Istio documentation: istioctl command reference - https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes documentation: kubectl debug - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_debug/
- Kubernetes documentation: kubectl set resources - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_set/kubectl_set_resources/

## Issues Found
- The introduction said waypoint proxies handle all L7 traffic processing in ambient mode. Updated it to clarify that they handle L7 processing for enrolled resources.
- The ztunnel verification command used `istioctl ztunnel-config workloads` for namespace/service waypoint enrollment and said the column should show a waypoint address. Updated it to use `istioctl ztunnel-config service` for service traffic, clarified that the column shows the waypoint name, and noted that `ztunnel-config workload` is for direct pod-IP traffic.
- The backend reachability check used `kubectl exec` with `curl` inside the waypoint deployment. Waypoint proxy containers should not be assumed to include curl, so the command was changed to use a Kubernetes ephemeral debug container with `curlimages/curl` in the waypoint pod's network namespace.
- The L7 AuthorizationPolicy explanation said an L7 policy without a waypoint would not be enforced. Updated it to include Istio's fail-safe behavior when an L7 policy is targeted to ztunnel with a workload selector, and clarified the separate case where a `targetRefs` policy has no enrolled waypoint to enforce it.
- The VirtualService section implied full ambient support. Updated it to state that VirtualService support in ambient is alpha, that Gateway API `HTTPRoute` is preferred for waypoints, and that mixing VirtualService and Gateway API routing for the same workload is unsupported.
- The VirtualService host note said the host must match the Kubernetes service name. Updated it to allow the service short name or FQDN.
- The resource-limit patch command used JSON Patch `replace` operations that fail if resource limit paths do not already exist. Replaced it with `kubectl set resources`.
- The Telemetry access logging example used a workload `selector` for a waypoint. Updated it to use `targetRefs` pointing at the waypoint `Gateway`, as Istio documents that gateways and waypoints are targeted with `targetRefs`.
- The Envoy config dump sentence and troubleshooting checklist only mentioned VirtualService routing. Updated them to include HTTPRoute as the preferred waypoint routing API.

## Review Notes
The reviewed guidance is now aligned with current Istio 1.30 ambient documentation. The local environment did not have `kubectl` installed, so kubectl syntax was verified against official Kubernetes/Istio documentation rather than local `--help` output.
