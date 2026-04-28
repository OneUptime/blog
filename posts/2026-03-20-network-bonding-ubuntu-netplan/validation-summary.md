# Validation Summary: How to Configure Network Bonding on Ubuntu with Netplan

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (18.04+)
- Netplan (YAML-based network configuration)
- systemd-networkd (renderer)
- Linux kernel bonding driver
- Bonding modes: active-backup (mode 1), 802.3ad / LACP (mode 4), balance-rr (mode 0)
- iproute2 (`ip` command)

## Sources Consulted
- Netplan official reference documentation (netplan.io/reference)
- `netplan.yaml(5)` man page
- Ubuntu Server documentation on network bonding
- Linux kernel bonding driver documentation (`Documentation/networking/bonding.rst`)
- `/proc/net/bonding/` kernel interface

## Issues Found
No technical issues found.

All configuration parameters and commands were verified against the official Netplan reference:
- Top-level keys (`network.version: 2`, `renderer: networkd`) are correct.
- Bond parameter names use the proper Netplan hyphenated form: `mii-monitor-interval`, `lacp-rate`, `transmit-hash-policy` (Netplan translates these to the kernel's `miimon`, `lacp_rate`, `xmit_hash_policy`).
- Bonding modes (`active-backup`, `802.3ad`, `balance-rr`) are valid Netplan values.
- `primary: eth0` is a valid parameter and is correctly used only with active-backup mode.
- `transmit-hash-policy: layer3+4` is a valid value.
- The routes syntax (`- to: default` / `via: ...`) matches the current Netplan schema.
- Member interfaces declared in the `ethernets:` section with `dhcp4: false` is the standard Netplan pattern for bond slaves.
- `netplan apply`, `ip addr show`, `cat /proc/net/bonding/bond0`, and `ip link set <iface> up/down` commands are all current and correct.

## Review Notes
- The post mentions Ubuntu 18.04+ as a prerequisite, which is appropriate since Netplan became the default network configuration tool in Ubuntu 18.04 LTS.
- The `lacp-rate: fast` value requires the upstream switch to also be configured for fast LACPDU transmission; this is a switch-side consideration the post doesn't elaborate on but isn't a technical inaccuracy.
- The `primary` option only takes effect when `fail-over-mac-policy` is not set to `follow` and is meaningful only for `active-backup` mode — the post correctly places it in that section.
- For LACP bonds, some operators prefer `arp-monitor-interval` or both link/ARP monitoring; the post sticks with MII monitoring which is the most common and reliable default.
