# Validation Summary: How to Understand Mobile IPv6 Terminology

## Status
validated

## Post Type
Reference / Glossary guide

## Technologies Covered
- Mobile IPv6 (MIPv6) — RFC 6275
- IPv6 addressing (RFC 4291) and documentation prefix (RFC 3849)
- Neighbor Discovery Protocol (NDP) — RFC 4861
- SLAAC (RFC 4862) and DHCPv6 (RFC 8415) for CoA acquisition
- Mobile IPv4 (referenced for comparison) — RFC 5944

## Sources Consulted
- RFC 6275 — Mobility Support in IPv6: https://datatracker.ietf.org/doc/html/rfc6275
  - Section 5 (Overview of Mobile IPv6 — Home Address, CoA, Home Agent, CN)
  - Section 6.1.7 (Mobility Header — Binding Update flags A, H, L, K, M, R)
  - Section 6.1.8 (Binding Acknowledgement — Status codes; status 0 = "Binding Update accepted")
  - Section 6.1.7 / 5.1 (Lifetime expressed in time units of 4 seconds)
  - Section 5.5 (Sending sequence number monotonically increasing)
  - Section 10.4.1 (Movement Detection)
  - Section 5.2.5 / 11.6 (Return Routability procedure)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (2001:db8::/32): https://datatracker.ietf.org/doc/html/rfc3849
- RFC 4291 — IP Version 6 Addressing Architecture (hex digit syntax for hextets): https://datatracker.ietf.org/doc/html/rfc4291
- RFC 5944 — IP Mobility Support for IPv4 (Foreign Agent context): https://datatracker.ietf.org/doc/html/rfc5944

## Issues Found

1. **Invalid IPv6 address literals** — The post used `2001:db8:home::/64`, `2001:db8:home::100`, `2001:db8:foreign::/64`, and `2001:db8:foreign::50` in three code blocks. IPv6 hextets only allow hex digits 0–9 / a–f (RFC 4291), so the letters `h`, `o`, `m`, `r`, `g`, `n` are not legal. Replaced the home prefix with `2001:db8:1::/64` and the foreign prefix with `2001:db8:2::/64` (still inside the documentation range from RFC 3849), updating the example HoA and CoA accordingly.

2. **Incorrect K flag definition in the BU Message Fields block** — The post listed `K flag: request BA`, but per RFC 6275 §6.1.7 the K bit is the *Key Management Mobility Capability* flag. Requesting a Binding Acknowledgement is the function of the **A** (Acknowledge) bit, which the same list already names correctly. Reordered the flags to match the RFC layout (A, H, K) and corrected the K-flag description to "Key Management Mobility Capability".

3. **Same K vs. A flag confusion in the Python pseudo-code** — The `register()` example passed `k_flag=True, # Request acknowledgement`. Changed to `a_flag=True, # Request acknowledgement` so the comment matches the actual flag responsible for requesting a BA.

## Review Notes
- The Mermaid edge labels use literal `\n` for line breaks. Recent Mermaid versions render this correctly inside quoted edge labels, but `<br/>` is more universally supported. Not a technical inaccuracy, so left untouched.
- The pseudo-code is explicitly labeled as illustrative and is not tied to any real MIPv6 library API, so it is fine as written after the K→A flag fix.
- Status code 0 ("Binding Update accepted") is correct per RFC 6275 §6.1.8; granted lifetime may indeed be less than requested, as stated.
- The Lifetime "4-second units" wire-format note is accurate (RFC 6275 §6.1.7); the example "Lifetime: 600 seconds" in the binding entry is a human-readable rendering, which is fine.
- Foreign Agent characterization as primarily a MIPv4 concept (RFC 5944) is correct; MIPv6 has no Foreign Agent entity and the MN configures a co-located CoA.
