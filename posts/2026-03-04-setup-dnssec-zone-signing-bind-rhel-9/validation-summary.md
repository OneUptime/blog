# Validation Summary: How to Set Up DNSSEC Zone Signing with BIND on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux 9
- BIND 9
- DNSSEC
- `dnssec-keygen`
- `dnssec-signzone`
- `dnssec-dsfromkey`
- `dig`
- `named.conf`

## Sources Consulted
- Red Hat Enterprise Linux 9 documentation: Setting up and configuring a BIND DNS server, including DNSSEC zone signing: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/managing_networking_infrastructure_services/assembly_setting-up-and-configuring-a-bind-dns-server_networking-infrastructure-services
- BIND 9.16 Administrator Reference Manual, DNSSEC chapter: https://bind9.readthedocs.io/en/v9.16.39/dnssec.inc.html
- BIND 9.16 Administrator Reference Manual, `dnssec-keygen`, `dnssec-signzone`, `dnssec-dsfromkey`, and `dig` man pages: https://bind9.readthedocs.io/en/v9.16.38/manpages.html
- RFC 4033, DNS Security Introduction and Requirements: https://datatracker.ietf.org/doc/html/rfc4033
- RFC 4034, Resource Records for the DNS Security Extensions: https://datatracker.ietf.org/doc/html/rfc4034
- RFC 4035, Protocol Modifications for the DNS Security Extensions: https://datatracker.ietf.org/doc/html/rfc4035

## Issues Found
- The DNSSEC chain diagram implied that the child zone points to the DS record in the parent. Updated the diagram so the trust chain flows from the root trust anchor through parent DS records to the child zone DNSKEY and RRSIG records.
- The `dnssec-signzone` example used `-A` and described it as generating NSEC3 records for all sets. In BIND, `-A` sets NSEC3 opt-out and is intended only for very large zones with sparse secure delegations. Removed `-A`, changed the example to `-3 - -H 0`, and updated the flag descriptions to match current BIND guidance for NSEC3 without salt and without extra iterations.
- The manual signing section said the command produced `/var/named` outputs while using absolute zone paths from an unspecified working directory. Added `cd /var/named` before signing so `example.com.zone.signed` and `dsset-example.com.` are created where the later commands expect them.
- The first `named.conf` example mixed a pre-signed zone file with `auto-dnssec maintain` and `inline-signing yes`. Removed the automation directives from the manual signed-zone configuration and clarified that pre-signed zones must be re-signed after changes.
- The testing section told readers to look for the `ad` flag in a local authoritative response. Clarified that a plain authoritative-only response should be checked for RRSIG records, while the `ad` flag is set by a validating resolver.
- The external validation command used `+cd`, which sets the checking-disabled bit and is not appropriate for checking successful DNSSEC validation. Removed `+cd`, queried an A record explicitly, and clarified that `ad` should appear only after DS publication and propagation.

## Review Notes
- RHEL 9 and current BIND documentation recommend `dnssec-policy default;` with `inline-signing yes;` for most automated DNSSEC deployments. The post still includes a manual signing workflow and an `auto-dnssec maintain` workflow because both are supported, but a future revision could simplify the article around `dnssec-policy default;`.
