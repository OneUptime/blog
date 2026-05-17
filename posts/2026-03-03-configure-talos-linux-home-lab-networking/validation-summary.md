# Validation Summary: How to Configure Talos Linux Home Lab Networking

## Status
validated

## Post Type
Tutorial / Practical guide

## Technologies Covered
- Talos Linux (machine configuration: interfaces, VLANs, WireGuard, sysctls, nameservers)
- talosctl CLI (get links, get addresses, get routes, get resolvers)
- Kubernetes (NetworkPolicy, CoreDNS, Services)
- Multus CNI (NetworkAttachmentDefinition with macvlan plugin)
- MetalLB (IPAddressPool, L2Advertisement, Layer 2 mode)
- ExternalDNS (Pi-hole provider via Helm)
- WireGuard VPN
- Linux kernel sysctls (TCP BBR, conntrack, socket buffers)

## Sources Consulted
- Talos Linux talosctl CLI reference: https://www.talos.dev/latest/reference/cli/
- Talos networking docs (interfaces, VLANs): https://www.talos.dev/latest/reference/configuration/v1alpha1/config/
- Talos WireGuard guide: https://www.talos.dev/latest/talos-guides/network/wireguard-network/
- Talos resolvers / ResolverStatus resource: https://docs.siderolabs.com/talos/v1.12/networking/configuration/resolvers
- MetalLB configuration docs (v1beta1 API): https://metallb.universe.tf/configuration/
- Multus CNI NetworkAttachmentDefinition CRD: https://github.com/k8snetworkplumbingwg/multus-cni
- Kubernetes NetworkPolicy reference (networking.k8s.io/v1): https://kubernetes.io/docs/concepts/services-networking/network-policies/
- Kubernetes custom CoreDNS guide: https://kubernetes.io/docs/tasks/administer-cluster/dns-custom-nameservers/
- k3s coredns-custom pattern reference (for cross-check): https://github.com/k3s-io/k3s/blob/main/manifests/coredns.yaml

## Issues Found

1. **`talosctl ping` does not exist.** The troubleshooting section used `talosctl ping 192.168.1.1 --nodes 192.168.1.10`, but no `ping` subcommand exists in any released version of talosctl (confirmed against the official CLI reference; there is an open feature request, siderolabs/talos #10983, to add it). The bogus command was removed from the troubleshooting block — the remaining `talosctl get` commands and `kubectl` checks are all valid.

2. **`coredns-custom` ConfigMap is k3s-specific, not vanilla.** The Option 3 example created a ConfigMap named `coredns-custom` with `*.server` keys. That auto-loading pattern only works in distributions whose default Corefile contains an `import /etc/coredns/custom/*.server` directive (k3s, Rancher, and AKS). The upstream CoreDNS manifest used by Talos does not mount or import this ConfigMap, so the example would silently do nothing. Replaced the example with the vanilla approach: editing the existing `coredns` ConfigMap in `kube-system` to add a `home.lab:53` server block to the Corefile, followed by `kubectl rollout restart deployment coredns`.

## Review Notes
- VLAN configuration (`interfaces[].vlans[]` with `vlanId`, `addresses`, `routes`) matches the `DeviceVlan` schema. `dhcp: false` on the parent trunk interface is the default and technically unnecessary, but harmless and explicit.
- WireGuard configuration is correct. Interface-level `addresses` (e.g., `10.200.0.1/24`) and `wireguard:` block with `privateKey`, `listenPort`, and `peers[]` match `DeviceWireguardConfig`. MTU of 1420 is the standard WireGuard recommendation for a 1500-byte underlying link.
- MetalLB CRDs (`IPAddressPool`, `L2Advertisement`) are both `metallb.io/v1beta1` — correct for current MetalLB releases.
- Multus example uses `cniVersion: "0.3.1"` which still works; newer deployments often use `1.0.0`, but no change is needed.
- The post correctly notes that Multus requires a Talos system extension; users will need to include `siderolabs/multus-cni` in their factory image.
- TCP BBR sysctls (`net.core.default_qdisc=fq` + `net.ipv4.tcp_congestion_control=bbr`) are correctly paired.
