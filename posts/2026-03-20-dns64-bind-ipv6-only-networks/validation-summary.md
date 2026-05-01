# Validation Summary: How to Configure DNS64 with BIND for IPv6-Only Networks

## Status
validated

## Post Type
Guide

## Technologies Covered
- BIND 9
- DNS64
- NAT64
- IPv6
- DNSSEC
- `dig`
- `ss`
- `systemd` (`systemctl`, `journalctl`)

## Sources Consulted
- ISC BIND 9 Administrator Reference Manual, configuration reference: https://bind9.readthedocs.io/en/v9.20.8/reference.html
- RFC 6147, DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://datatracker.ietf.org/doc/rfc6052/
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.pdf
- Google Public DNS official setup documentation, IPv6 resolver addresses: https://developers.google.com/speed/public-dns/docs/using
- Local CLI help output: `dig -h`
- Local CLI help output: `ss --help`
- Local CLI help output: `journalctl --help`

## Issues Found
- The conceptual DNS64 flow used `google.com`, which normally has real AAAA records and therefore is not a correct example of DNS64 synthesis. I replaced it with the RFC 6147 illustrative host `h2.example.com` with IPv4 address `192.0.2.1`.
- The `ipv4only.arpa` test expectation was incorrect. RFC 8880 defines `ipv4only.arpa` with A records `192.0.0.170` and `192.0.0.171`, so with the Well-Known Prefix `64:ff9b::/96` the synthesized AAAA answers are `64:ff9b::c000:aa` and `64:ff9b::c000:ab`.
- The `exclude` comment misdescribed BIND behavior. Per the ISC ARM, `exclude` ignores matching AAAA records if they already exist so DNS64 can still synthesize from A records; it does not mean "no synthesis for these because they have real AAAA".
- The `break-dnssec yes` explanation was too broad. I corrected it to describe the actual behavior from the ISC ARM: it enables synthesis when DNSSEC validation would otherwise prevent it.
- The commented `mapped` example used an undefined placeholder ACL, so it was not directly usable. I replaced it with a syntactically valid inline RFC1918 example.
- The forwarder examples used IPv4 addresses even though the post targets IPv6-only deployments. I replaced them with official Google Public DNS IPv6 resolver addresses so the example works in an IPv6-only environment.
- The client resolver example `2001:db8::dns64server` was not a valid IPv6 literal. I replaced it with a valid documentation address.
- The log-follow command only referenced the Debian/Ubuntu unit name. I updated it to include both `bind9` and `named`.

## Review Notes
- The post is technically correct after these fixes.
- Operationally, `allow-query { any; };` plus `recursion yes;` should only be used on trusted networks; otherwise this becomes an open recursive resolver.
- RFC 6052 forbids using the Well-Known Prefix `64:ff9b::/96` for non-global IPv4 addresses, which is broader than RFC1918 alone. The post's RFC1918 example is valid but not exhaustive.
- `named-checkconf` is not installed in this workspace, so I verified syntax and option semantics against the ISC ARM rather than by running BIND locally.
