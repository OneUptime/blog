# Validation Summary: How to Set Per-Route Timeouts in Istio VirtualService

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Istio VirtualService
- Istio traffic management
- Kubernetes custom resources
- kubectl
- istioctl
- jq

## Sources Consulted
- Istio VirtualService reference: https://istio.io/latest/docs/reference/config/networking/virtual-service/
- Istio request timeouts task: https://istio.io/latest/docs/tasks/traffic-management/request-timeouts/
- Istio v1 APIs announcement: https://istio.io/latest/blog/2024/v1-apis/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl patch reference: https://kubernetes.io/docs/reference/kubectl/generated/kubectl_patch/

## Issues Found
- Updated full VirtualService manifests from `networking.istio.io/v1beta1` to the stable `networking.istio.io/v1` API version. Istio still supports `v1beta1`, but current Istio documentation encourages new YAML to use `v1`.
- Added a note that subsets referenced in a VirtualService destination must be defined in a corresponding DestinationRule.
- Corrected the timeout verification example. The original example enabled fault injection on the same HTTP route and expected the route timeout to fire, but Istio documents that timeouts and retries are not enabled when client-side faults are enabled on that route.
- Changed the `istioctl proxy-config routes` target from `deploy/frontend` to `deployment/frontend`, matching the resource type form shown in the Istio command reference, and adjusted the `jq` projection so it works for exact, prefix, and regex route matches.

## Review Notes
The examples use short service hostnames, which are valid but resolved relative to the VirtualService namespace. Istio recommends fully qualified domain names to avoid namespace-related misconfiguration in production.
