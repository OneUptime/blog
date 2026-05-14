# Validation Summary: Configuring Cilium BGP Control Plane

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Cilium BGP Control Plane
- Kubernetes
- Helm
- Cilium CLI
- BGP
- eBPF

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium BGP Control Plane Operation Guide: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-operation/
- Cilium CLI `bgp peers` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_peers/
- Cilium CLI `bgp routes` command reference: https://docs.cilium.io/en/latest/cmdref/cilium_bgp_routes/

## Issues Found
- The post used the legacy `CiliumBGPPeeringPolicy` `cilium.io/v2alpha1` resource. Current Cilium documentation uses `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement` with `apiVersion: cilium.io/v2`, so the description, explanatory text, YAML, architecture diagram, and conclusion were updated.
- The BGP peer settings were nested under the old `neighbors` fields (`eBGPMultihopTTL`, `connectRetryTimeSeconds`, `holdTimeSeconds`, and `keepAliveTimeSeconds`). These were moved to the current `CiliumBGPPeerConfig` shape using `ebgpMultihop` and `spec.timers`.
- Service and PodCIDR advertisements were configured with legacy `serviceSelector` and `exportPodCIDR` fields. These were replaced with `CiliumBGPAdvertisement` entries for `PodCIDR` and `Service` with `LoadBalancerIP`.
- The introduction implied that BGP control plane integration programs or extends the eBPF datapath. Cilium documentation states that the BGP Control Plane does not program the datapath, so the wording was corrected.
- The sample `cilium bgp peers` output used `Local ASN` and `Peer ASN`; this was adjusted to the documented `Local AS` and `Peer AS` column names.
- The prerequisite version was updated from Cilium v1.13+ to v1.19+ to match the current stable documentation reviewed.

## Review Notes
The PodCIDR advertisement example assumes an IPAM mode that supports PodCIDR advertisement. The post already enables `k8s.requireIPv4PodCIDR=true`, which is consistent with Kubernetes PodCIDR-based routing setups.
