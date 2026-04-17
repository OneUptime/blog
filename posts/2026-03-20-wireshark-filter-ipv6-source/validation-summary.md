# Validation Summary: How to Filter IPv6 Packets by Source Address in Wireshark

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Wireshark display filters
- IPv6 addressing (RFC 4291)
- BPF / libpcap capture filters (pcap-filter)
- CIDR notation for IPv6 prefixes

## Sources Consulted
- Wireshark IPv6 display filter reference: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark User's Guide, Building Display Filter Expressions: https://www.wireshark.org/docs/wsug_html_chunked/ChWorkBuildDisplayFilterSection.html
- pcap-filter(7) man page: https://www.tcpdump.org/manpages/pcap-filter.7.html
- RFC 4291 (IP Version 6 Addressing Architecture)

## Issues Found

1. **Invalid IPv6 address literals using non-hex letters.**
   - `2001:db8::client` and `2001:db8:server::10` contain characters (`l`, `i`, `n`, `t`, `s`, `r`, `v`) that are not valid hex digits and would be rejected by any IPv6 parser.
   - Fixed: replaced with valid hex addresses (`2001:db8::c11e`, `2001:db8:1::10`).

2. **Incorrect multicast filter using `ipv6.src_host contains "ff"`.**
   - `ipv6.src_host` is a string-typed field holding the resolved hostname (or text-form address), so substring-matching "ff" is unreliable and not a true multicast test — it matches any address whose text contains `ff` anywhere, or any hostname containing those characters.
   - Fixed: replaced with the idiomatic CIDR filter `ipv6.src == ff00::/8`, which correctly matches the IPv6 multicast range.

3. **Incorrect link-local filter using `ipv6.src_host[0:2] == fe:80`.**
   - Slicing on `ipv6.src_host` operates on the textual string, not the 16-byte address, so the `fe:80` byte-array comparison is semantically wrong against a string field.
   - Fixed: replaced with `ipv6.src == fe80::/10`, which is the correct Wireshark filter for the link-local range.

4. **Misleading BPF comment claiming CIDR is not supported.**
   - The comment "BPF does not support CIDR directly" is incorrect; pcap-filter has supported `net addr/len` CIDR notation for IPv6 for years (documented in pcap-filter(7)).
   - Fixed: updated the comment to correctly describe CIDR usage.

## Review Notes

- The `ipv6.src == ::1/128` example is valid but redundant (`/128` is a single-host mask equivalent to plain `ipv6.src == ::1`). Left as-is because it correctly illustrates that `/128` is accepted syntax.
- The case-insensitivity claim for IPv6 hex literals is correct when comparing as addresses. Note that string operators like `contains` on `ipv6.src_host` are case-sensitive by default — not raised in the post because the fixed examples no longer use `contains` on address-like fields.
- The slice operator could also be used against `ipv6.src` directly (e.g., `ipv6.src[0] == 0xff` for multicast), but the CIDR form chosen in the fix is clearer and more canonical.
