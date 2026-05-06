# Validation Summary: How to Configure DNSSEC for IPv6 Zones

## Status
validated

## Post Type
Guide

## Technologies Covered
- BIND 9
- DNSSEC
- IPv6 forward and reverse DNS (`AAAA` and `ip6.arpa`)
- BIND DNSSEC utilities (`dnssec-keygen`, `dnssec-signzone`, `dnssec-dsfromkey`, `dig`, `delv`, `rndc`)

## Sources Consulted
- ISC BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- ISC BIND 9 DNSSEC Guide (9.16 branch details for `dnssec-policy` and `inline-signing`): https://bind9.readthedocs.io/en/v9.16.44/dnssec-guide.html
- ISC BIND 9 Manual Pages (`dnssec-signzone`, `dnssec-dsfromkey`, `delv`): https://bind9.readthedocs.io/en/v9.16.27/manpages.html
- ISC BIND 9 Manual Pages (`rndc dnssec`, `rndc signing`): https://bind9.readthedocs.io/en/v9.20.0/manpages.html
- ISC BIND 9 Release Notes (`auto-dnssec` removal): https://bind9.readthedocs.io/en/v9.19.24/notes.html
- ISC BIND 9 Release Notes (`dnssec-checkds` removal): https://bind9.readthedocs.io/en/v9.18.42/notes.html
- RFC 4034, Resource Records for the DNS Security Extensions: https://datatracker.ietf.org/doc/rfc4034/
- RFC 4035, Protocol Modifications for the DNS Security Extensions: https://datatracker.ietf.org/doc/rfc4035/
- Local `dig -h` and `delv -h` output from the installed BIND utilities

## Issues Found
- The automatic-signing example incorrectly combined `dnssec-policy` with `auto-dnssec maintain`. `auto-dnssec` has been removed from current BIND releases, so I removed it, kept `inline-signing yes`, and clarified that `dnssec-policy default` can generate and manage signing keys automatically.
- The manual `dnssec-signzone` example used `-3`/`-A` NSEC3 options without explanation and omitted the smart-signing flow needed to import DNSKEY records from the key directory. I replaced it with a working `dnssec-signzone -S -K ...` example.
- Multiple `dig` and `delv` examples used arguments in the wrong order. I corrected the command syntax to match BIND's documented CLI usage.
- The `delv @127.0.0.1` validation example implied full-chain validation against a local authoritative server. I changed it to validate through a recursive resolver after DS publication, which is the reliable workflow for end-to-end DNSSEC validation.
- The DS lookup example used the wrong `dig` argument order. I corrected it to `dig @parent-ns example.com DS`.
- The monitoring section used the removed `dnssec-checkds` utility and an incomplete `rndc dnssec -checkds` command. I replaced those with current `rndc dnssec -status` and `rndc signing -list` examples.
- The reverse-zone section also implied manual key generation was required with `dnssec-policy default`. I added a note clarifying that policy-driven signing can generate and manage the keys automatically there as well.

## Review Notes
- BIND's built-in `dnssec-policy default` typically manages signing keys for you and may use a combined signing key unless you define a custom policy with separate KSK and ZSK roles.
- Reverse DNS DNSSEC deployment can still depend on whether your upstream provider or RIR delegates the relevant `ip6.arpa` zone and supports DS publication for it.
