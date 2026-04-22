# Validation Summary: How to Set Up a Recursive DNS64 Resolver with BIND

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- DNS64
- BIND 9
- IPv6
- NAT64
- DNSSEC validation
- `dig`, `rndc`, `named-checkconf`, `systemctl`, `ping6`, and `curl`

## Sources Consulted
- BIND 9 Administrator Reference Manual, DNS64 configuration reference: https://bind9.readthedocs.io/en/v9.21.12/reference.html#namedconf-statement-dns64
- BIND 9 Administrator Reference Manual, `dnssec-validation` reference: https://bind9.readthedocs.io/en/v9.21.12/reference.html#namedconf-statement-dnssec-validation
- BIND 9 Administrator Reference Manual, `statistics-file` and statistics reference: https://bind9.readthedocs.io/en/v9.18.4/reference.html
- BIND 9 manual pages for `named-checkconf`, `dig`, and `rndc querylog`: https://bind9.readthedocs.io/en/v9.21.21/manpages.html and https://bind9.readthedocs.io/en/v9.18.42/manpages.html
- ISC Knowledge Base, Monitoring Recommendations for BIND 9: https://kb.isc.org/docs/monitoring-recommendations-for-bind-9
- RFC 6147, DNS64: DNS Extensions for Network Address Translation from IPv6 Clients to IPv4 Servers: https://www.rfc-editor.org/rfc/rfc6147
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 7050, Discovery of the IPv6 Prefix Used for IPv6 Address Synthesis: https://www.rfc-editor.org/rfc/rfc7050
- Google Public DNS DNS64 documentation and setup test guidance: https://developers.google.com/speed/public-dns/docs/dns64 and https://developers.google.com/speed/public-dns/docs/using

## Issues Found
- The first BIND configuration referenced `RFC1918` in `mapped { !RFC1918; any; };` before defining the ACL. Added the `RFC1918` ACL to make the snippet syntactically complete.
- The `exclude` comments incorrectly implied that the option is what prevents synthesis when any real AAAA exists. Updated the wording to match BIND's documented behavior: `exclude` ignores matching existing AAAA records so DNS64 synthesis can still be applied from A records.
- The `exclude` ACLs only listed `::ffff:0:0/96`. Updated them to include the DNS64 prefix in each example, matching the BIND documentation pattern for NAT64/v4-mapped exclusions.
- The custom prefix example used `2001:db8:client::/48`, which is not valid IPv6 syntax. Replaced it with valid documentation-prefix syntax: `2001:db8:100::/48`.
- The validation example used `ipv4only.example.com`, which is not a real RFC-defined DNS64 test name, and showed a synthesized address for `192.0.2.1`. Replaced it with `ipv4.google.com` for the A-only hostname example and kept `ipv4only.arpa` for the RFC 7050 test.
- The `ipv4only.arpa` expected output listed only `192.0.0.170`. Updated it to include both RFC 7050 discovery addresses, `192.0.0.170` and `192.0.0.171`, as synthesized `64:ff9b::c000:aa` and `64:ff9b::c000:ab`.
- The NAT64 integration `curl` example used nonexistent `ipv4only.example.com`. Replaced it with `ipv4.google.com`, which Google documents as an IPv4-only hostname URL for DNS64 testing.
- The monitoring example used `/var/cache/bind/named_stats.txt`; BIND documents the default statistics file as `named.stats` in the server's current directory. Updated the command to `/var/cache/bind/named.stats` and made the grep case-insensitive.
- The query-log monitoring example assumed `/var/log/named/queries.log` existed. Replaced it with the documented runtime control `rndc querylog on` and a systemd journal follow command consistent with the post's use of `systemctl`.

## Review Notes
The reviewed configuration is version-general for current BIND 9, but DNS64 behavior can interact with DNSSEC-aware clients: with BIND's default `break-dnssec no`, synthesis may not occur for some DNSSEC-signed responses when the client requests DNSSEC records. `named-checkconf` was not available in this workspace, so syntax was verified against the BIND ARM rather than by executing BIND locally.
