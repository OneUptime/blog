# Validation Summary: How to Set Up Cluster Peering with Talos Linux

## Status
validated

## Post Type
Tutorial / Hands-on guide

## Technologies Covered
- Talos Linux (machine configuration, WireGuard interface support, sysctls, KubeSpan)
- Kubernetes (multi-cluster networking, pod/service CIDRs)
- Cilium / Cilium ClusterMesh (install CLI, global services, ClusterMesh APIserver)
- WireGuard (peer config, allowedIPs, persistent keepalive)
- Submariner (subctl CLI, broker, Lighthouse service discovery, IPsec NAT-T)
- talosctl (apply-config, get links)
- kubectl (deployment/service basics, context switching)

## Sources Consulted
- Talos Linux v1alpha1 config reference: https://docs.siderolabs.com/talos/v1.9/reference/configuration/v1alpha1/config/ (WireGuard peer schema, sysctls field, kubespan)
- Cilium CLI install reference: https://docs.cilium.io/en/latest/cmdref/cilium_install/ (verified `--set` flag)
- Cilium ClusterMesh services docs: https://docs.cilium.io/en/stable/network/clustermesh/services/ (`service.cilium.io/global` annotation)
- Cilium ClusterMesh setup: https://docs.cilium.io/en/stable/network/clustermesh/clustermesh/ (`cilium clustermesh enable/connect/status` flags)
- Submariner subctl reference: https://submariner.io/operations/deployment/subctl/ (`--clusterid` flag)
- Submariner NAT traversal docs: https://submariner.io/operations/nat-traversal/ (`--natt=false` flag)

## Issues Found
1. **WireGuard peer keepalive field name (two instances)** — The post used `persistentKeepalive: 25` in both Cluster A and Cluster B WireGuard configurations. The Talos `v1alpha1` machine config schema names this field `persistentKeepaliveInterval` and expects a Go duration string (e.g., `25s`), not a bare integer. The wrong key would either be rejected by Talos config validation or silently ignored, leaving tunnels without keepalives. Fixed both blocks to `persistentKeepaliveInterval: 25s`.

2. **`net.ipv4.ip_forward` placed under `machine.install.extraKernelArgs`** — IP forwarding is a runtime kernel parameter (sysctl), not a kernel command-line option. Passing `net.ipv4.ip_forward=1` to `extraKernelArgs` adds it to the kernel cmdline where it has no effect. The correct Talos mechanism is `machine.sysctls`, which takes a string-valued map. Rewrote the snippet to use `machine.sysctls: { net.ipv4.ip_forward: "1" }`.

## Review Notes
- The Cilium CLI `--set` flag was double-checked and is correct — the cilium-cli `install` subcommand exposes `--set` (stringArray) for passing Helm values; it does NOT have `--helm-set`.
- The `subctl join` flags `--clusterid` (one word) and `--natt=false` are both valid in current Submariner releases.
- The "Required ports" comment block for Submariner labels UDP/4490 as "Submariner tunnel" — the more precise name in Submariner docs is "NAT-T discovery port", but this is a comment in a YAML block and not a configuration error, so it was left as-is.
- Similarly, Cilium ClusterMesh port 4244 is more accurately the "Hubble peer service" (Hubble relay listens on 4245), but this is a non-blocking labeling nit in a comment.
- The `cilium clustermesh status --wait` flag, `cilium clustermesh connect --destination-context`, and the `service.cilium.io/global="true"` annotation were all verified against current Cilium documentation.
- Pod/service CIDR examples (10.0.0.0/16 vs 10.1.0.0/16, 10.96.0.0/16 vs 10.97.0.0/16) are non-overlapping as required by the prerequisite, internally consistent across the three options, and reused correctly in the WireGuard `allowedIPs` lists.
- Talos `machine.network.kubespan.enabled` is the correct field path for disabling KubeSpan.
