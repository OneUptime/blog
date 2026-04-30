# Validation Summary: How to Use the Node.js dns Module with IPv6

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Node.js `dns` module
- Node.js `dns/promises` API
- IPv6 DNS records (`AAAA`, `PTR`, `SRV`)
- DNS resolution order and custom resolvers

## Sources Consulted
- Node.js DNS API documentation: https://nodejs.org/api/dns.html
- Node.js v16.17.1 DNS documentation for pre-Node-17 default ordering behavior: https://r2.nodejs.org/docs/v16.17.1/api/dns.html
- RFC 3596, DNS Extensions to Support IP Version 6: https://datatracker.ietf.org/doc/html/rfc3596
- Google Public DNS setup and IPv6 resolver addresses: https://developers.google.com/speed/public-dns/docs/using
- Quad9 service addresses and IPv6 resolver addresses: https://quad9.net/service/service-addresses-and-features

## Issues Found
- The `lookupAny()` example name and comment implied a mixed-family lookup, but the code uses `dns.lookup(..., { family: 6 })`, which restricts results to IPv6 and uses the operating system resolver. I renamed it to `lookupIPv6()` and corrected the explanation to match the Node.js docs.
- The resolution-order explanation said `'verbatim'` preserved “DNS order”. `dns.lookup()` does not necessarily use the DNS protocol; it uses the operating system resolver. I changed the wording to “resolver-returned order” for accuracy.
- The custom resolver example labeled `2620:fe::fe` as Hurricane Electric DNS. That address belongs to Quad9. I corrected the provider label while keeping the example on valid public IPv6 resolvers.
- The post claimed IPv6 server addresses in `setServers()` must be bracketed. Node documents `setServers()` as taking RFC 5952-formatted addresses, and `getServers()` returns bare IPv6 literals unless a custom port is present. I corrected the conclusion to allow plain IPv6 literals and note bracketed form when a custom port is included, for example `[2001:db8::1]:1053`.
- The SRV example used `_http._tcp.example.com`, which currently returns no SRV records and does not demonstrate the section’s intended behavior. I changed the example to `_xmpp-server._tcp.jabber.org`, which resolves successfully at review time and has an IPv6 target.

## Review Notes
- The updated examples were spot-checked on local `node v22.22.0` on 2026-04-30 and the revised public hostnames resolved successfully during review.
- Current Node.js documentation also supports `ipv6first` in `dns.setDefaultResultOrder()`. The post still uses `'verbatim'`, which remains technically correct and matches the version note about the Node 17 default change.
