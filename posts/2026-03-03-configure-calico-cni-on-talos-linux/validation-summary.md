# Validation Summary: How to Configure Calico CNI on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step Guide

## Technologies Covered
- Talos Linux (machine configuration, `talosctl`)
- Calico CNI (v3.27.0)
- Tigera Operator (`operator.tigera.io/v1` Installation CRD)
- Calico project CRDs (`crd.projectcalico.org/v1`: IPPool, BGPPeer, BGPConfiguration, GlobalNetworkPolicy)
- Kubernetes NetworkPolicy (`networking.k8s.io/v1`)
- BGP peering, VXLAN / IP-in-IP encapsulation
- Calico Typha and Felix
- `calicoctl`

## Sources Consulted
- Calico v3.27 IPPool reference: https://archive-os-3-27.netlify.app/calico/3.27/reference/resources/ippool
- Calico v3.27 BGPConfiguration reference: https://archive-os-3-27.netlify.app/calico/3.27/reference/resources/bgpconfig
- Tigera Operator Installation API reference (encapsulation/natOutgoing values): https://docs.tigera.io/calico/latest/reference/installation/api
- Calico v3.27.0 manifests on GitHub (tigera-operator.yaml, calicoctl.yaml): https://raw.githubusercontent.com/projectcalico/calico/v3.27.0/manifests/
- Talos Linux machine configuration reference (cluster.network.cni)

## Issues Found
1. **Step 5 (Configure Calico IPAM) — invalid `encapsulation` field on IPPool CRD.** The example `IPPool` (apiVersion `crd.projectcalico.org/v1`) included an `encapsulation: VXLANCrossSubnet` field. That field does not exist on the Calico IPPool CRD — the IPPool resource uses the separate `ipipMode` and `vxlanMode` fields (both already present in the example). The `encapsulation` enum (`VXLAN`, `VXLANCrossSubnet`, `IPIP`, `IPIPCrossSubnet`, `None`) is only valid on the operator's `Installation` resource (`operator.tigera.io/v1`), where it is a higher-level abstraction. The redundant/invalid line was removed; the existing `vxlanMode: CrossSubnet` plus `ipipMode: Never` correctly express the intended encapsulation. The inline comment was also updated to clarify this.

## Review Notes
- **Version note (non-blocking):** Calico v3.27.0 is pinned in install URLs. As of the validation date (2026-05-17), this is an older release (originally late 2023). The post still works as written against v3.27.0, but readers may want to substitute a newer version tag in the manifest URLs. Pinning to a specific version is the right pattern, so no edit was made.
- **`natOutgoing` value forms are correctly differentiated in the post:** the operator `Installation` example uses the string enum `Enabled`, and the IPPool CRD example uses the boolean `true`. This matches the two distinct APIs (operator vs. Calico project CRD) — verified against the docs.
- **Flannel description is slightly broad but defensible:** the post says Flannel is "limited to VXLAN encapsulation". Flannel as a project supports several backends (host-gw, WireGuard, IPIP, UDP), but the version Talos ships and configures by default is the VXLAN backend, so in the context of "default Talos CNI" the statement is reasonable. Left as-is.
- **`calico-node -felix-live` liveness command** in the troubleshooting section uses the supported single-dash flag form accepted by `calico-node`; verified against the calico-node liveness probe usage.
- **BGPConfiguration `serviceClusterIPs` structure** (list of `cidr:` entries) is correct and matches the Calico reference.
- **Talos `cluster.network.cni.name: none`** is the documented way to disable the bundled Flannel; the example structure (`podSubnets`, `serviceSubnets`) matches the Talos cluster network schema.
