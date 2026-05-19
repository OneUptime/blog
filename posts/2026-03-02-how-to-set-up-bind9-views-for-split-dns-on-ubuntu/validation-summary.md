# Validation Summary: How to Set Up BIND9 Views for Split DNS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- BIND9 (DNS server)
- Ubuntu 22.04 / 24.04
- DNS (zones, records, SOA, MX, PTR, TXT/SPF)
- Split-horizon DNS (views, ACLs)
- systemd (service management)
- dig (DNS query utility)

## Sources Consulted
- BIND 9 Administrator Reference Manual (ARM) — view, acl, zone, match-clients, recursion, allow-recursion, allow-query statements: https://bind9.readthedocs.io/en/latest/reference.html
- Ubuntu packages (jammy/noble): bind9, bind9-utils, bind9-doc, bind9-dnsutils and their transitional names (bind9utils, dnsutils): https://packages.ubuntu.com/
- RFC 1918 — Address Allocation for Private Internets (10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)
- RFC 5737 — IPv4 Address Blocks Reserved for Documentation (203.0.113.0/24 = TEST-NET-3)
- RFC 1035 — Domain Names Implementation (SOA field order, in-addr.arpa reverse zone format)
- RFC 7208 — Sender Policy Framework (SPF) record syntax
- dig(1) manual page — flags `+short`, `+all`, `@server` syntax

## Issues Found
No technical issues found.

## Review Notes
- Package names `bind9utils` and `dnsutils` are transitional dummy packages in Ubuntu 22.04+ that now pull in `bind9-utils` and `bind9-dnsutils` respectively. The apt install line still works correctly as written; no change required.
- The systemd unit `named.service` is correct on Ubuntu 22.04 and 24.04 (with `bind9.service` as an alias in current bind9 packages). Both names work.
- The reverse zone naming (`1.168.192.in-addr.arpa` for `192.168.1.0/24`), SOA timer values, and the recursion / `allow-recursion` configuration in the internal view all match the BIND 9 ARM.
- The note about needing to place default zones inside a view when any view is defined is correct — BIND will refuse to load a config that mixes view-scoped and global zones.
- Minor stylistic observation (not an error): the comment "Serial (must match internal or be different)" on the external zone SOA is tautological; in practice the internal and external zones' serials are independent and need not be coordinated. Left as-is since the comment is not technically incorrect and the task is limited to fixing technical errors.
- The example serial `2024030201` is older than the post's publication date (2026-03-02). This is harmless in an example but real deployments should use the current date.
