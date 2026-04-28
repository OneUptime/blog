# Validation Summary: How to Create a Network Bridge on Linux Using iproute2

## Status
validated

## Post Type
Tutorial / Technical How-To Guide

## Technologies Covered
- Linux kernel bridge driver (Layer 2 software switch)
- iproute2 suite (`ip` and `bridge` commands)
- Spanning Tree Protocol (STP)
- Netplan (YAML-based network configuration)
- KVM/container networking context

## Sources Consulted
- `man 8 ip-link` — `ip link add ... type bridge`, `master`/`nomaster`, bridge type parameters (`stp_state`, etc.)
- `man 8 bridge` — `bridge link show`, `bridge fdb show [br BRDEV]`
- `man 8 ip` — `-d`/`-details` flag for detailed link info
- `man 5 netplan` / Netplan reference docs — `bridges:` schema with `parameters:` (including `stp`)
- Linux kernel docs: `Documentation/networking/bridge.rst`
- iproute2 source: `ip/iplink_bridge.c`, `bridge/fdb.c`

## Issues Found
No technical issues found.

All commands verified against current iproute2 (5.x/6.x):
- `ip link add br0 type bridge` — correct bridge creation syntax.
- `ip link set eth0 master br0` / `nomaster` — correct enslave/release.
- `ip link set br0 type bridge stp_state 0` — correct iproute2-native way to disable STP.
- `bridge fdb show br br0` — `br BRDEV` is a valid filter selector.
- `bridge link show`, `ip -d link show br0` — correct.
- Netplan YAML uses the documented `bridges:` schema with `parameters: stp: false`, which is the correct way to disable STP under Netplan.

The conceptual explanation (bridge as L2 switch, bridge port no longer handles IP directly, IP assigned to bridge instead) is accurate.

## Review Notes
- The `bridge fdb show br BRDEV` filter form is present in modern iproute2 (5.x+); on very old distributions only `brport DEV` was available. Not worth calling out for current LTS distributions.
- The post does not mention the `bridge_fdb` netlink-extended attributes or VLAN-aware bridging (`vlan_filtering 1`), but those are out of scope for an introductory bridge tutorial.
- `ip route add default via 192.168.1.1` after flushing the physical interface's IP is correct, but readers running this remotely over `eth0` should be warned that flushing the IP and re-adding via the bridge will momentarily drop connectivity. This is a usability observation, not a technical error.
- Netplan's flow-style `eth0: {dhcp4: false}` is valid YAML and parses correctly with Netplan; mixing flow and block styles is purely stylistic.
