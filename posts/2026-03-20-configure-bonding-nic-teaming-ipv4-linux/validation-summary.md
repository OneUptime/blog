# Validation Summary: How to Configure Bonding (NIC Teaming) with IPv4 on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux kernel bonding driver
- `iproute2` (`ip link`, `ip addr`, `ip route`)
- Netplan
- IPv4 static addressing
- LACP / IEEE 802.3ad link aggregation

## Sources Consulted
- Linux kernel bonding documentation: https://www.kernel.org/doc/html/v6.7/networking/bonding.html
- Netplan YAML reference for bonds: https://canonical-netplan.readthedocs-hosted.com/en/stable/netplan-yaml/
- Netplan link aggregation guide: https://canonical-netplan.readthedocs-hosted.com/en/stable/creating-link-aggregation/
- Local `iproute2` help output checked against the installed CLI: `ip link help bond`, `ip route help` (`iproute2-6.1.0`)

## Issues Found
- The runtime example loaded the bonding module with `sudo modprobe bonding` and then created `bond0` with `ip link add`. Per the kernel bonding documentation, the bonding module defaults to `max_bonds=1`, which can auto-create `bond0` and cause the subsequent `ip link add bond0 ...` command to fail. I changed this to `sudo modprobe bonding max_bonds=0`.
- The runtime example used `ip route add default via 192.168.1.1`, which can fail if a default route from a former slave already exists. I changed this to `ip route replace default via 192.168.1.1 dev bond0` so the bond becomes the active default route cleanly.
- The LACP example used `transmit-hash-policy: layer3+4` without caveat. The kernel bonding documentation notes that `layer3+4` is not fully 802.3ad compliant. I changed the example to `layer2+3`, which is valid for 802.3ad and still improves distribution.
- The introduction, description, and conclusion implied generic throughput gains from LACP. I tightened the wording to higher aggregate throughput across multiple flows, which matches how bonding hash policies distribute traffic in practice.

## Review Notes
- The Netplan bond syntax in the post is valid for current Netplan documentation, including `routes: - to: default` and `parameters: mii-monitor-interval`.
- Using `eth0` and `eth1` as interface names is technically acceptable for examples, but many modern Linux systems use predictable names such as `enp3s0`.
