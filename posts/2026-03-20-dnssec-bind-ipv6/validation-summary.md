# Validation Summary: How to Configure DNSSEC with BIND for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- BIND 9
- DNS
- DNSSEC
- IPv6
- `dig`
- `rndc`

## Sources Consulted
- ISC BIND 9 DNSSEC Guide (9.16.25): https://bind9.readthedocs.io/en/v9.16.25/dnssec-guide.html
- ISC BIND 9 DNSSEC chapter (9.16.38): https://bind9.readthedocs.io/en/v9.16.38/dnssec.inc.html
- ISC BIND 9 Configuration Reference (9.16.43): https://bind9.readthedocs.io/en/v9.16.43/reference.html
- ISC BIND 9 Manual Pages (9.16.38): https://bind9.readthedocs.io/en/v9.16.38/manpages.html
- ISC BIND 9 Manual Pages (9.16.16): https://bind9.readthedocs.io/en/v9.16.16/manpages.html
- RFC 4035, Protocol Modifications for the DNS Security Extensions: https://www.rfc-editor.org/rfc/rfc4035.html

## Issues Found
- The post mixed two different DNSSEC management models. It used `dnssec-policy default` for automatic signing, but also told readers to generate KSK/ZSK files manually with `dnssec-keygen`. I removed the manual key-generation commands and replaced them with an explanation that `dnssec-policy default` causes `named` to generate and manage the signing keys automatically.
- The BIND `options` example included `allow-recursion` and `dnssec-validation auto;` as if they were part of authoritative DNSSEC signing. They are not required to sign and serve a DNSSEC zone, and the `AD` flag is relevant to validating recursive resolvers rather than authoritative answers. I removed those lines from the authoritative-listener example.
- The verification section used an invalid `dig` example: `dig RRSIG AAAA www.example.com @2001:db8:1::1`. I replaced the verification commands so they now correctly check for DNSSEC data on the authoritative AAAA response, explain when the `AD` flag is expected, and verify DS visibility through a resolver after publication in the parent zone.
- The zone-file example was marked as a `bash` code block even though it is DNS zone-file syntax. I corrected the fence to `text`.

## Review Notes
- BIND's built-in `dnssec-policy default` is valid for this guide, but ISC notes that the built-in default policy may change across releases. If you need fixed algorithm and rollover behavior across upgrades, define an explicit custom `dnssec-policy`.
