# Validation Summary: Automating Cilium BGP Route Policy Validation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Cilium BGP Control Plane
- cilium-dbg CLI
- Kubernetes
- Kubernetes CronJob
- Bash scripting
- kubectl

## Sources Consulted
- Cilium command reference for `cilium-dbg bgp route-policies`: https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_route-policies/
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium upgrade guide noting removal of the deprecated `CiliumBGPPeeringPolicy` BGPv1 control plane: https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes CronJob documentation: https://kubernetes.io/docs/concepts/workloads/controllers/cron-jobs/
- Kubernetes RBAC documentation for pod subresources such as `pods/exec`: https://kubernetes.io/docs/reference/access-authn-authz/rbac/

## Issues Found
- The introduction said Cilium advertises "pod and service CIDRs". Cilium BGP advertises Pod CIDR ranges and Service virtual IPs, so the wording was corrected.
- The prerequisites referenced `CiliumBGPPeeringPolicy`, which belongs to the deprecated BGPv1 API and has been removed in current Cilium versions. It was replaced with current BGP v2 resources such as `CiliumBGPClusterConfig` and `CiliumBGPPeerConfig`.
- The prerequisites listed `jq`, but none of the examples use JSON output or `jq`. The unused prerequisite and dangling empty bullet were removed.
- The verification section described "automation/parsing" even though the script only collects command output and counts success/failure. The comment was changed to "automation script".
- The troubleshooting guidance used the older `enable-bgp-control-plane` ConfigMap-style setting. Current Cilium documentation enables BGP with the `bgpControlPlane.enabled=true` Helm value, so the guidance was updated.
- The troubleshooting guidance checked `ciliumbgppeeringpolicies` and referred to route policy definition in `CiliumBGPPeeringPolicy`. Those references were updated to current BGP v2 resources and advertisement selection via `CiliumBGPPeerConfig` and `CiliumBGPAdvertisement`.

## Review Notes
The command syntax for `cilium-dbg bgp route-policies` is valid and supports optional `vrouter <asn>` plus output formats such as JSON and YAML. The Kubernetes CronJob uses the current `batch/v1` API and a valid `restartPolicy: OnFailure`. In a real cluster, the service account used by the CronJob must have permissions to list pods and create `pods/exec` requests in the Cilium namespace.
