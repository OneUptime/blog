# Validation Summary: How to Troubleshoot IPv6 DAD Failures

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Duplicate Address Detection (DAD)
- Neighbor Discovery Protocol (NDP)
- ICMPv6
- Linux `iproute2`
- Linux `sysctl`
- `tcpdump`
- `ip6tables`
- `ndisc6`

## Sources Consulted
- RFC 4862: IPv6 Stateless Address Autoconfiguration - https://www.rfc-editor.org/rfc/rfc4862
- RFC 4861: Neighbor Discovery for IP version 6 (IPv6) - https://www.rfc-editor.org/rfc/rfc4861
- Linux kernel IP sysctl documentation - https://www.kernel.org/doc/html/v6.9/networking/ip-sysctl.html
- `ip-address(8)` manual page - https://man7.org/linux/man-pages/man8/ip-address.8.html
- `iptables-extensions(8)` manual page - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `pcap-filter(7)` manual page - https://man7.org/linux/man-pages/man7/pcap-filter.7.html
- `ndisc6(8)` manual page - https://man.archlinux.org/man/extra/ndisc6/ndisc6.8.en

## Issues Found
- The introduction implied that DAD failure is detected only by a Neighbor Advertisement. RFC 4862 also treats a received Neighbor Solicitation for the tentative address from another node as a duplicate condition during simultaneous DAD. I updated the introduction, packet-capture explanation, and conclusion to reflect both cases.
- The example conflict response showed a Neighbor Advertisement sent to the tentative unicast address. Per RFC 4861, a response to a DAD probe with source `::` is multicast to the all-nodes address `ff02::1`. I corrected the example.
- The address-state list implied `preferred` appears as an `ip` address flag. In `ip-address(8)`, the relevant IPv6 flags are `tentative`, `deprecated`, `dadfailed`, and `temporary`; a normal usable address is inferred by the absence of those failure/deprecation flags. I corrected that wording.
- The conflicting-device section incorrectly implied you could inspect the conflicting host's NDP cache via `ip -6 neigh`. I changed this to a local neighbor-cache lookup with `ip -6 neigh show to ...` and clarified that `ndisc6` can query the on-link node directly for its MAC address.
- The post used `dad_transmits=0` as the way to disable DAD completely. The Linux kernel documents `accept_dad=0` as the direct knob to disable DAD, so I changed that command.
- The `addr_gen_mode` mapping was incorrect. Linux documents mode `1` as "no link-local generation; autoconf still uses EUI-64", mode `2` as RFC 7217 stable privacy with `stable_secret`, and mode `3` as RFC 7217 stable privacy using a random secret if none is set. I corrected the mapping and tightened the surrounding explanation.
- The Optimistic DAD comment overstated the behavior as simply "use address before DAD completes." I changed it to the technically accurate "Enable Optimistic DAD (RFC 4429)."
- The firewall check only inspected the OUTPUT chain and used a pattern that could miss current `ipv6-icmp` output. I updated it to check both INPUT and OUTPUT and use a broader case-insensitive ICMP match.

## Review Notes
- The post is Linux-specific. Commands such as `ip`, `sysctl`, `journalctl`, `ip6tables`, and the `addr_gen_mode` sysctl are not portable to non-Linux systems.
- `ndisc6` is a separate package on many distributions and may not be installed by default.
- Modern Linux systems may use `nftables` directly even when `ip6tables` compatibility commands are still available. The post's `ip6tables` examples remain technically valid for Linux environments that use that interface.
