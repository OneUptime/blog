# Validation Summary: How to Detect ARP Spoofing with Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark (display filters, Expert Information)
- tshark (command-line packet analysis)
- ARP protocol (RFC 826)
- Linux networking utilities (`arp`, `ip neighbor`)
- awk (for tshark output processing)

## Sources Consulted
- Wireshark display filter reference for ARP: https://www.wireshark.org/docs/dfref/a/arp.html
- Wireshark ARP dissector source (packet-arp.c)
- tshark man page: https://www.wireshark.org/docs/man-pages/tshark.html
- RFC 826 (Address Resolution Protocol)
- Linux net-tools `arp(8)` man page
- iproute2 `ip-neighbour(8)` man page

## Issues Found

1. **"Statistics → ARP Address Table" section was technically inaccurate.** The post suggested using Statistics → Endpoints → Ethernet tab to find duplicate IP-to-MAC mappings. The Endpoints dialog shows per-endpoint traffic counts (packets/bytes per MAC), not ARP conflict detection. Wireshark has no dedicated "ARP Address Table" feature in Statistics. **Fix:** Replaced with the correct feature — Analyze → Expert Information — which is where the ARP dissector surfaces "Duplicate IP address configured" warnings (via the `arp.duplicate-address-detected` / `arp.duplicate-address-frame` expert info fields already referenced earlier in the post).

## Review Notes

- All Wireshark display filter field names (`arp`, `arp.opcode`, `arp.isgratuitous`, `arp.src.proto_ipv4`, `arp.dst.proto_ipv4`, `arp.src.hw_mac`, `arp.duplicate-address-detected`, `arp.duplicate-address-frame`) are valid per the official ARP dissector reference.
- ARP opcode values (1 = request, 2 = reply) match RFC 826.
- The gratuitous ARP detection expression `arp.src.proto_ipv4 == arp.dst.proto_ipv4` is correct — gratuitous ARP is defined by sender and target protocol addresses being identical.
- `tshark -Y <filter>` is the correct modern flag for display filters; the deprecated `-R` form would require the `-2` two-pass flag in current releases.
- The Linux `arp -n`, `arp -s`, and `ip neighbor show` commands are accurate. Note that net-tools `arp` is deprecated in favor of `ip neighbor`, but the post uses both appropriately and the deprecation is not blocking.
- The tshark + awk pipeline works because `-T fields -e ... -e ...` produces tab-separated output, and awk's default field splitter handles whitespace including tabs.
- The 10 gratuitous ARPs/second threshold is a heuristic suggestion rather than a strict standard; this is reasonable guidance for detection, not a precise specification.
