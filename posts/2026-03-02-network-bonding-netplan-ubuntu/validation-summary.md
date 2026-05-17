# Validation Summary: How to Configure Network Bonding with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu (Netplan-based releases)
- Netplan (YAML network configuration renderer for networkd/NetworkManager)
- Linux kernel bonding driver (modes 0–6)
- IEEE 802.3ad LACP (link aggregation)
- systemd-networkd
- VLANs (802.1Q)
- Cisco IOS port-channel / channel-group configuration
- tcpdump / ip / networkctl utilities

## Sources Consulted
- Netplan reference documentation — bond properties (https://netplan.readthedocs.io/en/stable/netplan-yaml/#properties-for-device-type-bonds)
- Linux kernel bonding driver documentation (https://www.kernel.org/doc/Documentation/networking/bonding.txt)
- Ubuntu Server networking guide — Netplan (https://ubuntu.com/server/docs/network-configuration)
- IEEE 802.3ad / 802.1AX standards (Slow Protocols ethertype 0x8809)
- systemd-modules-load.d(5) man page
- Cisco IOS EtherChannel configuration guide (channel-group / Port-channel)

## Issues Found
- The illustrative `/proc/net/bonding/bond0` output incorrectly showed `Bonding Mode: active-backup` and `Primary Slave: enp3s0 (primary_reselect failure)`. The kernel actually emits the mode with a descriptive prefix (`Bonding Mode: fault-tolerance (active-backup)`), and the default primary_reselect policy is `always`, not `failure`. Updated the sample output to reflect what the kernel actually prints so readers comparing real output against the docs do not get confused.

## Review Notes
- All Netplan bond parameter names verified against the current Netplan reference: `mode`, `primary`, `mii-monitor-interval`, `fail-over-mac-policy` (none|active|follow), `lacp-rate` (slow|fast), `transmit-hash-policy` (layer2|layer2+3|layer3+4|encap2+3|encap3+4), `ad-select` (stable|bandwidth|count) are all valid.
- LACP slow rate (30s) and fast rate (1s) values are correct per 802.3ad.
- Ethertype `0x8809` is the IEEE Slow Protocols ethertype, which LACPDUs use — the tcpdump filter is correct.
- `lsmod | grep bonding`, `modprobe bonding`, and the `/etc/modules-load.d/bonding.conf` autoload path are correct.
- `ip link show master bond0` and `ip -s link show bond0` are valid iproute2 invocations.
- The Cisco IOS snippet uses `channel-group N mode active` (LACP active) on member ports and a `Port-channel1` logical interface — this matches Cisco IOS conventions for LACP EtherChannel.
- The performance note about LACP being per-flow (not per-packet) and hash policy `layer3+4` giving better distribution than `layer2` is accurate.
- The VLAN-on-bond example uses Netplan's standard `vlans:` block with `link`, `id`, and address parameters — syntactically correct.
- Author should be aware that future Linux kernel and bonding driver documentation has shifted terminology from "slave" to "port" / "member" in some places; current Netplan still uses `interfaces:` (already used in this post), so no change needed today.
