# Validation Summary: How to Configure VIP on a VLAN Interface in Talos Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Talos Linux (v1alpha1 machine configuration)
- Kubernetes (control plane / API server)
- Virtual IP (VIP) for API server high availability
- VLANs (IEEE 802.1Q)
- Linux bonding (802.3ad / LACP)
- talosctl CLI (apply-config, get links, get addresses, get etcdmembers, service, pcap, kubeconfig, reboot, dmesg)
- Cisco IOS and Arista EOS trunk port configuration

## Sources Consulted
- [Talos v1alpha1 configuration reference](https://docs.siderolabs.com/talos/v1.7/reference/configuration/v1alpha1/config/) — confirmed VLAN schema (`interfaces[].vlans[]` with `vlanId`, `addresses`, `routes`, `vip`, `mtu`, `dhcp`)
- [Talos VIP networking guide](https://docs.siderolabs.com/talos/v1.7/networking/vip/) — confirmed VIP is supported on VLAN interfaces and the nested `vlans` syntax
- [siderolabs/talos pcap source](https://github.com/siderolabs/talos/blob/main/cmd/talosctl/cmd/talos/pcap.go) — confirmed `talosctl pcap` flags `--interface`, `--bpf-filter`, `--duration`, `-o/--output`
- Talos `etcdmembers` resource — confirmed `talosctl get etcdmembers` is valid

## Issues Found
1. **Incorrect VLAN schema in machine configuration (main example).** The post defined each VLAN as a separate top-level interface entry (e.g. `- interface: eth0.100` with a sibling `vlan: { vlanId: 100 }` field). The Talos v1alpha1 schema does not accept this shape — VLANs must be declared as a nested `vlans:` list under the parent physical interface, with each VLAN child holding its own `vlanId`, `addresses`, `routes`, and `vip`. Rewrote the main YAML block so `eth0` carries a `vlans:` list containing VLANs 100 (with VIP), 200, and 300. Without this fix the config would fail validation by `talosctl apply-config`.
2. **Same schema bug in the "Repeat this for each control plane node" snippet.** The per-node snippets reused the bogus `- interface: eth0.100` shape. Rewrote them as `vlanId: 100` list entries (which is what would appear inside `eth0.vlans`).
3. **Same schema bug in the bond + VLAN example.** The bond example placed VLANs as separate top-level entries (`- interface: bond0.100` …) with a `vlan:` field. Rewrote so `bond0` carries a nested `vlans:` list, matching the documented schema for VLANs on top of a bond.

## Review Notes
- The Linux sub-interface name (`eth0.100`, `bond0.100`) used in the verification, troubleshooting, and `talosctl pcap --interface eth0.100` commands is correct — Talos creates the kernel device with that name once the nested-VLAN config is applied, so those commands work as-is after the schema fix.
- `talosctl get links`, `talosctl get addresses`, `talosctl get etcdmembers`, `talosctl service etcd`, `talosctl dmesg`, `talosctl pcap`, `talosctl apply-config`, and `talosctl kubeconfig --force-context-name` are all valid commands with the flags shown.
- The switch trunk configuration snippets for Cisco IOS and Arista EOS are syntactically correct, and the caution about native VLAN matching is sound.
- The Layer-2 / ARP-based failover statement and the requirement that all VIP participants share a broadcast domain are accurate.
- The post does not pin a Talos version. Schema verification was done against v1.7, which matches the current stable structure; readers on much older releases should double-check, though the nested-VLAN form has been the documented shape for a long time.
