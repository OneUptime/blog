# Validation Summary: How to Configure IPv4 Networking with Netplan on Ubuntu

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Netplan (network configuration abstraction)
- Ubuntu (Linux distribution)
- YAML (configuration format)
- systemd-networkd (renderer backend)
- NetworkManager (renderer backend)
- iproute2 (`ip` command suite)
- systemd-resolved (`resolvectl`)

## Sources Consulted
- [Netplan YAML reference (official docs)](https://netplan.readthedocs.io/en/stable/netplan-yaml/)
- [netplan-try man page (Ubuntu manpages)](https://manpages.ubuntu.com/manpages/jammy/man8/netplan-try.8.html)
- [Netplan documentation - netplan-try](https://netplan.readthedocs.io/en/0.107/netplan-try/)
- [Phoronix - Ubuntu 17.10 To Fully Use Netplan By Default](https://www.phoronix.com/news/Ubuntu-17.10-Netplan)

## Issues Found

1. **Incorrect Ubuntu version for Netplan default** — The introduction stated Netplan has been Ubuntu's default since 18.04. Netplan was actually introduced as the default network configuration tool in Ubuntu 17.10. Updated the wording to "since 17.10".

2. **Invalid /30 subnet/gateway combination in the Multiple Interfaces example** — The example used `addresses: [10.0.0.5/30]` with a route `via: 10.0.0.1`. A /30 subnet for host 10.0.0.5 is 10.0.0.4/30 (usable hosts: 10.0.0.5 and 10.0.0.6), so 10.0.0.1 is not on the local segment and cannot serve as the next-hop. Changed the prefix to `/24` so the gateway is reachable in-subnet, which is what the example clearly intended.

## Review Notes

- All YAML keys used (`addresses`, `routes` with `to`/`via`/`metric`, `nameservers.addresses`, `nameservers.search`, `dhcp4`, `dhcp6`, `renderer`, `version`) match the current Netplan v2 schema.
- The post correctly uses the modern `routes:` block with `to: default` rather than the deprecated `gateway4` field.
- The 120-second default timeout for `netplan try` is accurate.
- `ip -4 addr show`, `ip route show`, `resolvectl status`, and `ip link show` are all valid verification commands on a current Ubuntu system.
- The two valid renderer values (`networkd`, `NetworkManager`) are correctly identified.
- Future improvement (not changed): the Multiple IPv4 Addresses example assigns two addresses from the same /24 to a single interface, which is technically valid but somewhat unusual; readers may benefit from a short note on use cases (e.g., service IPs, migrations). No correctness issue.
