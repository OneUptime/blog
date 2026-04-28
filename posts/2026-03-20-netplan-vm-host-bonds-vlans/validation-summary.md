# Validation Summary: How to Configure a VM Host with Bonds and VLANs Using Netplan

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Netplan (YAML-based network configuration tool for Ubuntu/Debian)
- systemd-networkd (renderer backend)
- Linux bonding driver (802.3ad / LACP)
- Linux 802.1Q VLAN tagging
- Linux bridge (br-mgmt, br-vm)
- KVM / QEMU / libvirt (VM bridge attachment)
- iproute2 (`ip`, `bridge` commands)

## Sources Consulted
- Netplan reference documentation: https://netplan.io/reference/
- Netplan examples: https://netplan.io/examples/
- Linux kernel bonding documentation: https://www.kernel.org/doc/Documentation/networking/bonding.txt
- IEEE 802.3ad / 802.1Q standards (LACP / VLAN tagging)
- QEMU networking documentation (bridge backend `-netdev bridge`)
- iproute2 manual pages (`ip-link(8)`, `bridge(8)`)

## Issues Found
No technical issues found.

The Netplan YAML schema is correctly used:
- `network.version: 2` and `renderer: networkd` are valid top-level fields.
- `bonds.<name>.parameters` correctly nests `mode`, `lacp-rate`, and `mii-monitor-interval`. `802.3ad` is the right mode string for LACP, and `fast` is a valid `lacp-rate`.
- `dhcp4` and `mtu` are correctly placed as direct properties of the bond (not nested inside `parameters`).
- `vlans.<name>` uses `id` and `link` keys correctly.
- `bridges.<name>.parameters` accepts `stp` (boolean) and `forward-delay` (integer); both are documented Netplan keys.
- `addresses`, `routes` (with `to:` and `via:`), and `nameservers.addresses` follow current Netplan v2 syntax.

Verification commands are correct:
- `cat /proc/net/bonding/bond0` is the standard kernel-exposed path for bond status.
- `ip link show type vlan` and `bridge link show` are valid iproute2 invocations.

The QEMU snippet `-netdev bridge,id=net0,br=br-vm` is the correct form for the bridge network backend (assumes `qemu-bridge-helper` is permitted via `/etc/qemu/bridge.conf`).

## Review Notes
- Setting `mtu: 9000` on the bond is fine, but VLAN sub-interfaces and bridges do not automatically inherit the parent MTU in all configurations — readers running jumbo frames end-to-end may want to set `mtu: 9000` on `bond0.100`, `bond0.200`, `br-mgmt`, and `br-vm` as well, and ensure the upstream switch port supports jumbo frames. This is an enhancement, not an error.
- Disabling STP (`stp: false`) on a host bridge is a reasonable choice when the host has a single uplink path (the bond), as documented in the post.
- The QEMU example shows only the `-netdev` portion; a complete VM invocation would also include a matching `-device virtio-net-pci,netdev=net0` (or similar). The author's framing as an "Example" snippet makes this acceptable.
- For libvirt users, the typical workflow is to define a host bridge network (`virsh net-define`) or attach directly via `<interface type='bridge'><source bridge='br-vm'/></interface>` in the domain XML — outside the post's scope but worth noting for completeness.
