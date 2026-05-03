# Validation Summary: How to Debug IPv6 Multicast Issues with tcpdump

## Status
validated

## Post Type
Tutorial / Reference (tcpdump filter recipes for IPv6 multicast troubleshooting)

## Technologies Covered
- tcpdump / libpcap BPF filter syntax
- IPv6 (RFC 8200)
- ICMPv6 (RFC 4443)
- MLDv1 (RFC 2710) and MLDv2 (RFC 3810)
- IPv6 Router Alert option (RFC 2711)
- PIM-SM v2 (RFC 7761)
- Neighbor Discovery Protocol / NDP (RFC 4861)
- IPv6 multicast addressing (RFC 4291)

## Sources Consulted
- RFC 2710 (MLDv1) — https://datatracker.ietf.org/doc/html/rfc2710 (§3 mandates Hop-by-Hop Router Alert on every MLD message)
- RFC 3810 (MLDv2) — https://datatracker.ietf.org/doc/html/rfc3810 (§5 same Hop-by-Hop Router Alert requirement)
- RFC 2711 (IPv6 Router Alert) — https://datatracker.ietf.org/doc/html/rfc2711
- RFC 7761 (PIM-SM v2) — https://datatracker.ietf.org/doc/html/rfc7761 (§4.9 PIM common header layout: Version|Type in byte 0, Reserved in byte 1)
- RFC 4861 (NDP) — https://datatracker.ietf.org/doc/html/rfc4861 (no Hop-by-Hop requirement)
- RFC 4291 (IPv6 addressing) — multicast prefix ff00::/8, scope encoding
- pcap-filter(7) — `ip6 proto` does not chase the IPv6 extension header chain (`ip6 protochain` does); `proto[expr:size]` indexing for transport protocols does not walk extension headers either
- tcpdump(8) — `-tttt` is a printed-output timestamp format flag; `-w` writes raw pcap and stores native libpcap timestamps; precision is controlled by `--time-stamp-precision`

## Issues Found

1. **MLD type filters used `ip6[40] == 130/131/132/143` (broken).** RFC 2710/3810 require every MLD message to carry an IPv6 Hop-by-Hop Options header with the Router Alert option. With HBH present, byte 40 is the HBH Next Header field (value 58 = ICMPv6), not the ICMPv6 type. The ICMPv6 type lives at byte 48 (40-byte IPv6 header + 8-byte HBH Router Alert). The original filters would never match a real MLD packet on the wire. Per pcap-filter(7), libpcap's `icmp6` / `icmp6[icmp6type]` indexing also does not chase IPv6 extension headers, so an `icmp6[0] == 130` substitution would not fix it either. Fixed by switching every MLD filter to `ip6[40] == 58 and ip6[48] == <type>` and adding an inline comment that explains the offsets and cites the relevant RFCs. The same fix was applied in the saved-captures section, the diagnostic sections, the awk pipeline, the one-liner monitoring script, and the summary.

2. **PIM type filters used `ip6[41] == 0` / `ip6[41] == 1` (broken).** RFC 7761 §4.9 puts PIM Version (high 4 bits) and Type (low 4 bits) in byte 0 of the PIM header — which sits at IPv6 byte offset 40 when no extension headers are present — and Reserved (always zero) in byte 1. The post was checking the Reserved byte: `ip6[41] == 0` matches every PIM packet, and `ip6[41] == 1` matches none. Fixed both filters to `(ip6[40] & 0x0f) == 0` (Hello) and `(ip6[40] & 0x0f) == 1` (Register), and rewrote the comment to point at RFC 7761 and explain the bit layout.

3. **`ff3e::db8:stream` and `ff3e::db8:test` are not valid IPv6 addresses.** The substrings `stream` and `test` contain non-hex characters (s, t, r, m), so tcpdump rejects the filter expression at parse time. Replaced with valid hex placeholders `ff3e::db8:1234` and `ff3e::db8:5678` everywhere they appeared (the multicast-group example, both diagnostic snippets, and the join example). The summary, which previously read `ip6 dst ff3e::stream`, was changed to the generic `ip6 dst <group>` to make the placeholder nature explicit.

4. **`tcpdump -tttt -w file.pcap` is misleading.** `-tttt` only changes the format of timestamps printed to stdout; it has no effect on what gets stored in the pcap file (libpcap always stores its native per-packet timestamp), and with `-w` there is no printed output. Replaced with `--time-stamp-precision=nano` (the actual flag for nanosecond-precision pcap writes, libpcap >= 1.5) and updated the comment to match.

5. **Awk pattern `MLDv2` would not match tcpdump output.** tcpdump's print-icmp6 routine emits strings like `multicast listener query v2` and `multicast listener reportv2` — never the literal `MLDv2`. Changed the second branch of the awk script to match `multicast listener report` so it actually labels MLDv2 reports as `REPORT`.

## Review Notes

- The NDP filter `icmp6 and (ip6[40] == 135 or ip6[40] == 136)` is correct as written: NDP packets are not required to carry an IPv6 Hop-by-Hop Options header (RFC 4861 only constrains source address scope and Hop Limit = 255), so byte 40 is the ICMPv6 type. Left unchanged.
- `ip6 multicast`, `ip6 dst net ff02::/16`, and `ip6[24] == 0xff` are all correct ways to match IPv6 multicast destinations and were left unchanged.
- The comment "tcpdump may not support ff::/8 directly" is technically correct in spirit — `ff00::/8` is the multicast prefix and some libpcap versions handle it inconsistently — but the suggested fallback (`ip6[24] == 0xff`) is portable and correct, so no change needed.
- The MLD/PIM filters are deliberately written with explicit byte offsets rather than `ip6 protochain`. `protochain` would be more general (handles arbitrary extension-header chains) but is much slower and the standards-compliant MLD packet shape is fixed at HBH(8) + ICMPv6, so the explicit form is both correct and efficient.
- A future polish would be to demonstrate `ip6 protochain 58 and ...` as an alternative for environments where extension-header layout cannot be assumed, but that is beyond the scope of a correctness review.
