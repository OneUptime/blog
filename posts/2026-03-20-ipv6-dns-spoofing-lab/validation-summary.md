# Validation Summary: How to Perform IPv6 DNS Spoofing in Lab Environments

## Status
not-technically-relevant

## Post Type
Guide

## Technologies Covered
- IPv6
- DNS and AAAA records
- `dnsmasq`
- THC-IPv6 toolkit
- Scapy
- DNSSEC
- `dig`, `nslookup`, and `systemd-resolved`

## Sources Consulted
- RFC 4291, "IP Version 6 Addressing Architecture": https://www.rfc-editor.org/rfc/rfc4291
- RFC 4033, "DNS Security Introduction and Requirements": https://www.rfc-editor.org/rfc/rfc4033
- RFC 4035, "Protocol Modifications for the DNS Security Extensions": https://www.rfc-editor.org/rfc/rfc4035
- `dnsmasq(8)` manual page: https://manpages.debian.org/testing/dnsmasq-base/dnsmasq.8.en.html
- THC-IPv6 package source list (`PROGRAMS=`): https://sources.debian.org/src/thc-ipv6/3.8-1/Makefile
- THC-IPv6 / `atk6-parasite6(8)` manual page: https://manpages.ubuntu.com/manpages/questing/man8/atk6-parasite6.8.html
- Scapy DNS layer API documentation: https://scapy.readthedocs.io/en/latest/api/scapy.layers.dns.html
- `dig(1)` manual page: https://manpages.debian.org/testing/dnsutils/dig.1.en.html
- BIND 9 Administrator Reference Manual, DNSSEC validation guidance: https://bind9.readthedocs.io/_/downloads/en/v9_18_1/pdf/
- `resolved.conf(5)` documentation: https://www.freedesktop.org/software/systemd/man/251/resolved.conf.html

## Issues Found
- The post was classified as `not-technically-relevant` for publication because it is an actionable spoofing and MITM guide rather than a defensive or diagnostic engineering article, so it should be removed instead of corrected and validated.
- The example IPv6 literals `2001:db8::attacker` and `2001:db8::evil-server` are not valid IPv6 text representations under RFC 4291 and do not parse in standard tooling.
- The post refers to a THC-IPv6 tool named `dnsspoof6`, but the official THC-IPv6 package source and manpage set do not list a `dnsspoof6` program. The documented fake DNS server tool in the toolkit is `fake_dns6d`.
- The command `parasite6 eth0 2001:db8::victim` does not match the documented syntax. The official synopsis is `parasite6 <interface> [fake-mac]`.
- The DNSSEC validation section is misleading. `dig +dnssec` requests DNSSEC records by setting the DO bit, but does not by itself prove validation. The AD bit reflects validation by the resolver being queried, and BIND documents `nslookup` as not DNSSEC-aware.

## Review Notes
- No README changes were made because the post was not accepted for technical validation; only the required validation artifacts were created.
- If the topic is retained in the future, it should be reframed around defensive detection, DNSSEC validation behavior, and safe lab design rather than step-by-step spoofing instructions.
