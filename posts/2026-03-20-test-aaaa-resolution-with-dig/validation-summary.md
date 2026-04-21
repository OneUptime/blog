# Validation Summary: How to Test AAAA Record Resolution with dig

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- DNS
- IPv6
- AAAA records
- PTR reverse DNS
- DNS64/NAT64
- DNSSEC
- `dig`
- Bash

## Sources Consulted
- ISC BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.18.39/manpages.html
- ISC BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/v9.18.39/dnssec-guide.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- RFC 2308, Negative Caching of DNS Queries: https://www.rfc-editor.org/rfc/rfc2308
- RFC 3849, IPv6 Documentation Address Prefix: https://datatracker.ietf.org/doc/html/rfc3849
- RFC 6052, IPv6 Addressing of IPv4/IPv6 Translators: https://www.rfc-editor.org/rfc/rfc6052
- RFC 6147, DNS64: https://datatracker.ietf.org/doc/html/rfc6147
- RFC 7050, NAT64 Prefix Discovery: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, Special Use Domain Name `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880
- Google Public DNS64 documentation: https://developers.google.com/speed/public-dns/docs/dns64

## Issues Found
- The sample `dig` output used `Thu Mar 20 2026`; March 20, 2026 is a Friday. Updated the weekday.
- The TTL example used `dig ... | grep AAAA`, which can also match the question section and is less reliable. Replaced it with `dig AAAA www.example.com +noall +answer`.
- The authoritative-query example used `@ns1.example.com`, which does not resolve and would fail. Replaced it with a lookup of an authoritative NS followed by a `+norecurse` query.
- The DNSSEC example described `+dnssec` as validation information. `dig +dnssec` requests DNSSEC records such as RRSIGs; validation status depends on the resolver. Updated the wording.
- The DNS64 section used `example.com` as an IPv4-only domain, but it has AAAA records. Replaced it with `ipv4only.arpa`, which is defined for NAT64/DNS64 discovery, and used Google Public DNS64 for a working example.
- The reverse PTR example implied that `2001:db8::1` would return `server1.example.com.`. `2001:db8::/32` is a documentation prefix, so the result is only possible if a PTR exists in an example environment. Updated the comment.
- The caching section claimed `+cd` disables DNSSEC cache and listed `+nocache`; `+cd` disables DNSSEC validation checking, and BIND `dig` does not support `+nocache`. Replaced those lines with an authoritative-server query and corrected the `+cd` explanation.
- The batch script was made safer by using `IFS= read -r`, quoting domain and server variables, skipping blank lines, and using `head -n 1`.
- The IPv6 transport note now reflects BIND `dig` behavior: UDP is the default for normal queries, with TCP retry on truncation.

## Review Notes
Some examples depend on external DNS reachability and IPv6 transport availability. The Google Public DNS64 example is appropriate for demonstrating DNS64 synthesis with `64:ff9b::/96`, but production NAT64 troubleshooting should use the DNS64 resolver and prefix for the target network.
