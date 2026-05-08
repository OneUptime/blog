# Validation Summary: Fixing Native Routing Performance in Cilium

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Cilium
- Kubernetes
- Helm
- eBPF host routing
- Native routing
- Cilium BGP Control Plane
- BGP

## Sources Consulted
- Cilium Routing documentation: https://docs.cilium.io/en/stable/network/concepts/routing/
- Cilium Helm values reference: https://docs.cilium.io/en/stable/helm-values/
- Cilium Performance Tuning Guide: https://docs.cilium.io/en/stable/operations/performance/tuning/
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane/
- Cilium BGP Control Plane Resources documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/bgp-control-plane-configuration/
- Cilium System Requirements: https://docs.cilium.io/en/stable/operations/system_requirements/
- Cilium command reference for cilium-dbg monitor and endpoint commands: https://docs.cilium.io/en/stable/cmdref/

## Issues Found
- The native routing Helm example used `--set tunnel=disabled`, which is no longer a current Helm value in the Cilium Helm reference. Removed it and kept `routingMode=native`, which is the current documented setting.
- The BGP example used the legacy `CiliumBGPPeeringPolicy` v2alpha1 API. Replaced it with current `cilium.io/v2` resources: `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, and `CiliumBGPAdvertisement`.
- The BGP Helm command enabled the control plane without preserving existing values. Added `--reuse-values` to avoid accidentally resetting unrelated Cilium configuration during an upgrade.
- The BGP section implied Cilium BGP should be used directly for missing node routes. Clarified that the Cilium BGP Control Plane advertises PodCIDRs to upstream routers.
- The validation checklist used `cilium monitor` and `cilium endpoint list` as if they were Cilium CLI commands. Updated these local-agent diagnostics to run `cilium-dbg monitor` and `cilium-dbg endpoint list` inside a Cilium agent pod.

## Review Notes
- `autoDirectNodeRoutes=true` is valid only when nodes share L2 connectivity; the post correctly directs users to BGP or other routing when that is not true.
- eBPF host routing requirements are consistent with the Cilium tuning guide: eBPF kube-proxy replacement and eBPF masquerading are required, and Cilium recommends Linux kernel 5.10 or later for current releases.
- The performance claim of 90%+ of bare-metal throughput is environment-dependent but plausible as a general target; it should be validated with benchmarks in each cluster.
