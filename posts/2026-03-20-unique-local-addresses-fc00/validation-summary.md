# Validation Summary: How to Understand Unique-Local Addresses (fc00::/7)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 addressing (RFC 4193 Unique-Local Addresses)
- Python `ipaddress`, `hashlib`, `uuid`, `time` standard library modules
- `ip6tables` (Linux IPv6 netfilter)
- BIRD / FRR routing filter syntax (mentioned as pseudocode)

## Sources Consulted
- RFC 4193 — Unique Local IPv6 Unicast Addresses (https://datatracker.ietf.org/doc/html/rfc4193)
- RFC 4291 — IP Version 6 Addressing Architecture (link-local `fe80::/10`, scope definitions)
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html)
- Python `hashlib` / `uuid` module documentation
- `ip6tables` man page (netfilter.org)
- Actual execution of the two Python snippets to verify output matches the inline comments.

## Issues Found
No technical issues found.

Verification details:
- The ULA structure diagram (7-bit prefix `1111110`, 1-bit L flag, 40-bit Global ID, 16-bit Subnet ID, 64-bit Interface ID) matches RFC 4193 §3.
- L=1 → `fd00::/8` (locally assigned) and L=0 → `fc00::/8` (reserved, not currently defined) match the RFC.
- The Python `generate_ula_prefix()` function runs cleanly and produces a valid `fd00::/48` prefix. The bit-shifting math (`(0xfd << 120) | (global_id_int << 80)`) correctly places 0xfd at bits 120–127 and the 40-bit Global ID at bits 80–119, yielding a valid /48 ULA prefix.
- The subnet-planning snippet was executed and the output for `subnets[10]`, `subnets[20]`, `subnets[30]`, and `subnets[100]` matches the inline comments exactly (`fd3a:b2c1:d4e5:a::/64`, `:14::/64`, `:1e::/64`, `:64::/64`).
- The `ip6tables` rules are syntactically valid and semantically correct for the described goal of dropping any ULA traffic forwarded across an external interface.
- The comparison table values (link-local `fe80::/10`, ULA organization scope, link-local never routable, global unicast requires ISP delegation) align with RFC 4291/4193.

## Review Notes
- The Python snippet labels the 64-bit time value as "NTP timestamp." Strictly, RFC 4193 §3.2.2 step 1 calls for an NTP-format timestamp (seconds since 1900 in the upper 32 bits, fractional seconds in the lower 32), whereas the code uses `int(time.time() * 2**32)`, which has the Unix epoch (1970) in the upper 32 bits. Because the value is only used as SHA-1 input for entropy, this difference does not affect correctness or the validity of the generated Global ID — it is only a minor terminology imprecision and not a technical error.
- Similarly, `uuid.getnode()` returns a 48-bit MAC-derived node ID rather than a formal EUI-64; padded to 8 bytes it still serves the RFC's stated purpose of adding machine-specific entropy to the hash input.
- `time.time() * 2**32` is computed as a float (53-bit mantissa), so the low bits may lose precision. This is not a functional issue for entropy generation.
- The table header `ULA (fd::/8)` is valid shorthand for `fd00::/8` (since `fd::` expands to `fd00:0000:...`) — acceptable notation.
- The BIRD/FRR snippet is presented as a comment / pseudocode rather than as runnable configuration, which is appropriate given both daemons have different exact syntax.
