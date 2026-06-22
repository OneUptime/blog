# Validation Summary: How to Configure Unbound as a DNSSEC-Validating Resolver

## Status
validated

## Post Type
Technical tutorial / infrastructure guide

## Technologies Covered
- DNSSEC
- Unbound recursive resolver
- unbound-anchor
- unbound-control
- Linux systemd
- DNS-over-TLS forwarding
- Prometheus-style shell metrics

## Sources Consulted
- NLnet Labs Unbound `unbound.conf(5)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs Unbound `unbound-control(8)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- NLnet Labs Unbound `unbound-anchor(8)` manual: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-anchor.html
- NLnet Labs "Howto enable DNSSEC": https://nlnetlabs.nl/documentation/unbound/howto-anchor/
- IANA DNSSEC Trust Anchors and Rollovers: https://www.iana.org/dnssec/files
- RFC 4033, DNS Security Introduction and Requirements: https://datatracker.ietf.org/doc/html/rfc4033
- RFC 5155, DNSSEC Hashed Authenticated Denial of Existence: https://datatracker.ietf.org/doc/html/rfc5155
- Internet Society DNSSEC test sites list: https://www.internetsociety.org/resources/deploy360/2013/dnssec-test-sites/
- Verisign Labs DNSSEC debugger for dnssec-failed.org: https://dnssec-debugger.verisignlabs.com/dnssec-failed.org
- Cloudflare DNS-over-TLS endpoint behavior verified via DNS queries to 1.1.1.1 and 1.0.0.1 using `cloudflare-dns.com`

## Issues Found
- The introduction said DNSSEC signs "DNS records" and implied all responses are verified. DNSSEC signs RRsets and provides origin authentication, data integrity, and authenticated denial of existence for signed data. Updated the wording to avoid overstating coverage for unsigned zones.
- The attack table presented zone enumeration as something DNSSEC protects against at the resolver level. DNSSEC with NSEC can expose zone contents, while NSEC3 can make enumeration harder for zones that use it. Updated the row to clarify that this is not a resolver-side DNSSEC protection.
- The trust-anchor initialization command ran `unbound-anchor` via plain `sudo`. NLnet Labs recommends running it as the Unbound daemon user when using `auto-trust-anchor-file`, so ownership and RFC 5011 write permissions work correctly. Updated the initialization and quick-reference commands to use `sudo -u unbound`.

## Review Notes
The Unbound configuration directives, remote-control setup, DNS-over-TLS forwarding syntax, rate-limit options, `unbound-control` commands, and DNSSEC failure test are consistent with current documentation. The KSK-2024 wording is current as of 2026-06-22: IANA lists KSK-2024 in pre-publication, with rollover scheduled for 2026-10-11.
