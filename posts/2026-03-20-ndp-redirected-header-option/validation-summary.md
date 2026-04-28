# Validation Summary: How to Understand the Redirected Header Option in NDP

## Status
validated

## Post Type
Reference / Tutorial — explains an RFC 4861 NDP option and shows how to parse it and observe related host behavior.

## Technologies Covered
- IPv6 Neighbor Discovery Protocol (NDP)
- ICMPv6 Redirect message (Type 137) and Redirected Header option (Type 4)
- Python (`struct`, `socket`) for binary packet parsing
- Linux IPv6 sysctls (`/proc/sys/net/ipv6/conf/*/accept_redirects`)
- `iproute2` (`ip -6 route show cache`) and `tcpdump` BPF filters

## Sources Consulted
- RFC 4861, "Neighbor Discovery for IP version 6 (IPv6)":
  - Section 4.5 (Redirect Message Format) — https://datatracker.ietf.org/doc/html/rfc4861#section-4.5
  - Section 4.6.3 (Redirected Header option, Type 4) — https://datatracker.ietf.org/doc/html/rfc4861#section-4.6.3
  - Section 8 (Redirect Function) — https://datatracker.ietf.org/doc/html/rfc4861#section-8
- RFC 4443 (ICMPv6) — Type 137 = Redirect
- RFC 8200 (IPv6) — 1280-byte minimum MTU
- Linux kernel docs: `Documentation/networking/ip-sysctl.rst` for `net.ipv6.conf.*.accept_redirects` (default 1 for hosts, 0 if forwarding is enabled)
- Python 3 `struct` and `socket` standard library docs (`inet_ntop`, `AF_INET6`)
- `tcpdump` pcap-filter(7) man page — `icmp6` and `ip6[40]` byte-offset semantics

## Issues Found
- **Redirect fixed body size labeled "20 bytes" — corrected to "40 bytes."** The fields listed (1 + 1 + 2 + 4 + 16 + 16) sum to 40 bytes, matching RFC 4861 §4.5, and the Python parser in the same post correctly starts options at offset 40. The "20 bytes" label was an internal contradiction; updated to 40.

## Review Notes
- Type/Length/Reserved layout (1 + 1 + 2 + 4 = 8-byte header before the embedded packet) matches RFC 4861 §4.6.3 exactly. The note "Original packet starts at byte 8 of the option (after 6 bytes reserved)" is consistent with the format diagram (after Type+Length the spec has 6 bytes of Reserved, totaling an 8-byte option header).
- The Length encoding (`(8 + len(original_packet_bytes) + padding) / 8`, in 8-octet units) matches RFC 4861's general option format.
- The 1280-byte cap on the redirected packet content is per RFC 4861 §4.6.3 ("the IP header and as much of the original packet as can fit without making the redirect packet exceed the minimum IPv6 MTU").
- Linux sysctl behavior described matches `Documentation/networking/ip-sysctl.rst`: `accept_redirects` default is 1 for hosts and 0 when forwarding is enabled — the post's "1 = accept (default); 0 = ignore" is accurate for a host with forwarding off.
- The `tcpdump` filter `"icmp6 and ip6[40] == 137"` is valid: after the 40-byte fixed IPv6 header, byte 0 of the ICMPv6 header is the Type field. (Note: this filter does not handle IPv6 extension headers, but that is a standard limitation of fixed-offset BPF filters and is beyond the scope of this post.)
- `ip -6 route show cache | grep "redirect"` may not always print the literal token "redirect"; matching by destination prefix is more reliable on some kernels. This is a minor stylistic suggestion only — not a correctness error — so left as-is.
- The Python parser is syntactically correct, uses non-deprecated APIs (`struct`, `socket.inet_ntop` with `AF_INET6`), and the offset arithmetic is consistent with the RFC.
