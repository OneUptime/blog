# Validation Summary: How to Understand Neighbor Solicitation (NS) Messages

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- ICMPv6 Neighbor Discovery Protocol (NDP)
- Neighbor Solicitation (Type 135) message format
- IPv6 address resolution
- Duplicate Address Detection (DAD)
- Neighbor Unreachability Detection (NUD)
- Solicited-node multicast addressing
- IPv6 multicast → Ethernet MAC mapping
- tcpdump BPF filters
- Python `socket` module (inet_pton/inet_ntop)

## Sources Consulted
- RFC 4861 (Neighbor Discovery for IPv6) — https://www.rfc-editor.org/rfc/rfc4861
  - Section 4.3 (Neighbor Solicitation Message Format)
  - Section 6.1 (Validation of Neighbor Solicitations: Hop Limit 255 requirement)
  - Section 7.2.1 (Source Link-Layer Address option rules)
- RFC 4291 (IP Version 6 Addressing Architecture) — https://www.rfc-editor.org/rfc/rfc4291
  - Section 2.7.1 (Solicited-Node multicast format `FF02:0:0:0:0:1:FFXX:XXXX`)
- RFC 4862 (IPv6 Stateless Address Autoconfiguration) — https://www.rfc-editor.org/rfc/rfc4862
  - Section 5.4 (DAD: DupAddrDetectTransmits=1, RetransTimer=1000ms defaults)
- RFC 2464 (IPv6 over Ethernet) — Section 7 (multicast MAC mapping `33:33:XXXX:XXXX`)
- tcpdump/libpcap filter expression documentation (pcap-filter(7))
- Python `socket` module documentation (inet_pton/inet_ntop)

## Issues Found

**Issue 1 (bug, fixed): Python `solicited_node_multicast()` produced a 15-byte address.**

The construction was:

```python
snm_bytes = (b'\xff\x02' + b'\x00' * 9 +
             b'\xff' + addr_bytes[-3:])
```

That is 2 + 9 + 1 + 3 = 15 bytes. The solicited-node multicast `FF02:0:0:0:0:1:FFXX:XXXX` requires a `0x01` byte at position 11 (the low byte of the sixth 16-bit group). The buggy version raised `ValueError: invalid length of packed IP address string` from `socket.inet_ntop`. Verified by running the snippet.

Fix: insert the missing `\x01` so the prefix becomes `b'\x01\xff'`:

```python
snm_bytes = (b'\xff\x02' + b'\x00' * 9 +
             b'\x01\xff' + addr_bytes[-3:])
```

After the fix, `solicited_node_multicast("2001:db8::1")` correctly returns `ff02::1:ff00:1`, matching RFC 4291 §2.7.1.

## Review Notes

- The header diagram compresses the 128-bit Target Address into two visual rows rather than the four shown in RFC 4861 §4.3. This is a stylistic compression, not a technical error — the "(128 bits)" label preserves the correct semantics.
- "Source: Sender's link-local address" for address-resolution NS is the typical case, but RFC 4861 §4.3 also permits any address assigned to the outgoing interface. The phrasing is a reasonable simplification for an introductory post.
- `ping6` is deprecated on modern iputils in favor of `ping -6` / `ping`, but `ping6` is still shipped (as a symlink/wrapper) on most distros, so the example still works.
- The tcpdump filter `ip6[40] == 135` assumes no IPv6 extension headers between the IPv6 header and the ICMPv6 header. This is true for unmodified NS traffic; worth noting if extension headers (e.g., HBH) are present.
- The Ethernet multicast MAC computation correctly takes the last 32 bits of the IPv6 multicast address per RFC 2464 (`33:33:XX:XX:XX:XX`); the comment "last 3 bytes" is accurate specifically for solicited-node multicast where byte −4 is always `0xff`.
