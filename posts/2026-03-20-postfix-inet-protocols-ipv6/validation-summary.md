# Validation Summary: How to Configure Postfix inet_protocols for IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Postfix
- IPv6
- SMTP
- Linux networking tools

## Sources Consulted
- Postfix IPv6 Support (`IPV6_README`): https://www.postfix.org/IPV6_README.html
- Postfix Configuration Parameters (`postconf(5)`): https://www.postfix.org/postconf.5.html
- Postfix Configuration Utility (`postconf(1)`): https://www.postfix.org/postconf.1.html
- Local command help used to verify CLI syntax: `openssl s_client -help`, `telnet --help`, `dig -h`, `ip -help`, `ss --help`

## Issues Found
- The introduction said `inet_protocols` is set to `ipv4` "by default on many systems for safety". I changed this to the documented behavior: Postfix 2.8 and earlier defaulted to `ipv4`, and Postfix 2.9+ upgrades may preserve an explicit `ipv4` setting for backward compatibility.
- The post said `inet_protocols` accepts only three values. I corrected this to match `postconf(5)`: it accepts one or more of `ipv4` and `ipv6`, with `all` acting as the common shorthand on IPv6-capable systems.
- The post used `systemctl reload postfix` after changing `inet_protocols`. I changed all of these to `systemctl restart postfix` because the Postfix documentation states that this parameter requires a stop/start when changed.
- The IPv6-only section claimed this requires all recipient MX records to have AAAA records. I corrected this to the actual requirement: the remote mail exchangers you need to reach must be reachable over IPv6.
- The IPv6 listener example used a single `ss` output form that is not universal. I updated it to a valid IPv6 listener example format shown by current `ss` output.
- The DNS troubleshooting example used `dig AAAA google.com @::1`, which incorrectly assumes a resolver is listening on `::1`. I changed this to `dig AAAA google.com` so it tests AAAA resolution without assuming a specific local resolver binding.
- The post recommended `smtp_address_preference = ipv4` as a temporary fix for slow delivery and suggested `smtp_address_preference = ipv6` in the summary. I removed that guidance because Postfix documents both `ipv4` and `ipv6` preferences as unsafe in dual-stack mail delivery; temporarily setting `inet_protocols = ipv4` is the safer troubleshooting step.

## Review Notes
- On older systems that pre-date `IPV6_V6ONLY` support, Postfix may still accept IPv4 connections even with `inet_protocols = ipv6`; this is documented by Postfix but is mainly a legacy platform caveat.
- The post assumes a systemd-based Linux distribution by using `systemctl restart postfix`, which is reasonable for the stated Linux audience.
