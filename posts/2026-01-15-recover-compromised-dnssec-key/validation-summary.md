# Validation Summary: How to Recover from a Compromised DNSSEC Key

## Status
validated

## Post Type
Technical incident response guide

## Technologies Covered
- DNSSEC
- BIND 9 DNSSEC tools (`dig`, `delv`, `dnssec-keygen`, `dnssec-dsfromkey`, `dnssec-signzone`, `dnssec-settime`)
- DNSSEC KSK, ZSK, CSK, DS, DNSKEY, and RRSIG records
- RFC 5011 trust anchor revocation
- DNSSEC key rollover procedures
- Cloudflare DNSSEC API
- AWS Route 53 Domains DNSSEC CLI
- DNSViz
- Verisign DNSSEC Debugger
- PKCS#11 / HSM-backed DNSSEC key storage

## Sources Consulted
- BIND 9 manual pages: https://bind9.readthedocs.io/en/stable/manpages.html
- BIND 9 configuration reference for `dnssec-policy` and `key-store`: https://bind9.readthedocs.io/en/stable/reference.html
- ISC DNSSEC Key and Signing Policy knowledgebase: https://kb.isc.org/docs/dnssec-key-and-signing-policy
- RFC 6781, DNSSEC Operational Practices, Version 2: https://datatracker.ietf.org/doc/html/rfc6781
- RFC 7583, DNSSEC Key Rollover Timing Considerations: https://datatracker.ietf.org/doc/html/rfc7583
- RFC 5011, Automated Updates of DNSSEC Trust Anchors: https://datatracker.ietf.org/doc/html/rfc5011
- IANA DNSSEC Algorithm Numbers registry: https://www.iana.org/assignments/dns-sec-alg-numbers/dns-sec-alg-numbers.xhtml
- Cloudflare DNSSEC API reference: https://developers.cloudflare.com/api/resources/dns/subresources/dnssec/
- Cloudflare DNSSEC documentation: https://developers.cloudflare.com/dns/dnssec/
- AWS CLI `associate-delegation-signer-to-domain` reference: https://docs.aws.amazon.com/cli/latest/reference/route53domains/associate-delegation-signer-to-domain.html
- DNSViz project documentation: https://github.com/dnsviz/dnsviz
- Verisign DNSSEC Debugger: https://dnssec-debugger.verisignlabs.com/

## Issues Found
- The DNSKEY key-tag assessment snippet piped incomplete DNSKEY RDATA to `dnssec-dsfromkey`. Changed it to provide a complete DNSKEY record through standard input so the key tag can be calculated correctly.
- The evidence collection script queried `ANY`, which is often minimized or blocked and is unreliable for incident capture. Replaced it with explicit queries for relevant RR types.
- The RFC 5011 revocation section implied that DNSKEY revocation is a general KSK compromise response. Clarified that it applies to trust-anchor keys and does not replace parent-zone DS replacement for ordinary delegations.
- RRSIG expiration examples incorrectly read SOA data as if it contained signature expiration. Updated the examples to extract expiration from RRSIG records returned with `+dnssec`.
- One `dnssec-signzone` example used a shell line continuation followed by an inline comment, which would break the command. Moved the comment to a separate line.
- AD flag checks used broad `grep` matching that could produce false positives. Updated checks to inspect the `dig` flags line specifically.
- The Cloudflare example used an unsupported POST body for manually submitting a DS record through the zone DNSSEC endpoint. Replaced it with the current PATCH/GET DNSSEC status API pattern and clarified that DS values are submitted to the registrar when Cloudflare is not the registrar.
- The AWS Route 53 example used a non-existent `update-domain-nameservers-and-dnssec` command and DS digest fields. Replaced it with `route53domains associate-delegation-signer-to-domain` using DNSKEY signing attributes.
- The BIND HSM configuration nested `key-store` inside `dnssec-policy`, which does not match BIND's configuration grammar. Moved `key-store` to top-level scope and referenced it from `dnssec-policy`.
- The monitoring script used SOA output as an RRSIG expiration source. Updated it to query RRSIG data and parse the signature expiration field.

## Review Notes
The guide remains example-oriented and uses placeholder paths, domains, registrar workflows, and operational estimates. Operators should test these procedures in their own DNS provider and registrar environment before relying on them during an incident.
