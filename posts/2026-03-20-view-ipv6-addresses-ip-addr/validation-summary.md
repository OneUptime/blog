# Validation Summary: How to View IPv6 Addresses with ip -6 addr

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- Linux `ip` command (iproute2 package)
- IPv6 addressing (RFC 4291)
- SLAAC (Stateless Address Autoconfiguration, RFC 4862)
- IPv6 Privacy/Temporary Addresses (RFC 4941 / RFC 8981)
- Duplicate Address Detection (DAD, RFC 4862 §5.4)
- Address scopes (global, link-local, site-local, host)

## Sources Consulted
- `ip-address(8)` manual page and `ip addr help` output from iproute2
- iproute2 source: valid FLAG-LIST values (`permanent | dynamic | secondary | primary | tentative | deprecated | dadfailed | temporary`)
- RFC 4291 (IP Version 6 Addressing Architecture) — address format uses hexadecimal digits 0-9, a-f
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation) — `2001:db8::/32`
- RFC 4862 (IPv6 Stateless Address Autoconfiguration) — DAD and tentative state behavior
- RFC 4193 / RFC 3879 — deprecation of site-local scope

## Issues Found
Three IPv6 literal addresses in the post used characters that are not valid hexadecimal digits. IPv6 addresses are restricted to 0-9 and a-f per RFC 4291. The following were corrected:

1. `2001:db8::9a37:bcff:fexx:xxxx/64` → `2001:db8::9a37:bcff:fe12:3456/64` — `x` is not a valid hex digit.
2. `2001:db8::old/64` → `2001:db8::dead/64` — `o` and `l` are not valid hex digits; replaced with a valid all-hex literal.
3. `2001:db8::new/64` (used in the `ip -6 addr add` command) → `2001:db8::abcd/64` — `n` and `w` are not valid hex digits; the original would have been rejected by the kernel as a malformed address, so a valid literal was substituted so the command example actually works.

All substitutions stay inside the RFC 3849 documentation prefix (`2001:db8::/32`) so the examples remain safe for publication.

## Review Notes
- All `ip -6 addr show` flags used in the post (`scope global|link|site|host`, `dynamic`, `permanent`, `deprecated`, `tentative`) are valid per the iproute2 `ip address` help output.
- `ip -j -6 addr show | python3 -m json.tool` is correct; `-j` emits JSON.
- `ip -6 monitor addr` is a valid command for watching address changes.
- Minor semantic note (not changed): the sample temporary SLAAC address in "Understanding Address Lifetimes" uses the `bcff:fe` EUI-64 middle pattern. Real RFC 4941/8981 temporary addresses use randomized interface identifiers rather than EUI-64 derivation, so in practice a `temporary dynamic` address would not contain `ff:fe`. The example is kept as-is since it is illustrative of the output format and the distinction is a secondary point for this post.
- Minor style note (not changed): `grep 'scope global' | grep -v 'fe80'` in the "Monitoring Address Changes" section is slightly redundant, since `fe80::/10` link-local addresses always show `scope link`, never `scope global`. Harmless, so left intact.
- Output format (interface line, `inet6 … scope …`, `valid_lft … preferred_lft …`) matches current iproute2 behavior.
