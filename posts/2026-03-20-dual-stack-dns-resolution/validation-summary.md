# Validation Summary: How to Manage Dual-Stack DNS Resolution

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS
- Dual-stack networking
- IPv4
- IPv6
- AAAA and PTR records
- BIND 9
- Unbound
- Python `socket.getaddrinfo()`

## Sources Consulted
- RFC 6724, Default Address Selection for Internet Protocol Version 6 (IPv6): https://datatracker.ietf.org/doc/rfc6724/
- RFC 8305, Happy Eyeballs Version 2: Better Connectivity Using Concurrency: https://datatracker.ietf.org/doc/html/rfc8305
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/rfc3596/
- RFC 2308, Negative Caching of DNS Queries (DNS NCACHE): https://www.ietf.org/rfc/rfc2308.html
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://datatracker.ietf.org/doc/html/rfc8482
- BIND 9 Administrator Reference Manual, Configuration Reference: https://isc-projects.gitlab-pages.isc.org/bind9/reference.html
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Python `socket` library documentation: https://docs.python.org/3/library/socket.html

## Issues Found
- The IPv6 reverse zone origin under `ip6.arpa` was incorrect. It used the wrong nibble-reversed form for `2001:db8::/32`. This was corrected to `8.b.d.0.1.0.0.2.ip6.arpa.` per RFC 3596.
- The internal AAAA example used `2001:db8:int::10`, which is not a valid IPv6 literal because `int` is not hexadecimal. This was corrected to `2001:db8:1::10`.
- The address-selection section overstated RFC 6724 and RFC 8305 behavior by treating IPv6-first ordering and a 250 ms fallback as fixed outcomes. The wording was corrected to describe IPv6 preference and 250 ms as common or recommended behavior rather than universal behavior.
- The BIND `listen-on` example used `0.0.0.0` and `::` where the official documentation describes using address match lists such as `any;` for wildcard listeners. The snippet was corrected to `listen-on { any; };` and `listen-on-v6 { any; };`.
- The BIND comment on `allow-query` incorrectly implied it only affected AAAA lookups. It was corrected to describe ordinary queries generally, matching BIND documentation.
- The Unbound IPv6 listener used `interface: ::`, but the official example for listening on all IPv6 interfaces is `interface: ::0`. This was corrected.
- The DNS64 note had a typo and unclear wording. It was corrected to say DNS64 synthesizes AAAA records for IPv6-only clients reaching IPv4-only servers.
- The testing section suggested `dig ANY` as a way to query “both” records. That is technically unreliable because ANY responses may be minimized or incomplete under RFC 8482. The post was corrected to tell readers to query A and AAAA explicitly instead.
- The `getaddrinfo()` example was tightened to request TCP-compatible results with `proto=socket.IPPROTO_TCP`, which better matches common client behavior and Python’s documentation guidance.
- The negative-caching section was inaccurate. It used a command that would not actually inspect a negative response and implied the SOA MINIMUM field alone was the negative TTL. This was corrected to inspect a negative AAAA response and to explain that RFC 2308 uses the smaller of the SOA RR TTL and the SOA MINIMUM field.

## Review Notes
- The post uses documentation prefixes such as `2001:db8::/32` and `203.0.113.0/24`, which is appropriate for example content.
- BIND and Unbound both have defaults that already support dual-stack listening in some deployments, but the corrected examples remain valid and explicit.
- ANY query behavior varies across authoritative servers and resolvers; the updated post now avoids presenting it as a dependable way to retrieve all RRsets.
