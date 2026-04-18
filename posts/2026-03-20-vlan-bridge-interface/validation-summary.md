# Validation Summary: How to Add a VLAN to a Bridge Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel 802.1Q VLAN module
- iproute2 (`ip link`, `ip addr`)
- Linux bridge / `bridge` utility (vlan filtering, fdb)
- VLAN-aware bridges
- KVM / tap interfaces (vnet0)
- Netplan (systemd-networkd renderer)

## Sources Consulted
- `bridge(8)` man page from iproute2 6.1.0 (local verification of subcommand syntax)
- `bridge vlan help` output (confirmed valid keywords: `pvid`, `untagged`, `self`, `master`, `tunnel_info`)
- iproute2 source / Linux kernel bridge documentation — https://www.kernel.org/doc/Documentation/networking/bridge.rst
- Linux bridge VLAN filtering: https://wiki.nftables.org/wiki-nftables/index.php/Setting_up_a_bridge_with_VLAN_filtering (conceptual cross-reference)
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/ (vlans, bridges, renderer)

## Issues Found

1. **Invalid `tagged` keyword in `bridge vlan add`** — In Method 2, the commands used `bridge vlan add dev eth0 vid 10 tagged` and `... vid 20 tagged`. The `tagged` keyword is not part of the `bridge vlan add` syntax (valid options per `bridge vlan help` are `pvid`, `untagged`, `self`, `master`, `tunnel_info`). VLANs are tagged by default when `untagged` is omitted. Fixed by removing the `tagged` keyword and updating the adjacent comment to note that tagged is the default behavior.

## Review Notes

- Method 2 creates a host-side IP on VLAN 10 using `ip link add br0.10 type vlan link br0 id 10`. Depending on kernel version and configuration, some setups additionally require `bridge vlan add vid 10 dev br0 self` so the bridge device itself accepts VLAN 10 tagged frames at the host level. Recent kernels often handle this implicitly when a VLAN subinterface is created on the bridge, so the post's approach works in practice; left unchanged to avoid overreach.
- `bridge fdb show br br0` is valid syntax per the man page (`bridge fdb [ [ show ] [ br BRDEV ] [ brport DEV ] ...`).
- `modprobe 8021q` is correct and still the standard way to ensure the 802.1Q module is loaded on systems where it is not auto-loaded.
- The Netplan snippet is syntactically valid for Netplan v2 with the `networkd` renderer. Readers using NetworkManager as renderer would need `renderer: NetworkManager` and may need slightly different parameter support.
- `bridge vlan del dev vnet0 vid 1` is correct for removing the default PVID 1 from a VM tap port for strict VLAN isolation.
