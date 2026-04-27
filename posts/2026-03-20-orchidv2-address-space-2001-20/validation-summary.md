# Validation Summary: How to Understand the ORCHIDv2 Address Space (2001:20::/28)

## Status
validated

## Post Type
Reference / Guide — explains the ORCHIDv2 IPv6 address space (2001:20::/28), its derivation under HIP, and how to detect/filter it.

## Technologies Covered
- IPv6 special-purpose addressing
- ORCHIDv2 (RFC 7343)
- Host Identity Protocol v2 (HIP, RFC 7401)
- Python `hashlib` and `ipaddress`
- `ip6tables` firewall rules

## Sources Consulted
- [RFC 7343 — An IPv6 Prefix for ORCHIDv2](https://www.rfc-editor.org/rfc/rfc7343.txt) — authoritative spec for the prefix, the `Prefix | OGA ID | Encode_96(Hash)` structure, and the "middle 96 bits" definition of `Encode_96`.
- [RFC 7401 — Host Identity Protocol Version 2 (HIPv2)](https://www.rfc-editor.org/rfc/rfc7401.txt) — §3.2 defines the HIP context ID `0xF0EFF02FBFF43D0FE7930C3C6E6174EA` and Appendix E defines OGA ID 3 = truncated SHA-1.
- [IANA IPv6 Special-Purpose Address Registry](https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml) — for the Source/Destination/Forwardable/Global/Reserved-by-Protocol values.

## Issues Found

1. **"updates RFC 4843" → "obsoletes RFC 4843".** RFC 7343's header line is `Obsoletes: 4843`. Fixed in the Key Properties table.
2. **Key Properties table values were inverted relative to the IANA registry.** The post claimed Source=False, Destination=False, Forwardable=No, Globally Reachable=No. The IANA registry actually lists all four as `True` for 2001:20::/28, with `Reserved-by-Protocol: False`. Updated the table to match IANA verbatim. (The prose explanation about non-routability is still consistent with RFC 7343 §3, which says routers *MAY* be configured not to forward — the IANA classification reflects that there is no protocol-level requirement to drop them.)
3. **Hash truncation was wrong.** The code took the rightmost 96 bits (`sha1[-12:]`). RFC 7343 §2 defines `Encode_96` as "extracting the **middle** 96-bit-long bitstring from the argument bitstring." For a 160-bit SHA-1 digest, that is bytes `[4:16]`. Fixed.
4. **The "4 unused bits" comment was wrong.** Those 4 bits are the OGA ID (ORCHID Generation Algorithm identifier), the central improvement ORCHIDv2 made over RFC 4843 to provide cryptographic algorithm agility. Rewrote the comments and added an explicit `OGA_ID_HIP_SHA1 = 3` constant; the function now sets the OGA ID field correctly rather than leaving it as `0` (which is reserved).
5. **The 28-bit prefix integer literal `0x20012000` was wrong.** That value, shifted left 96 bits, produces addresses starting with `2001:2000:…`, which is *not* in `2001:20::/28`. The correct 28-bit prefix value is `0x2001002` (since `2001:0020::` has top 32 bits `0x20010020` and the leftmost 28 bits are `0x2001002`). With the fix, generated addresses now correctly fall inside the `2001:20::/28` block (verified by running the code).
6. **Misleading comment "RFC 4843 used SHA1; ORCHIDv2 uses SHA1 for compatibility."** ORCHIDv2's whole point was to *add* algorithm agility via the OGA ID. RFC 7343 itself defines no fixed hash function — the hash is selected per Context ID/OGA ID. HIPv2 happens to define truncated SHA-1 for OGA ID 3, but it also defines SHA-256 and SHA-384. Rewrote the comment.
7. **The HIP context ID hex value `8b9dfb2e9b2a8d8e1d25d5b1a7ba56d6` was fabricated.** RFC 7401 §3.2 specifies `0xF0EFF02FBFF43D0FE7930C3C6E6174EA` as the (randomly generated) HIP context ID. Replaced.
8. **The reference "RFC 7343 §9.3" did not exist.** RFC 7343 only goes up to §6 (IANA Considerations) and the document explicitly says "This document defines no specific value" for the Context ID. The HIP-specific context ID lives in RFC 7401 §3.2. Updated the comment label and corrected the reference.

## Review Notes

- The `is_orchid("2001:2::/48")` test case parses a CIDR through `IPv6Address(...)`, which raises `ValueError` and returns `False` via the `except` branch. The "False (benchmarking)" label is somewhat misleading because the function never actually performs a membership check — it fails parsing. This is a minor stylistic issue, not a technical error, so left as-is per the "fix only what is wrong" guidance.
- The `import struct` line is unused but was already in the original; left as-is to avoid scope creep.
- The `fake_public_key` is a placeholder string for illustration; in practice the input would be the canonical Host Identity public-key encoding from RFC 7401. The post is up-front that it is "Simulate a host public key," so this is fine.
- The conclusion advises filtering ORCHIDs at boundaries with `ip6tables`. This aligns with RFC 7343 §3 ("routers MAY be configured not to forward"), even though the IANA registry technically marks them as `Forwardable: True`. The firewall rules are syntactically correct.
