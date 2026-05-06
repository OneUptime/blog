# Validation Summary: How to Configure AAAA Records in Unbound

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Unbound
- DNS
- IPv6
- AAAA records
- Stub zones
- `dig`

## Sources Consulted
- Unbound `unbound.conf(5)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Unbound `unbound-control(8)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- Unbound `unbound-checkconf(8)` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-checkconf.html
- RFC 4291, IPv6 Addressing Architecture: https://www.rfc-editor.org/rfc/rfc4291
- RFC 8482, Providing Minimal-Sized Responses to DNS Queries That Have QTYPE=ANY: https://www.rfc-editor.org/rfc/rfc8482

## Issues Found
- The description and introductory terminology referred to Unbound as a "stub resolver" and described `stub-zone` as forwarding. Unbound’s official docs distinguish recursive resolution, forwarding, and stub zones; I corrected the wording to describe local authoritative data and stub zones accurately.
- The Method 2 example used invalid IPv6 literals (`2001:db8:corp::...`). IPv6 hextets must be hexadecimal, so I replaced them with valid documentation-prefix addresses.
- The Method 3 heading and explanation implied that `stub-zone` forwards queries. Per the Unbound docs, stub zones point Unbound at authoritative servers while Unbound still performs recursive processing, so I corrected the heading, prose, and example comment.
- The reload example implied `unbound-control reload` is always available. The official `unbound-control(8)` docs require remote control to be enabled and configured, so I clarified that condition in the command example.
- The testing section used `dig ANY` to verify both A and AAAA data. Because `ANY` responses are not a reliable validation method in modern DNS practice, I replaced that with explicit `A` and `AAAA` queries.
- The AAAA-suppression section incorrectly used `local-zone ... redirect` for a single host. `redirect` answers from zone-apex local data for the zone and its subdomains, which is not the right mechanism here. I changed the example to publish only an A record for the hostname, which yields `NOERROR` / `NODATA` for AAAA queries to that local name.

## Review Notes
- For unsigned private stub zones under a public suffix, some deployments may also need `domain-insecure:` or a local trust anchor depending on their DNSSEC design. The current post stays focused on basic AAAA serving, but this is a useful future caveat to document.
- A local runtime validation pass with `unbound-checkconf` was not possible in this environment because the Unbound CLI tools are not installed here.
