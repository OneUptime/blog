# Validation Summary: How to Set Up a Recursive DNS64 Resolver with Unbound

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Unbound recursive resolver
- DNS64
- NAT64
- IPv6
- DNSSEC
- BIND DNS tools (`dig`, `host`)
- curl DNS server override option

## Sources Consulted
- NLnet Labs Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs Unbound `unbound-checkconf(8)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-checkconf.html
- NLnet Labs Unbound `unbound-anchor(8)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- NLnet Labs Unbound `unbound-control(8)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- NLnet Labs Unbound DNS64 README: https://github.com/NLnetLabs/unbound/blob/master/doc/README.DNS64
- RFC 6147, DNS64: https://www.rfc-editor.org/rfc/rfc6147
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 7050, Pref64 discovery and `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, special-use domain `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880
- ISC BIND 9 manual pages for `dig` and `host`: https://downloads.isc.org/isc/bind9/9.20.11/doc/arm/html/manpages.html
- curl `--dns-servers` documentation: https://curl.se/docs/manpage.html
- libcurl `CURLOPT_DNS_SERVERS` documentation: https://curl.se/libcurl/c/CURLOPT_DNS_SERVERS.html
- c-ares server-list format documentation: https://c-ares.org/docs/ares_set_servers_csv.html

## Issues Found
- The Unbound DNS64 configuration used an invalid `dns64:` block with `prefix:`. Changed it to `dns64-prefix:` inside the `server:` block, as documented by NLnet Labs.
- `module-config` was outside the `server:` block in the main snippet. Moved it under `server:` to match Unbound configuration syntax.
- The access-control example allowed `::/0` and `0.0.0.0/0`, creating an open recursive resolver. Replaced those with localhost and placeholder client networks, with a note to use the real client prefixes.
- The private IPv4 guidance used reverse `in-addr.arpa` local zones, which do not prevent DNS64 synthesis from forward A records. Replaced it with `private-address` guidance and notes about internal names and network-specific prefixes.
- The test domain `ipv4only.example.com` is not a valid well-known A-only test name. Replaced it with `ipv4.google.com` and kept `ipv4only.arpa` for the standards-defined NAT64 discovery test.
- The expected `ipv4only.arpa` synthesized address was wrong. Updated it to the RFC-defined A records, 192.0.0.170 and 192.0.0.171, synthesized as `64:ff9b::c000:aa` and `64:ff9b::c000:ab`.
- The DNSSEC section incorrectly implied validation should be disabled for DNS64. Updated it to keep validation enabled and explain that Unbound validates underlying DNS data before synthesis.
- The curl integration test omitted the documented c-ares requirement for `--dns-servers`. Added the caveat and used bracketed IPv6 syntax to keep the server-list format unambiguous.
- The monitoring section claimed DNS64-specific `unbound-control` stats. Replaced it with generic query/answer stats and algorithm-level verbosity for temporary DNS64 logging.
- The verbosity example used level 3 for DNS64 synthesis logs. Updated it to level 4, which Unbound documents as algorithm-level logging.

## Review Notes
The local environment had `dig`, `host`, and `curl`, but did not have `unbound-checkconf`, so Unbound configuration syntax was verified against NLnet Labs documentation and source references rather than a local parser. The post is now technically valid as a guide, but users still need to replace documentation prefixes with real routed client and NAT64 prefixes.
