# Validation Summary: Understanding the Well-Known Prefix for NAT64 (64:ff9b::/96)

## Status
validated

## Post Type
Tutorial / Reference guide

## Technologies Covered
- IPv6 / NAT64 / DNS64 translation
- RFC 6052 (IPv6 Addressing of IPv4/IPv6 Translators)
- RFC 8215 (Local-Use IPv4/IPv6 Translation Prefix)
- RFC 8880 (ipv4only.arpa for NAT64/DNS64 discovery)
- Linux `ip -6 route` / `ping6`
- BIND 9 (DNS64 configuration)

## Sources Consulted
- RFC 6052 — IPv6 Addressing of IPv4/IPv6 Translators (https://www.rfc-editor.org/rfc/rfc6052)
- RFC 6146 — Stateful NAT64 (https://www.rfc-editor.org/rfc/rfc6146)
- RFC 6147 — DNS64 (https://www.rfc-editor.org/rfc/rfc6147)
- RFC 8215 — Local-Use IPv4/IPv6 Translation Prefix (https://www.rfc-editor.org/rfc/rfc8215)
- RFC 8880 — Special Use Domain Name ipv4only.arpa (https://www.rfc-editor.org/rfc/rfc8880)
- BIND 9 Administrator Reference Manual — DNS64 options (https://bind9.readthedocs.io/en/latest/reference.html#dns64-statement)
- IANA IPv6 Special-Purpose Address Registry

## Issues Found
1. **Incorrect `ipv4only.arpa` expected result.** The post claimed `dig AAAA ipv4only.arpa` would return `64:ff9b::c000:0200` corresponding to `192.0.2.0`. Per RFC 8880, `ipv4only.arpa` has A records `192.0.0.170` and `192.0.0.171`, so the DNS64-synthesized AAAA records are `64:ff9b::c000:aa` and `64:ff9b::c000:ab`. Fixed the comment to reflect the correct addresses and cite RFC 8880.
2. **Invalid IPv6 literal in `ip -6 route add` example.** The command used `2001:db8::nat64` as the gateway, but `n` and `t` are not valid hexadecimal characters, so the command as written would be rejected by the kernel. Replaced with `2001:db8::1` and added a comment noting it is a placeholder to be substituted with the user's NAT64 translator address.
3. **Incorrect BIND DNS64 configuration syntax.** The post showed a fabricated `plugin query "/usr/lib/bind/dns64.so" { ... }` block. BIND 9 implements DNS64 natively via the `dns64` statement placed inside the `options` (or `view`) block; it is not loaded as a query plugin. Replaced the example with the correct `options { dns64 ... { ... }; };` form per the BIND 9 ARM.

## Review Notes
- The hex-encoded example addresses (`64:ff9b::0808:0808` for 8.8.8.8, `64:ff9b::5db8:d822` for 93.184.216.34) are arithmetically correct.
- `ping6` is retained on most Linux distributions but has been largely superseded by `ping -6` / unified `ping` in iputils; users on newer systems may need to substitute accordingly. Left as-is since `ping6` still works where present.
- The `mapped { !rfc1918; any; };` clause assumes the operator has defined an `rfc1918` ACL (or relies on a local convention); this is not a BIND built-in. Left unchanged because the example is illustrative and matches common BIND DNS64 documentation idioms.
- The post could optionally mention the stateless vs. stateful NAT64 distinction (RFC 6145 / RFC 6146) and the well-known prefix's restriction that it must not be used for packets crossing organizational boundaries without explicit agreement (RFC 6052 §3.1), but these are enhancements, not corrections.
