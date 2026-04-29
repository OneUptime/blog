# Validation Summary: How to Understand Mobile Prefix Discovery

## Status
validated

## Post Type
Tutorial / Reference Guide (networking protocol explainer with code examples)

## Technologies Covered
- Mobile IPv6 (RFC 6275)
- Mobile Prefix Discovery (MPS/MPA messages)
- ICMPv6 message types
- IPv6 prefix and address derivation (EUI-64, RFC 4291; stable privacy, RFC 7217)
- Python `ipaddress` module
- UMIP (`mip6d`) Linux Mobile IPv6 implementation
- `tcpdump` ICMPv6 capture filters

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6 (https://www.rfc-editor.org/rfc/rfc6275)
  - §6.8 "Mobile Prefix Solicitation Message Format" (Type 144)
  - §6.9 "Mobile Prefix Advertisement Message Format" (Type 145)
  - §10.6 "Sending Prefix Information to the Mobile Node"
  - §11.4.1 / §11.4.2 — Sending MPS / MPA
- RFC 4291 — IP Version 6 Addressing Architecture (Modified EUI-64 IIDs)
- RFC 7217 — Stable, Opaque IIDs with SLAAC
- RFC 4285 — Authentication Protocol for Mobile IPv6 (Mobility Message Authentication Option)
- IANA ICMPv6 type registry (Types 144 / 145 reserved for MPS / MPA)
- Python 3 `ipaddress` module documentation (verified rejection of non-hex IPv6 segments)
- UMIP project documentation (mip6d.conf format)

## Issues Found

1. **Wrong ICMPv6 message types for MPS/MPA.** The post claimed MPD "reuses ICMPv6 Router Solicitation and Advertisement messages" with types 133 and 134. Per RFC 6275 §6.8/§6.9 and IANA, Mobile Prefix Solicitation is ICMPv6 **Type 144** and Mobile Prefix Advertisement is **Type 145** — they are dedicated messages, not reused RS/RA. Fixed throughout the section "MPD Using ICMPv6 Messages".

2. **"Mobility Header option" claim was wrong.** MPS/MPA are ICMPv6 messages, not Mobility Header messages. The Mobility Header (RFC 6275 §6.1) is a separate IPv6 extension header used for Binding Updates etc. Removed this incorrect claim.

3. **`Source Link-Layer Address` option listed for MPS.** This is a Neighbor Discovery option used by RS/RA, not by the dedicated MPS message. Removed; replaced the option list with the actual fields (Identifier) and a more representative mobility option (Authentication Option per RFC 4285).

4. **`Acknowledgement ID` field name was wrong.** RFC 6275 §6.9 calls this the "Identifier" field (echoed from MPS). Fixed.

5. **Buggy EUI-64 code.** The original code produced 9 bytes (not 8) and applied the U/L-bit flip in the wrong position — the comment in the source even said "wrong position". Corrected to the standard modified EUI-64 layout: flip the U/L bit on `mac[0]`, then insert `0xFFFE` between OUI and NIC bytes. Verified the corrected code yields `a8bb:ccff:fedd:eeff` for `aa:bb:cc:dd:ee:ff`, the canonical result.

6. **`2001:db8:home::/64` is not a valid IPv6 prefix.** "h", "o", "m" are not hex digits; Python's `ipaddress` module rejects this with `AddressValueError`. The Python example would have crashed on the very first call. Replaced all occurrences with `2001:db8:1::/64`, which is valid documentation-range IPv6.

7. **`tcpdump` filter caught the wrong message types.** Using `icmp6[0] == 133 or icmp6[0] == 134` would capture RS/RA, not MPS/MPA. Updated to `144`/`145` so the filter actually captures MPD exchanges.

## Review Notes

- The high-level narrative frames MPD as a bootstrap mechanism for an MN with no configured Home Address. RFC 6275 §11.4.1 actually describes MPD primarily as a notification mechanism for prefix-configuration *changes*; the "boot without HoA" use case is more strictly the domain of MIPv6 Bootstrapping (RFC 5026 / 6611). The mechanics described are still correct, but this conflation is worth noting for future revisions.
- The MPA destination is the MN's home address (per RFC 6275 §11.4.2), which is then delivered via the bidirectional tunnel to the CoA. The original post said "Destination: CoA" directly; corrected to "MN home address (typically tunneled to CoA)" to be accurate.
- The UMIP `mip6d.conf` snippet uses simplified directives (`HomeAgent`, `Home` at top level). Real UMIP configs typically wrap these in a `MnHomeLink "iface" { ... }` block. The example is illustrative rather than copy-pasteable, but acceptable for explaining the static-vs-dynamic distinction; not changed.
- The `iid & 0xFEFFFFFFFFFFFFFF` mask clears the group bit of the first byte to ensure the random IID isn't a group/multicast IID. This is reasonable belt-and-suspenders safety, though strictly, IPv6 multicast is determined by the destination address (`ff00::/8`), not the IID.
