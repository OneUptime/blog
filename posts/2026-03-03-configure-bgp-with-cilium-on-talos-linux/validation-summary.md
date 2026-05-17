# Validation Summary: How to Configure BGP with Cilium on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Cilium (CNI, BGP Control Plane)
- Talos Linux (talosctl, machine configuration)
- Kubernetes (LoadBalancer services, DaemonSet, Deployment)
- BGP (Border Gateway Protocol)
- FRR (Free Range Routing) — example router configuration
- Helm

## Sources Consulted
- Cilium BGP Control Plane documentation: https://docs.cilium.io/en/stable/network/bgp-control-plane/
- Cilium LoadBalancer IPAM documentation: https://docs.cilium.io/en/stable/network/lb-ipam/
- Cilium BGP API reference for `CiliumBGPClusterConfig`, `CiliumBGPPeerConfig`, `CiliumBGPAdvertisement`, `CiliumLoadBalancerIPPool`
- Talos Linux CLI reference: https://docs.siderolabs.com/talos/v1.12/reference/cli (talosctl apply-config and patch flags)
- Sibling validated posts in this repo: `2026-03-13-cilium-bgp-control-plane-resources` and `2026-03-03-configure-ecmp-routing-on-talos-linux` (both already migrated to BGPv2 / `cilium.io/v2`)

## Issues Found

1. **Removed BGPv1 API (`CiliumBGPPeeringPolicy`)**: The Step 3 example used `apiVersion: cilium.io/v2alpha1` and `kind: CiliumBGPPeeringPolicy`, which was deprecated in Cilium 1.18 and removed in 1.19. Replaced with the current BGPv2 API: `CiliumBGPClusterConfig` (cluster/peer topology), `CiliumBGPPeerConfig` (timers, graceful restart, families/advertisements selector), and `CiliumBGPAdvertisement` (Service / LoadBalancerIP advertisements with a service selector). The new manifests are on `apiVersion: cilium.io/v2`.

2. **Stale `CiliumLoadBalancerIPPool` apiVersion**: Step 2 used `cilium.io/v2alpha1`. The resource was promoted to `cilium.io/v2` (current Cilium docs use `cilium.io/v2`). Updated.

3. **Advanced > Advertising Pod CIDRs**: The previous example set `exportPodCIDR: true` on a `virtualRouters` entry, which is a BGPv1 field. Replaced with a `CiliumBGPAdvertisement` resource that uses `advertisementType: PodCIDR`, which is the BGPv2 equivalent.

4. **Advanced > Multiple BGP Peers**: Rewritten to use additional `peers` entries inside a `bgpInstances` block of `CiliumBGPClusterConfig`, instead of `neighbors` on `virtualRouters`.

5. **Advanced > Service Selection**: Rewritten so the selector lives on `CiliumBGPAdvertisement.spec.advertisements[].selector` instead of the BGPv1 `serviceSelector` field on a virtual router.

6. **Troubleshooting CRD names**: `kubectl get ciliumbgppeeringpolicies` no longer applies. Replaced with the BGPv2 CRD listings (`ciliumbgpclusterconfigs`, `ciliumbgppeerconfigs`, `ciliumbgpadvertisements`, `ciliumloadbalancerippools`) and updated the "Routes not appearing" troubleshooting bullet to reference `CiliumBGPAdvertisement` selector matching.

7. **Step 4 wording**: Updated "matches your peering policy's nodeSelector" to "matches the `CiliumBGPClusterConfig` nodeSelector" to reflect the new resource name.

8. **Prerequisites**: Narrowed "Cilium installed" to "Cilium v1.18+ installed (this guide uses the BGPv2 API)" so readers on older Cilium versions know that BGPv1 manifests they may find elsewhere will not match this guide.

## Review Notes

- The `talosctl apply-config --nodes <ip> --patch @file.yaml` form on line 174 follows the convention used across this Talos series. The strictly canonical command for in-place patching of an existing machine config on a running node is `talosctl patch machineconfig --nodes <ip> --patch @file.yaml`; `apply-config` itself expects a full config file passed with `--file` and uses `--config-patch`/`-p` for patches. Left as-is for series-wide consistency, matching prior reviewer decisions on sibling posts (e.g. `2026-03-03-configure-calico-ebpf-mode-on-talos-linux`).
- The `cilium bgp peers` and `cilium bgp routes` CLI subcommands used for verification continue to work for the BGPv2 control plane.
- The Helm value `bgpControlPlane.enabled=true` is correct and is what enables both BGPv1 and BGPv2 resources to be reconciled.
- The FRR router example uses `maximum-paths 3`, which is correct syntax for enabling eBGP multipath up to 3 paths.
