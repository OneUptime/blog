# Validation Summary: How to Troubleshoot DNSSEC SERVFAIL Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- DNSSEC
- DNS resolution and validation
- BIND tools (`dig`, `delv`, `dnssec-dsfromkey`, `dnssec-keygen`, `dnssec-signzone`, `rndc`)
- ldns `drill`
- PowerDNS `pdnsutil`
- Unbound logging
- Prometheus and DNS monitoring
- tcpdump and tshark packet analysis

## Sources Consulted
- RFC 9364: DNS Security Extensions (DNSSEC): https://www.rfc-editor.org/rfc/rfc9364.html
- RFC 4034: Resource Records for the DNS Security Extensions: https://www.rfc-editor.org/rfc/rfc4034.html
- RFC 4035: Protocol Modifications for the DNS Security Extensions: https://datatracker.ietf.org/doc/html/rfc4035
- RFC 5155: DNSSEC Hashed Authenticated Denial of Existence: https://datatracker.ietf.org/doc/html/rfc5155
- RFC 7583: DNSSEC Key Rollover Timing Considerations: https://datatracker.ietf.org/doc/html/rfc7583
- RFC 9904: DNSSEC Cryptographic Algorithm Recommendation Update Process: https://www.rfc-editor.org/rfc/rfc9904.html
- IANA DNSSEC Algorithm Numbers registry: https://www.iana.org/assignments/dns-sec-alg-numbers/dns-sec-alg-numbers.xhtml
- BIND 9 manual pages and configuration reference: https://bind9.readthedocs.io/en/stable/manpages.html
- ISC DNSSEC Key and Signing Policy documentation: https://kb.isc.org/docs/dnssec-key-and-signing-policy
- PowerDNS `pdnsutil` documentation: https://doc.powerdns.com/authoritative/manpages/pdnsutil.1.html
- Unbound `unbound.conf` documentation: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- Prometheus Blackbox Exporter documentation: https://github.com/prometheus/blackbox_exporter
- Local BIND tool help/man pages for `dig` and `delv`

## Issues Found
- The post described `dig +dnssec +trace` as a validation trace. Updated the wording because `dig +dnssec` sets the DNSSEC OK bit and requests DNSSEC records; it does not validate responses itself.
- The initial SERVFAIL confirmation command implied local `dig +dnssec` performs DNSSEC validation. Updated it to query a validating resolver explicitly and clarified that `+cd` comparison should use the same resolver.
- The `delv` root trust anchor example used `+root=/etc/bind/bind.keys`, which is not the syntax for selecting a trust anchor file. Changed it to `delv -a /etc/bind/bind.keys example.com`.
- Several `dnssec-dsfromkey` examples piped `dig +short` output or unfiltered `dig` output. Updated them to pipe full answer-format DNSKEY records with `+noall +answer`, and made the KSK filter match the DNSKEY flags field precisely.
- The PowerDNS commands used pre-5.0 command names only and gave the secure/rectify order backward. Updated them to current `pdnsutil zone secure` followed by `pdnsutil zone rectify`, with a note about older aliases.
- The algorithm guidance still referenced RFC 8624 as current and labelled RSA/SHA-1 simply as deprecated. Updated the additional resource to RFC 9904 and adjusted algorithm comments to match current IANA/RFC 9904 signing recommendations.

## Review Notes
The post is technically relevant and broadly accurate after the fixes. Some examples remain intentionally generic because exact commands vary by DNS server configuration, registrar workflow, resolver choice, and distribution package versions.
