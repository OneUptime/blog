# Validation Summary: How to Understand Router Advertisement (RA) Messages

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- ICMPv6 Router Advertisement (Type 134)
- IPv6 Neighbor Discovery Protocol (NDP)
- SLAAC (Stateless Address Autoconfiguration)
- DHCPv6 (stateful and stateless)
- radvd (Linux Router Advertisement Daemon)
- tcpdump (RA capture/decoding)
- RFC 4861 (Neighbor Discovery for IPv6)
- RFC 4191 (Default Router Preferences and More-Specific Routes)
- RFC 4389 (ND Proxy)
- RFC 8106 (IPv6 Router Advertisement Options for DNS Configuration)
- RFC 6275 / 3775 (Mobile IPv6, H flag)
- Python (flag-parsing snippet)

## Sources Consulted
- RFC 4861 — Neighbor Discovery for IP version 6 (IPv6): https://www.rfc-editor.org/rfc/rfc4861 (Sections 4.2, 6.1.2, 6.2.1)
- RFC 4191 — Default Router Preferences and More-Specific Routes: https://www.rfc-editor.org/rfc/rfc4191 (Section 2.2 — Prf field at bits 3-4)
- RFC 4389 — Neighbor Discovery Proxies (ND Proxy): https://www.rfc-editor.org/rfc/rfc4389 (Section 4.1.3.3 — P flag at bit 5)
- RFC 6275 — Mobility Support in IPv6 (H flag for Home Agent): https://www.rfc-editor.org/rfc/rfc6275
- RFC 8106 — IPv6 RA Options for DNS Configuration (RDNSS option type 25): https://www.rfc-editor.org/rfc/rfc8106
- radvd.conf(5) man page: https://manpages.debian.org/bookworm/radvd/radvd.conf.5.en.html
- IANA ICMPv6 parameters / NDP option type registry: https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- tcpdump / pcap-filter(7) documentation for `ip6[40] == 134` filter idiom

## Issues Found
No technical issues found.

The packet diagram, field definitions, flag bit positions, IPv6 source/destination requirements (link-local source, ff02::1 destination, Hop Limit 255), radvd configuration syntax, NDP option type codes (PIO=3, SLLA=1, MTU=5, RDNSS=25) and corresponding length values, default lifetimes (1800s router, 2592000s valid, 604800s preferred), and the Python flag-parsing logic (including the M-takes-precedence address-mode resolution) all match the cited RFCs and the current radvd documentation.

## Review Notes
- The Python code uses LSB-indexed bit numbering in its comments (Bit 7 = MSB = M flag), while the ASCII diagram uses RFC/network MSB-indexed numbering. Both are internally consistent and the bitmasks are correct, but readers unfamiliar with the dual conventions may briefly find this confusing.
- The `address_mode` simplification implicitly treats M=1 as overriding O — which is what RFC 4861 expects in practice (M=1 effectively implies O=1). Worth knowing for readers who try to reason about M=1, O=0.
- The tcpdump filter `ip6[40] == 134` only works when the IPv6 header has no extension headers preceding the ICMPv6 header. This is the common case for RAs, but the filter would silently miss RAs carried after extension headers. Acceptable shorthand for the post's purpose.
- The destination address note ("ff02::1 for periodic; unicast for RS reply") is correct for the typical case; RFC 4861 §6.2.6 actually allows the solicited reply to be either unicast to the RS source or multicast to ff02::1, depending on configuration. Not an error, just a simplification.
