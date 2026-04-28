# Validation Summary: How to Configure Network Bonding on RHEL with nmcli

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Red Hat Enterprise Linux (RHEL 7, 8, 9)
- NetworkManager
- nmcli (NetworkManager command-line tool)
- Linux kernel bonding driver
- Bonding modes: active-backup, 802.3ad (LACP), balance-alb
- IPv4 configuration (static and DHCP)

## Sources Consulted
- Red Hat Enterprise Linux 9 — Configuring and Managing Networking, "Configuring network bonding" (https://access.redhat.com/documentation/en-us/red_hat_enterprise_linux/9/html/configuring_and_managing_networking/configuring-network-bonding_configuring-and-managing-networking)
- nm-settings-nmcli(5) man page — bond and ipv4 setting properties
- Linux kernel documentation: Documentation/networking/bonding.rst (modes, miimon, lacp_rate, xmit_hash_policy, primary)
- nmcli(1) man page — connection add/modify/up syntax

## Issues Found
No technical issues found.

All commands, property names, and option values were verified against official sources:
- `nmcli connection add type bond` with `con-name`, `ifname`, and `bond.options` is the documented syntax.
- `bond.options` accepts a comma-separated list of `key=value` pairs that map directly to the kernel bonding driver options.
- `master bond0` on `type ethernet` is sufficient for nmcli to infer the slave-type as bond.
- `mode=active-backup`, `mode=802.3ad`, `mode=balance-alb` are valid bonding modes.
- `lacp_rate=fast`, `xmit_hash_policy=layer3+4`, `miimon=100`, `primary=<iface>` are all valid kernel bonding parameters.
- `ipv4.addresses`, `ipv4.gateway`, `ipv4.dns`, and `ipv4.method` (manual/auto) are correct nmcli properties.
- `/proc/net/bonding/bond0` is the correct kernel-level verification path.

## Review Notes
- The post uses the older `master` / `slave` terminology. NetworkManager 1.x still accepts these and current Red Hat documentation continues to use them, but newer NetworkManager releases also accept `controller` / `port` aliases. Not an error, but something to be aware of as terminology evolves.
- Red Hat's own examples often include an explicit `slave-type bond` argument when adding slaves (e.g., `nmcli connection add type ethernet slave-type bond ...`). The post omits it, which is functionally equivalent for `type ethernet` because nmcli infers the slave-type from the master's connection type, but adding it explicitly would be slightly more robust against edge cases.
- The "LACP (802.3ad) Bond" example reuses `ifname bond0`, which would conflict with the bond created in Step 1 if both were present on the same system. As a standalone alternative example this is fine, but a reader following the post end-to-end may want to use a different `ifname` (e.g., `bond1`) to avoid the conflict.
- Activation order: the post brings slaves up first, then the bond. NetworkManager also auto-activates slaves when the master is brought up (assuming autoconnect), so either order works.
- The conclusion mentions "three steps" but the tutorial has four numbered steps; the conclusion is referring to the configuration steps (create master, add slaves, assign IP) before activation, which is consistent.
