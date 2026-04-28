# Validation Summary: How to Create a Network Bridge on RHEL Using nmcli

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- nmcli (NetworkManager CLI)
- NetworkManager
- Red Hat Enterprise Linux (RHEL)
- Linux Bridge (kernel bridging)
- Spanning Tree Protocol (STP)
- iproute2 (`ip`, `bridge` commands)
- KVM virtualization (use case context)

## Sources Consulted
- nmcli(1) man page (NetworkManager 1.46.0)
- `nmcli connection add help` output (verified `bridge` and `bridge-slave` type options)
- nm-settings-nmcli(5) man page (verified `bridge.*` property names)
- `bridge fdb help` output from iproute2 (verified `bridge fdb show br BRDEV` syntax)
- Red Hat documentation on configuring a network bridge with nmcli (RHEL 8/9 networking guides)
- IEEE 802.1D standard for STP forwarding delay timing

## Issues Found
No technical issues found.

All commands, options, and properties were verified against the local nmcli and iproute2 installations and official documentation:

- `nmcli connection add type bridge ...` with `con-name` and `ifname` — correct.
- `nmcli connection modify` with `ipv4.method`, `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns` — all valid property names.
- `nmcli connection add type bridge-slave ... master br0` — `bridge-slave` is still a valid type in NetworkManager 1.46 (alongside the newer `slave-type bridge` form); the older terminology continues to work for backward compatibility.
- `bridge.stp no` — correct nmcli property name.
- `bridge link show`, `bridge fdb show br br0`, `ip addr show br0` — correct iproute2 syntax.
- The 30-second STP forwarding delay claim is accurate (15s Listening + 15s Learning per the IEEE 802.1D defaults).

## Review Notes
- NetworkManager 1.46+ introduced new "port/controller" terminology to replace "slave/master" (e.g., `nmcli connection add type ethernet ifname eth0 master br0 slave-type bridge`). The post uses the older `bridge-slave` shorthand, which remains fully supported. A future revision could mention the newer terminology, but this is not a correctness issue.
- The activation order in Step 3 brings up the slave (`br0-slave-eth0`) before the bridge (`br0`). This works because activating a slave automatically activates its master in NetworkManager; bringing up `br0` afterwards is effectively a no-op. Some Red Hat tutorials recommend the reverse order for clarity, but the post's order is functionally correct.
- The post focuses on a single physical interface attached to a bridge, which is the typical KVM hypervisor setup. Multi-interface or bonded-slave bridge scenarios are out of scope, which is appropriate for a focused guide.
