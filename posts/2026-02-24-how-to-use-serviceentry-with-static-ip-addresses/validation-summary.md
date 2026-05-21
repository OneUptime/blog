# Validation Summary: How to Use ServiceEntry with Static IP Addresses

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Istio ServiceEntry
- Istio DestinationRule
- Istio VirtualService
- Envoy sidecar proxy configuration
- Kubernetes custom resources
- istioctl and kubectl commands

## Sources Consulted
- Istio ServiceEntry reference: https://istio.io/latest/docs/reference/config/networking/service-entry/
- Istio WorkloadEntry reference: https://istio.io/latest/docs/reference/config/networking/workload-entry/
- Istio DestinationRule reference: https://istio.io/latest/docs/reference/config/networking/destination-rule/
- Istio locality load balancing tasks: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/
- Istio locality failover task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/failover/
- Istio locality weighted distribution task: https://istio.io/latest/docs/tasks/traffic-management/locality-load-balancing/distribute/
- Istio istioctl command reference: https://istio.io/latest/docs/reference/commands/istioctl/
- Kubernetes kubectl command reference: https://kubernetes.io/docs/reference/kubectl/

## Issues Found
- The post said the `hosts` value can be anything and does not need DNS resolution. Istio's `resolution` field controls Envoy's upstream resolution only; applications may still need DNS, DNS capture, or proxy configuration to connect to a captured address. Updated the explanation to include that caveat.
- The locality-aware load balancing example said to enable locality load balancing but only configured outlier detection. Added `trafficPolicy.loadBalancer.localityLbSetting.enabled: true` and clarified that outlier detection is used to identify unhealthy endpoints for failover.
- The static failover example described priority levels but did not configure failover priority, so the `tier` labels would not prefer primary over backup. Added `localityLbSetting.failoverPriority` using `tier=primary`.
- The cluster inspection command passed a full outbound cluster name to `--fqdn`. Istio documents `--fqdn` as filtering by service FQDN substring. Updated the command to use `--fqdn api.legacy-system.internal --direction outbound`.
- The pitfall about missing endpoints did not mention `workloadSelector`, which is the documented alternative for internal workloads. Updated the wording while preserving the post's focus on static endpoints.

## Review Notes
The examples use the current stable `networking.istio.io/v1` APIs. `istioctl` was not installed locally, so command validation was performed against the official Istio command reference rather than local `--help` output.
