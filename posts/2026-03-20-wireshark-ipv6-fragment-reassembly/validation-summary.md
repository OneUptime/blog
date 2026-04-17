# Validation Summary: How to Analyze IPv6 Fragment Reassembly in Wireshark

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Wireshark display filters
- tshark (CLI packet analysis)
- IPv6 Fragment Extension Header (RFC 8200)
- ICMPv6 Packet Too Big / Path MTU Discovery (RFC 4443, RFC 8201)
- IPv6-in-IPv4 tunneling (6in4 / RFC 4213, protocol 41)
- GRE encapsulation
- Fragmentation overlap attacks (RFC 5722)

## Sources Consulted
- Wireshark IPv6 display filter reference: https://www.wireshark.org/docs/dfref/i/ipv6.html
- Wireshark source (`epan/dissectors/packet-ipv6.c`) for offset-field unit semantics
- RFC 8200 (IPv6 Specification), Section 4.5 — source-only fragmentation, reassembly keying
- RFC 4443 (ICMPv6), Section 2.1 / 3.2 — type 2 Packet Too Big
- RFC 8201 — IPv6 Path MTU Discovery
- RFC 5722 — Handling of Overlapping IPv6 Fragments
- RFC 4213 / RFC 2473 — IPv6 encapsulation over IPv4 (protocol 41)
- IANA Assigned Internet Protocol Numbers registry

## Issues Found
1. **Table row on "Duplicate fragment IDs" was technically incorrect.** The original claimed `Same ipv6.fraghdr.ident from different sources` = `Fragmentation overlap attack`. This is wrong: IPv6 reassembly is keyed on {source, destination, identification} per RFC 8200 §4.5, so identical identifiers from different sources are expected and benign. Fragment overlap attacks (RFC 5722) require the *same* src/dst/ident pair with overlapping offsets.
   - **Fix:** Changed the indicator to `Same ipv6.fraghdr.ident from the same source/dest pair with overlapping offsets` and cited RFC 5722.

## Review Notes
- All Wireshark display filter field names (`ipv6.fraghdr`, `ipv6.fraghdr.offset`, `ipv6.fraghdr.more`, `ipv6.fraghdr.ident`) are correct and match the current Wireshark dfref.
- `ipv6.fraghdr.offset` is displayed in *bytes* in Wireshark (the dissector masks the raw field and appends " (N bytes)"). This means the first-fragment filter `ipv6.fraghdr.offset == 0` works as shown, and the post's offset comparisons are consistent with byte-level semantics.
- The "overlapping fragments" filter at the bottom (`ipv6.fraghdr.offset < 8 && ipv6.fraghdr.more == 1`) is not a reliable detector of overlap attacks — real detection requires cross-packet offset comparison. The post acknowledges this with "Hard to detect directly," so it was left intact as a rough hint.
- ICMPv6 type 2 = Packet Too Big, IP protocol 41 = IPv6 encapsulation, and gre display filter are all correct.
- The tshark + awk pipeline works as described (tshark emits empty strings for packets lacking the field, which awk's `NF==0` catches).
