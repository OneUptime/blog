# Validation Summary: How to Reduce IPv6 Neighbor Discovery Overhead

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Neighbor Discovery Protocol (NDP)
- Linux kernel network sysctls
- `iproute2`
- `tcpdump`
- Multicast Listener Discovery (MLD)

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- RFC 4861, Neighbor Discovery for IP version 6 (IPv6): https://datatracker.ietf.org/doc/html/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://datatracker.ietf.org/doc/html/rfc4862
- RFC 3810, Multicast Listener Discovery Version 2 (MLDv2) for IPv6: https://datatracker.ietf.org/doc/rfc3810/
- Upstream Linux kernel mailing list note for `gc_interval` documentation, indicating the sysctl is unused since kernel v2.6.8: https://www.spinics.net/lists/kernel/msg6067237.html
- Local `sysctl(8)` man page
- Local `arp(7)` man page
- Local `ip-neighbour(8)` man page
- Local `ip-maddress(8)` man page

## Issues Found
- The post treated `net.ipv6.neigh.default.gc_interval` as an active tuning knob. Current upstream Linux kernel documentation work marks this sysctl as unused in modern kernels, so it was removed from the tuning snippet.
- `net.ipv6.neigh.default.delay_first_probe_time` was documented as milliseconds and set to `5000`. Linux exposes this sysctl in seconds, so it was corrected to `5` and the explanation was updated to describe stale-neighbor probing accurately.
- The Step 2 persistence example appended to `/etc/sysctl.d/...` using shell redirection without elevated privileges. It was changed to `sudo tee -a ...` and privileged runtime commands were updated to use `sudo`.
- The Step 3 DAD example used bare `key = value` lines inside a `bash` block, which are not runnable shell commands. It was changed to valid `sysctl` commands.
- The Step 4 section incorrectly claimed that `mc_forwarding=0` suppresses MLD reports. Linux documents `mc_forwarding` as multicast routing control, so the section was rewritten to describe multicast forwarding correctly and the `ip -6 maddr show` comment was corrected to refer to multicast group memberships.
- The Step 5 rate-count example only counted ICMPv6 types 135 and 136, so its comment was corrected from generic NDP traffic to NS/NA traffic. A note was also added that the example requires `pv`.
- The Step 6 static-neighbor example did not explicitly request a permanent state. `nud permanent` was added so the command matches the text and verification step.

## Review Notes
- `eth0` is used as an example interface name; many current Linux distributions use predictable names such as `ens3` or `enp1s0`.
- `accept_ra=0` is appropriate only when routes and other RA-derived parameters are managed manually.
- `pv` is not installed by default on all Linux systems, so the packet-rate example remains optional tooling rather than a base-system command.
