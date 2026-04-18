# Validation Summary: How to Add a VLAN to a Bonded Interface

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux networking (iproute2 `ip` command)
- Linux bonding driver (active-backup mode)
- 802.1Q VLAN tagging (`8021q` kernel module)
- Netplan (with `networkd` renderer)
- `/proc/net/bonding/` interface

## Sources Consulted
- Linux Kernel Bonding Driver HOWTO — https://www.kernel.org/doc/html/latest/networking/bonding.html
- iproute2 `ip-link(8)` man page (bond and vlan link types)
- Netplan YAML configuration reference — https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Red Hat "Configure VLAN over a Bond" documentation — https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/7/html/networking_guide/sec-vlan_on_bond_and_bridge_using_ip_commands
- IEEE 802.1Q standard (VLAN tagging behavior)

## Issues Found
No technical issues found.

Commands and configuration were all verified:
- `modprobe bonding` / `modprobe 8021q` — correct module names.
- `ip link add bond0 type bond mode active-backup` — valid iproute2 single-command bond creation.
- `ip link set ethX master bond0` — correct enslavement syntax.
- `ip link add link bond0 name bond0.10 type vlan id 10` — correct VLAN subinterface syntax.
- Netplan keys (`bonds`, `vlans`, `mode: active-backup`, `mii-monitor-interval`, `link`, `id`) are all valid Netplan schema names.
- Failover claim is accurate: VLAN subinterfaces attach to `bond0` (a stable logical device), so the bond's internal slave failover does not tear down the VLAN netdevs.

## Review Notes
- The `mii-monitor-interval: 100` value (milliseconds) is a reasonable default. Some deployments prefer `arp-ip-targets` based monitoring for environments where link-layer up/down doesn't reflect true reachability; that is out of scope for this post.
- The kernel/iproute2 `master`/`slave` terminology is being phased toward `controller`/`port` in some tooling, but `ip link set ... master ...` remains the supported and widely used syntax and is correct as written.
- For LACP (802.3ad) setups, switch-side port-channel configuration and matching `xmit_hash_policy` would be needed; the post intentionally sticks with active-backup which does not require switch configuration.
- Netplan's `bonds:` block also accepts other parameters (e.g., `lacp-rate`, `transmit-hash-policy`, `min-links`) that are not shown here; the minimal example is fine for the scope of the tutorial.
