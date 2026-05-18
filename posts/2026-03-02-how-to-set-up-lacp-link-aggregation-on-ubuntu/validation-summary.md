# Validation Summary: How to Set Up LACP Link Aggregation on Ubuntu

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Ubuntu 20.04 / 22.04
- Linux kernel bonding driver
- LACP / IEEE 802.3ad
- Netplan (networkd renderer)
- systemd-networkd
- ifenslave, ethtool, iperf3, tcpdump
- `/proc/net/bonding/` interface

## Sources Consulted
- Linux kernel bonding driver documentation: https://www.kernel.org/doc/Documentation/networking/bonding.txt
- Netplan reference: https://netplan.readthedocs.io/en/stable/netplan-yaml/
- systemd.netdev(5): https://www.freedesktop.org/software/systemd/man/systemd.netdev.html
- systemd.network(5): https://www.freedesktop.org/software/systemd/man/systemd.network.html
- IEEE 802.3ad / 802.1AX (LACP) — Slow Protocols ethertype 0x8809
- Ubuntu Server documentation on network bonding

## Issues Found
1. **Inaccurate bonding driver version in example output** — The sample `/proc/net/bonding/bond0` output showed `Ethernet Channel Bonding Driver: v6.x`. The Linux kernel bonding driver has reported version `v3.7.1 (April 27, 2011)` since 2011, including on Ubuntu 20.04/22.04. Updated the example to reflect the realistic version string.
2. **Inconsistent `Min links` value in example output** — The Netplan config sets `min-links: 1`, but the example output showed `Min links: 0`. This would confuse readers since following the tutorial should produce `Min links: 1`. Updated the example output to match the configured value.

## Review Notes
- The bonding mode list (modes 0, 1, 2, 4, 5, 6) and their descriptions are accurate.
- Netplan parameter names (`mode`, `lacp-rate`, `min-links`, `transmit-hash-policy`, `mii-monitor-interval`) are correct per the Netplan schema.
- systemd-networkd `[Bond]` keys (`Mode`, `LACPTransmitRate`, `TransmitHashPolicy`, `MIIMonitorSec`, `MinLinks`) are correct, including the `MIIMonitorSec=100ms` time-value format.
- The LACP slow-protocols ethertype `0x8809` used with `tcpdump` is correct.
- The Netplan `routes: - to: default / via: ...` syntax is the current recommended form (the older `gateway4:` field is deprecated).
- `ifenslave` is included for legacy familiarity; on modern Ubuntu it is not strictly required because the kernel bonding driver handles slave membership via Netplan/systemd-networkd. Leaving the install command is harmless and matches many existing tutorials.
- `ethtool -S eth0 | grep lacp` may return no output on many NICs that don't expose LACP-specific counters; the authoritative source remains `/proc/net/bonding/bond0`. Not changed as the command itself is not wrong.
- The post correctly notes that LACP distributes flows (not single TCP sessions) across links, which is an important conceptual point for users testing throughput.
