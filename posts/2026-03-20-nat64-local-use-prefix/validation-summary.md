# Validation Summary: How to Understand the NAT64 Local-Use Prefix (64:ff9b:1::/48)

## Status
validated

## Post Type
Reference / Guide

## Technologies Covered
- IPv6 / NAT64 transition technology
- RFC 8215 (Local-Use IPv4/IPv6 Translation Prefix)
- RFC 6052 (IPv6 Addressing of IPv4/IPv6 Translators) — Well-Known Prefix
- DNS64 (Unbound, BIND)
- Jool (Linux NAT64 implementation)
- Python `ipaddress` module
- Linux IPv6 routing (`ip -6 route`)

## Sources Consulted
- RFC 8215 — "Local-Use IPv4/IPv6 Translation Prefix" (https://www.rfc-editor.org/rfc/rfc8215)
- RFC 6052 — "IPv6 Addressing of IPv4/IPv6 Translators" (https://www.rfc-editor.org/rfc/rfc6052)
- RFC 6147 — "DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers"
- Unbound official documentation — unbound.conf(5) manpage and https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html (DNS64 Module Options)
- BIND 9 ARM (Administrator Reference Manual) for `dns64` statement syntax
- Jool documentation — https://nicmx.github.io/Jool/ for NAT64 instance management commands
- Python `ipaddress` module documentation — verified IPv6Network construction and address embedding behavior locally

## Issues Found
- **Unbound DNS64 configuration syntax was wrong.** The post used a nested `dns64:` block with a `prefix:` sub-key, which Unbound does not support. The correct format is flat server options: `dns64-prefix:` placed under the `server:` clause (alongside `module-config:`). Fixed by replacing the invalid block with the proper flat-option syntax under `server:`.

## Review Notes
- The Python `ipaddress` example was verified locally — `embed_ipv4(gw1_prefix, "8.8.8.8")` correctly produces `64:ff9b:1:1::808:808` and the gw2 variant produces `64:ff9b:1:2::808:808`, matching the comments.
- The BIND `dns64 ... { ... };` statement syntax shown is correct per the BIND ARM. In a real `named.conf` it must appear inside an `options` or `view` block; the snippet shows just the directive itself, which is acceptable for a documentation excerpt.
- Jool 4.x command syntax (`jool instance add ... --netfilter --pool6 ...`, `jool -i <name> pool4 add --tcp ...`) is correct.
- The "Automatic synthesis" wording in the WKP row of the comparison table is slightly loose — DNS64 always requires the module to be enabled, but the WKP is the default prefix so no explicit prefix configuration is needed. Left as-is since the contrast with the local-use case is still substantively accurate.
- RFC 6052 §3.1 does state the WKP MUST NOT be used to translate non-global IPv4 addresses (which RFC1918 falls under), so the post's claim that the local-use prefix is needed for RFC1918 translation is correct.
