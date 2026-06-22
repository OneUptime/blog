# Validation Summary: How to Set Up Network Bonding/Teaming on Ubuntu

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Ubuntu 20.04, 22.04, and 24.04
- Netplan YAML network configuration
- Linux bonding driver
- systemd-networkd
- iproute2 networking commands
- LACP / IEEE 802.3ad
- VLANs and Linux bridges
- iperf3, ethtool, and network monitoring commands

## Sources Consulted
- Netplan YAML configuration reference: https://netplan.readthedocs.io/en/latest/netplan-yaml/
- Netplan examples, including interface bonding, routes, bridges, and VLANs: https://netplan.readthedocs.io/en/latest/examples/
- Ubuntu netplan(5) man page for Ubuntu 22.04: https://manpages.ubuntu.com/manpages/jammy/man5/netplan.5.html
- Linux kernel bonding driver documentation: https://www.kernel.org/doc/Documentation/networking/bonding.txt
- Local iproute2 help output for `ip link` syntax.

## Issues Found
- The backup command copied files into `/etc/netplan/backup/` without first creating that directory. I added `sudo mkdir -p /etc/netplan/backup/` before the `cp` command so the example works on a default system.

## Review Notes
- Netplan bond configuration keys used in the post, including `interfaces`, `parameters`, `mode`, `primary`, `mii-monitor-interval`, `lacp-rate`, `transmit-hash-policy`, `arp-interval`, and `arp-ip-targets`, match the documented Netplan schema.
- The mode descriptions match the Linux bonding driver documentation. Mode 4 requires switch support for IEEE 802.3ad, and mode 6 does not require special switch configuration but depends on driver support for adaptive load balancing behavior.
- The static route examples use the current `routes: - to: default` syntax instead of the deprecated `gateway4` key.
- `netstat -i` may require the `net-tools` package on minimal Ubuntu installations; the post already includes `ip -s link show bond0`, which is the more modern built-in alternative.
