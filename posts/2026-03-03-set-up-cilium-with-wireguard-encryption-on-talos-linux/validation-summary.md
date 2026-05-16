# Validation Summary: How to Set Up Cilium with WireGuard Encryption on Talos Linux

## Status
validated

## Post Type
Tutorial / Step-by-step guide

## Technologies Covered
- Talos Linux
- Cilium (CNI)
- WireGuard (VPN / transparent encryption)
- Helm
- Kubernetes (kubectl, DaemonSets)
- Hubble (Cilium observability)
- eBPF
- KubePrism (Talos Kubernetes API endpoint)

## Sources Consulted
- Cilium WireGuard Encryption docs: https://docs.cilium.io/en/stable/security/network/encryption-wireguard/
- Cilium CLI command reference (encryption): https://docs.cilium.io/en/latest/cmdref/cilium_encryption/
- Sidero / Talos: Deploying Cilium: https://docs.siderolabs.com/kubernetes-guides/cni/deploying-cilium
- Talos v1alpha1 configuration reference: https://docs.siderolabs.com/talos/v1.8/reference/configuration/v1alpha1/config/
- wg(8) man page: https://www.man7.org/linux/man-pages/man8/wg.8.html
- Linux 5.6 release notes (WireGuard merge): https://9to5linux.com/linux-kernel-5-6-officially-released-new-features

## Issues Found
No technical issues found. All commands, Helm values, ports, kernel module references, and Talos-specific configuration were verified against official documentation:

- WireGuard UDP port `51871` (Cilium-specific, not the standard 51820) is correct.
- Helm values `encryption.enabled=true`, `encryption.type=wireguard`, and `encryption.nodeEncryption=true` are the current correct keys.
- Interface name `cilium_wg0` is correct.
- Talos KubePrism settings (`k8sServiceHost=localhost`, `k8sServicePort=7445`) match Sidero's official Cilium installation guide.
- Talos `machine.sysctls` is the correct path in the v1alpha1 config schema (string-keyed map of string values, format used in the YAML snippet is valid).
- `wg show <iface> latest-handshakes` is a valid wg(8) subcommand.
- WireGuard merged into the Linux kernel mainline in version 5.6 (March 2020).
- Security context capability lists for Cilium on Talos match Sidero's documented Helm overrides.

## Review Notes
- In recent Cilium releases (1.16+), the in-agent binary was renamed to `cilium-dbg`, but a `cilium` shim is still present for backward compatibility, so the `kubectl exec ... cilium ...` invocations in the post continue to work. If future Cilium versions remove the shim entirely, these commands would need to be updated to `cilium-dbg`.
- The host-side `cilium` CLI uses `cilium encryption status` (note: `encryption`), while the in-agent form is `cilium encrypt status`. The post consistently uses the in-agent form via `kubectl exec`, which is correct in context.
- The 5–15% throughput overhead figure for WireGuard is a reasonable order-of-magnitude estimate; real numbers vary significantly by NIC, MTU, and workload.
- The post does not pin a Cilium version. Helm flag names have been stable for the WireGuard-related options across recent Cilium releases, but readers should still consult the Cilium docs for their specific version.
