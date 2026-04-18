# Validation Summary: How to Troubleshoot VLAN Connectivity Issues on Linux

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Linux networking stack
- 802.1Q VLAN tagging (IEEE 802.1Q)
- `8021q` kernel module
- iproute2 (`ip link`, `ip addr`, `ip route`, `ip neigh`)
- `tcpdump` with VLAN filtering
- `arping` (iputils)
- `ping` with interface binding
- Ethernet MTU and frame sizing

## Sources Consulted
- Linux kernel documentation: Documentation/networking/vlan.rst (https://www.kernel.org/doc/html/latest/networking/vlan.html)
- iproute2 man pages: `ip-link(8)`, `ip-address(8)`, `ip-route(8)`, `ip-neighbour(8)` (https://man7.org/linux/man-pages/man8/ip.8.html)
- tcpdump man page and pcap-filter syntax (https://www.tcpdump.org/manpages/tcpdump.1.html, https://www.tcpdump.org/manpages/pcap-filter.7.html)
- iputils arping man page (https://man7.org/linux/man-pages/man8/arping.8.html)
- IEEE 802.1Q-2018 standard for VLAN tagging
- IEEE 802.3ac amendment defining 1522-byte "baby giant" frames for VLAN-tagged Ethernet

## Issues Found
No technical issues found.

All commands are syntactically correct and use current iproute2/tcpdump conventions. The pcap filter expression `vlan 100` and the bare `vlan` keyword are both valid filter primitives. The `-e` flag correctly prints link-level headers including 802.1Q tags. The `8021q` module name matches the in-tree Linux kernel module. The MTU calculation (4 bytes added by the 802.1Q tag) and the workaround of reducing the VLAN interface MTU to 1496 are accurate.

## Review Notes
- On modern Linux distributions, the `8021q` module is typically auto-loaded when a VLAN interface is created via `ip link add ... type vlan`, so manually loading it is rarely required — but verifying it is loaded is still a useful troubleshooting step.
- When `ip addr add` is used, the kernel automatically inserts a connected route for the subnet, so the explicit `ip route add` in Step 4 is usually redundant. The post correctly frames it as a fallback ("If missing").
- Most modern switches and NICs (post-IEEE 802.3ac, ~2000) accept 1522-byte VLAN-tagged frames without needing the MTU workaround, but the advice in Step 8 remains valid for older or strictly-conforming hardware.
- tcpdump's actual output for VLAN tags in modern (4.x+) versions is `vlan 100, p 0, ethertype IPv4, ...` — the conclusion's `802.1Q vlan#<ID>` notation is a reasonable generic representation rather than literal output, which is acceptable in a troubleshooting summary.
- Argument order in the tcpdump invocations places `-n` after the `vlan` filter expression. On Linux with GNU glibc, `getopt_long()` permutes arguments by default, so this works; users on POSIX-strict systems (e.g., with `POSIXLY_CORRECT` set) might prefer to place all options before the filter expression.
