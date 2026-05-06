# Validation Summary: How to Configure DNS64 with BIND

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- BIND 9
- DNS64
- NAT64
- IPv6
- DNSSEC
- `dig`
- `named-checkconf`
- `rndc`

## Sources Consulted
- ISC BIND 9 Configuration Reference: `dns64`, `clients`, `mapped`, `exclude`, `recursive-only`, `break-dnssec`, and `ipv4only-enable` semantics: https://bind9.readthedocs.io/en/v9.21.9/reference.html
- ISC BIND 9 Administrator Reference Manual: `named-checkconf` and `rndc` command syntax: https://bind9.readthedocs.io/_/downloads/en/v9_18_0/pdf/
- RFC 6147, DNS64 behavior and DNSSEC interaction: https://www.rfc-editor.org/rfc/rfc6147
- RFC 7050, `ipv4only.arpa` as the well-known IPv4-only discovery name for DNS64/NAT64: https://www.rfc-editor.org/rfc/rfc7050
- RFC 8880, special-use definition of `ipv4only.arpa`: https://www.rfc-editor.org/rfc/rfc8880.html
- Local `dig -h` output in the review environment to confirm `dig` flag usage, including `+dnssec`
- Local `dig` lookups run during review to confirm that `example.com` currently has native AAAA records and is no longer a valid DNS64 synthesis example

## Issues Found
- The post described `exclude` as an IPv4 filter for addresses that should never be synthesized. In BIND, `exclude` applies to existing IPv6 AAAA addresses that should be ignored if present, while IPv4 filtering belongs in `mapped`. I corrected both the explanation and the config examples.
- The post claimed `recursive-only` defaults to `yes`. Current ISC BIND documentation shows the default is `no`. I changed the wording so the example remains correct without stating the wrong default.
- Several example IPv6 prefixes were syntactically invalid because they used non-hex text such as `ipv6only`, `nat64a`, and `subnet-a` inside IPv6 literals. I replaced them with valid documentation prefixes.
- The DNS64 test used `example.com` as an A-only domain and showed a synthesized AAAA example for it. `example.com` currently has native AAAA records, so BIND would not synthesize an AAAA answer for it. I replaced this with `ipv4only.arpa`, the standards-defined IPv4-only DNS64/NAT64 discovery name, and updated the expected synthesized AAAA output accordingly.
- The DNSSEC section overstated the condition for synthesis suppression. BIND’s default behavior depends on DNSSEC-related query handling, especially when the client sets the DO bit and signed data is involved. I updated the explanation to match BIND’s documented `break-dnssec` behavior and made the test command explicitly a placeholder for a real signed A-only domain.
- The reload section only showed `named-checkconf /etc/named.conf`, even though the article earlier referenced Debian/Ubuntu layouts. I added the Debian/Ubuntu top-level config path `/etc/bind/named.conf`.
- The logging section said query logging would “see DNS64 activity”. The provided logging snippet logs query traffic, not a dedicated DNS64 category. I narrowed the wording to “inspect DNS64-related queries”.

## Review Notes
- `named-checkconf` and `rndc` are not installed in this review workspace, so I validated their documented syntax against ISC’s manuals rather than executing them locally.
- Live external DNS examples can age over time. `ipv4only.arpa` is a better long-term DNS64 test target than arbitrary public domains because it is defined by RFCs specifically for DNS64/NAT64 discovery.
