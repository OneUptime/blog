# Validation Summary: How to Build a Talos Linux Home Lab Cluster

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1.6.0)
- Kubernetes (v1.29)
- talosctl
- kubectl / Helm
- Cilium (CNI)
- Flannel (CNI, default in Talos)
- MetalLB (bare-metal load balancer)
- local-path-provisioner (Rancher)
- Kubernetes Dashboard
- Wake-on-LAN

## Sources Consulted
- Talos Linux v1.6 docs — talosctl install: https://docs.siderolabs.com/talos/v1.6/getting-started/talosctl
- Talos Linux v1.6 docs — v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.6/reference/configuration/v1alpha1/config
- Talos Linux v1.6 docs — Raspberry Pi installation: https://docs.siderolabs.com/talos/v1.6/platform-specific-installations/single-board-computers/rpi_generic/
- Talos Linux v1.6 docs — talosctl CLI reference: https://docs.siderolabs.com/talos/v1.6/reference/cli/
- GitHub release assets for siderolabs/talos v1.6.0 (verified via `gh release view`)
- Cilium docs — kubeProxyReplacement: https://docs.cilium.io/en/stable/network/kubernetes/kubeproxy-free/
- MetalLB docs — IPAddressPool / L2Advertisement: https://metallb.universe.tf/configuration/

## Issues Found
No technical issues found.

The following items were verified and confirmed correct:
- The Talos release asset names `metal-amd64.iso` and `metal-arm64.raw.xz` exist in the v1.6.0 GitHub release.
- The talosctl install script (`curl -sL https://talos.dev/install | sh`) is an officially documented installation method.
- The `machine.install` fields (`disk`, `image`, `wipe`) and `machine.network.interfaces[]` fields (`interface`, `dhcp`, `addresses`, `routes`) match the v1alpha1 schema.
- `cluster.allowSchedulingOnControlPlanes: true` is a valid top-level cluster field in v1alpha1.
- `talosctl gen config`, `apply-config --insecure --nodes --file`, `bootstrap --nodes`, `health --wait-timeout`, and `kubeconfig` flag/argument shapes are correct.
- Cilium's `kubeProxyReplacement=true` is the correct boolean form (the old `strict`/`partial`/`disabled` strings were deprecated/removed in modern Cilium releases).
- MetalLB `apiVersion: metallb.io/v1beta1` for `IPAddressPool` and `L2Advertisement` is correct.
- The `metal-arm64.raw.xz` image is the documented default arm64 image used for Raspberry Pi 4 in Talos v1.6 (no separate `rpi_generic` filename in v1.6 release assets).

## Review Notes
- The Cilium snippet uses `k8sServiceHost=192.168.1.10` pointing at the single control plane node, which is appropriate for the single-CP home lab topology used in the post. For HA control planes this would need a VIP/LB address.
- Talos v1.6 is now an older release line (v1.7+ exists at the time of review). The instructions remain valid for v1.6.0 specifically; readers using newer Talos versions should bump the `installer` image tag and download URLs accordingly.
- `kubectl get nodes` example output shows node names `talos-w1`/`talos-w2` while the worker configs above only set a hostname on the control plane. In practice the worker hostnames would either come from DHCP/reverse-DNS or need a `network.hostname` field — this is illustrative output rather than a strict technical error.
