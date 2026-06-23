# Validation Summary: How to Set Up a Private DNS Server with Bind9 on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu Server
- BIND 9 / Bind9
- DNS forward and reverse zones
- DNSSEC
- Split-horizon DNS views
- Netplan
- UFW
- AppArmor
- systemd

## Sources Consulted
- Ubuntu Server documentation: Domain Name Service (DNS) - https://ubuntu.com/server/docs/how-to/networking/install-dns/
- BIND 9 Administrator Reference Manual: DNSSEC - https://bind9.readthedocs.io/en/v9.18.13/chapter5.html
- BIND 9 Configuration Reference - https://bind9.readthedocs.io/en/latest/reference.html
- ISC Knowledgebase: DNSSEC Key and Signing Policy - https://kb.isc.org/docs/dnssec-key-and-signing-policy
- RFC 6762: Multicast DNS - https://datatracker.ietf.org/doc/html/rfc6762
- IANA Special-Use Domain Names registry - https://www.iana.org/assignments/special-use-domain-names/
- Netplan documentation: static IP addresses and nameservers - https://netplan.readthedocs.io/en/stable/using-static-ip-addresses/
- Ubuntu BIND package tooling in apt: `bind9`, `bind9-utils`, and `bind9-dnsutils` version `1:9.18.39-0ubuntu0.24.04.5`

## Issues Found
- The article used `example.local` without warning that `.local` is reserved for Multicast DNS. Added a note advising production users to use a delegated subdomain or another non-conflicting internal naming plan.
- The DNSSEC section mixed manual `dnssec-keygen`/`dnssec-signzone` steps with inline signing and the deprecated `auto-dnssec maintain` option. Replaced that workflow with current BIND 9 `dnssec-policy default;` plus `inline-signing yes;`.
- The DNSSEC verification text said the `ad` flag would indicate successful validation for the private zone. Corrected this to check for RRSIG/DNSKEY records and added a trust-anchor caveat for private zones without a public parent DS record.
- The split-horizon section did not account for Ubuntu's default top-level include of `named.conf.default-zones`, which conflicts with BIND views. Added instructions to comment out the top-level include and include default zones inside each view.
- The main options snippet used `query-source address * port *;`, which produces a deprecation warning in BIND 9.18. Removed it because source port randomization is already handled by modern BIND.
- The hardening section could break DNSSEC inline signing by making BIND-managed state directories non-writable. Added commands to keep the signing state directories owned by the `bind` user when inline signing is enabled.
- The DNSSEC troubleshooting section still used the old manual signing command. Replaced it with `rndc reload` for the managed `dnssec-policy` workflow.

## Review Notes
Validated representative BIND zone and configuration snippets with Ubuntu BIND 9.18.39 tools extracted from the current Ubuntu package: `named-checkzone` accepted the forward, reverse, internal split-horizon, and external split-horizon zone examples; `named-checkconf` accepted the base options/local configuration, the split-horizon view configuration, and the DNSSEC zone configuration after the fixes.
