# Validation Summary: Using Cilium Debug BGP Peers Command

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Cilium BGP Control Plane
- Kubernetes
- kubectl
- BGP
- YAML

## Sources Consulted
- Cilium command reference: `cilium-dbg bgp peers` - https://docs.cilium.io/en/stable/cmdref/cilium-dbg_bgp_peers/
- Cilium BGP Control Plane documentation - https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane resources - https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane operation guide - https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium 1.19 upgrade guide - https://docs.cilium.io/en/stable/operations/upgrade/
- Kubernetes `kubectl exec` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_exec/
- Kubernetes `kubectl get` reference - https://kubernetes.io/docs/reference/kubectl/generated/kubectl_get/

## Issues Found
- The post described Cilium as advertising "service CIDRs"; Cilium BGP advertises pod CIDRs and Service VIPs. Updated the wording.
- The post said `cilium-dbg bgp peers` shows timers and message counters. Official command and operation documentation describe peer state, uptime, address family, and received/advertised route counts. Updated the description.
- The prerequisites and configuration example used the removed `CiliumBGPPeeringPolicy` BGPv1 API. Replaced it with current `cilium.io/v2` resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The troubleshooting section referenced `enable-bgp-control-plane` in `cilium-config`. Current documentation enables BGP control plane with the Helm value `bgpControlPlane.enabled=true`; updated the troubleshooting note.
- The empty-output troubleshooting command checked the removed `ciliumbgppeeringpolicies` resource. Updated it to check current BGP control plane resources.
- Removed two empty prerequisite bullets.

## Review Notes
The post focuses on `cilium-dbg` inside Cilium agent pods. Current Cilium documentation also recommends the cluster-level `cilium bgp peers` command for inspecting BGP state across nodes when the Cilium CLI is available.
