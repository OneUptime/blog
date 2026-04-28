# Validation Summary: How to Understand the NAT64 Local-Use Prefix (64:ff9b:1::/48) - 64ff9b1

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- NAT64 (RFC 6146)
- IPv6 addressing (RFC 4291)
- Well-known NAT64 prefix `64:ff9b::/96` (RFC 6052)
- Local-use NAT64 prefix `64:ff9b:1::/48` (RFC 8215)
- DNS64 (RFC 6147) — BIND configuration
- Jool (Linux NAT64/SIIT implementation)
- Python `ipaddress` standard library
- Linux `ip6tables` and `ip -6 route`

## Sources Consulted
- RFC 8215 — Local-Use IPv4/IPv6 Translation Prefix: https://www.rfc-editor.org/rfc/rfc8215
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 6147 — DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers: https://www.rfc-editor.org/rfc/rfc6147
- IANA IPv6 Special-Purpose Address Registry: https://www.iana.org/assignments/iana-ipv6-special-registry/iana-ipv6-special-registry.xhtml
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- Jool documentation — `global` flags: https://nicmx.github.io/Jool/en/usr-flags-global.html
- BIND 9 ARM — `dns64` clause: https://bind9.readthedocs.io/

## Issues Found
1. **Invalid IPv6 literal `2001:db8:clients::/48`** in the BIND `dns64` `clients` ACL. Characters `l`, `i`, `n`, `t`, `s` are not valid hexadecimal digits, so this would fail to parse in a real BIND config. Replaced with `2001:db8:cafe::/48` (valid hex, still in the documentation prefix `2001:db8::/32`).
2. **Invalid IPv6 literal `2001:db8::nat64-gw`** in the `ip -6 route add ... via ...` command. `n`, `g`, `w`, and the hyphen are not valid in an IPv6 address segment, so the command as written would error out. Replaced with `2001:db8::1` (valid documentation address).
3. **Incorrect capacity claim** — the post said `64:ff9b:1::/48` can host "up to 65536 /96 deployments". The /48-to-/96 subnet field is 48 bits, so the correct upper bound is 2^48 /96 deployments, not 65,536 (which would be the count for only one 16-bit hextet). Updated the comment to read "up to 2^48 /96 deployments".

## Review Notes
- Verified the Python synthesis function with `python3` — outputs `64:ff9b:1::808:808` and `64:ff9b:1:1::808:808` exactly as the post claims.
- The Python helper takes a `subnet` integer and formats it with `{subnet:x}` into a single hextet, so it implicitly limits callers to subnet < 0x10000. This is fine for the example but worth noting if a reader wants to use larger subnet IDs — they would need to format across multiple hextets.
- The IANA registry classifies `64:ff9b::/96` with "Globally Reachable: True" (since it represents global IPv4 addresses) and `64:ff9b:1::/48` with "Globally Reachable: False". The post's table says "Globally routable: No" for both. This is defensible because RFC 6052 §3.1 states packets with the well-known prefix must not be forwarded across the public Internet without precautions, and operators commonly do not advertise either prefix in BGP. Left as-is since the wording is consistent with common operational guidance.
- Jool's `jool global update pool6 <prefix>` syntax is valid for Jool 4.x. The post's note about a single `pool6` per instance matches Jool's design.
- `ip6tables -A FORWARD -d <prefix> -o <iface> -j DROP` is correct ip6tables syntax; the interface name `eth0-external` is a placeholder but is a syntactically valid Linux interface name.
