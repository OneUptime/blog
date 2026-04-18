# Validation Summary: How to Understand IPv6 Global Unicast Addresses (2000::/3)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 addressing (RFC 4291)
- Global Unicast Addresses (2000::/3)
- Unique Local Addresses (fc00::/7, fd00::/8)
- SLAAC (Stateless Address Autoconfiguration, RFC 4862)
- EUI-64 interface identifier derivation
- Privacy Extensions for SLAAC (RFC 4941 / RFC 8981)
- Linux `ip -6` command (iproute2)
- Python `ipaddress` module
- Documentation prefix (2001:db8::/32, RFC 3849)

## Sources Consulted
- RFC 4291 — IP Version 6 Addressing Architecture (https://datatracker.ietf.org/doc/html/rfc4291)
- RFC 3587 — IPv6 Global Unicast Address Format (https://datatracker.ietf.org/doc/html/rfc3587)
- RFC 4193 — Unique Local IPv6 Unicast Addresses (https://datatracker.ietf.org/doc/html/rfc4193)
- RFC 4862 — IPv6 Stateless Address Autoconfiguration (https://datatracker.ietf.org/doc/html/rfc4862)
- RFC 4941 — Privacy Extensions for SLAAC (obsoleted by RFC 8981) (https://datatracker.ietf.org/doc/html/rfc4941)
- RFC 8981 — Temporary Address Extensions for SLAAC in IPv6 (https://datatracker.ietf.org/doc/html/rfc8981)
- RFC 3849 — IPv6 Address Prefix Reserved for Documentation (https://datatracker.ietf.org/doc/html/rfc3849)
- RFC 6177 — IPv6 Address Assignment to End Sites (https://datatracker.ietf.org/doc/html/rfc6177)
- IANA IPv6 Global Unicast Address Assignments (https://www.iana.org/assignments/ipv6-unicast-address-assignments/)
- Python `ipaddress` module documentation (https://docs.python.org/3/library/ipaddress.html)
- iproute2 `ip-address(8)` and `ip-route(8)` man pages

## Issues Found
- **Inconsistent subnet count** — The "Real-World GUA Allocation" block stated "65535 possible /64 subnets per /48", but the Python example in the "Subnetting a /48 Allocation" section correctly computes `2**(64-48)` = 65,536. Updated to "65,536 possible /64 subnets per /48" so both sections agree and the math is correct.

## Review Notes
- The EUI-64 example (MAC `00:1a:2b:3c:4d:5e` → Interface ID `021a:2bff:fe3c:4d5e`) is correct: `fffe` is inserted in the middle, and the U/L bit of the first octet is flipped (`00` → `02`), matching RFC 4291 Appendix A.
- The phrase "flip bit 6" refers to the U/L bit. Different sources use different bit-numbering conventions (LSB-0 vs MSB-0); the resulting value `02` is correct either way, so left as-is.
- RFC 4941 is correctly cited as the origin of privacy extensions, but it was obsoleted by RFC 8981 in February 2021. The general concept ("random interface ID") remains unchanged, so the reference is still accurate for teaching purposes — noting here for potential future update.
- `ping6` is deprecated in modern iputils (since ~2020) in favor of unified `ping`, but it is typically still available as a symlink or alias on common Linux distributions, so the command still works as shown.
- The example GUA `2001:0db8:1234:0001:0200:5eff:fe00:5234/64` uses the RFC 3849 documentation prefix (`2001:db8::/32`), which is appropriate.
- The IANA-to-RIR example mentions `2001::/16` and `2600::/12`. Both are valid IANA-allocated ranges (2001::/16 was the original production allocation; 2600::/12 is assigned to ARIN). Accurate.
- RFC 6177 has relaxed the strict /48-per-site recommendation from RFC 3177, but /48 remains the common, widely-taught assignment size for sites and is correct for a fundamentals post.
