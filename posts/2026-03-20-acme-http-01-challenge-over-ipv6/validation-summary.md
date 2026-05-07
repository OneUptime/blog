# Validation Summary: How to Configure ACME HTTP-01 Challenge over IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- ACME HTTP-01 challenge
- Let's Encrypt
- IPv6 and DNS AAAA records
- Nginx
- Apache HTTP Server
- Certbot
- ip6tables

## Sources Consulted
- Let's Encrypt, Challenge Types: https://letsencrypt.org/docs/challenge-types/
- Let's Encrypt, IPv6 Support: https://letsencrypt.org/docs/ipv6-support/
- Apache HTTP Server 2.4, Binding to Addresses and Ports: https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server 2.4, Name-based Virtual Host Support: https://httpd.apache.org/docs/current/vhosts/name-based.html
- nginx, `listen` directive reference: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Certbot User Guide: https://eff-certbot.readthedocs.io/en/stable/using.html

## Issues Found
- The post said Apache needs explicit IPv6 `Listen` directives and showed both `Listen 80` and `Listen [::]:80`. I changed this to a single `Listen 80` because Apache documents that `Listen 80` listens on all interfaces, and overlapping `Listen` directives can cause startup failures.
- The post said Let's Encrypt may use either IPv4 or IPv6 when both `A` and `AAAA` records exist. I changed this to the documented behavior: Let's Encrypt prefers IPv6 for the initial connection and retries IPv4 only if the IPv6 connection fails at the network level.
- The post used `sudo ip6tables-save > /etc/ip6tables/rules.v6` as a generic persistence command. I replaced it with a distro-neutral note because firewall rule persistence is distribution-specific and the original path is not generally correct.

## Review Notes
- The Nginx and Certbot examples are technically valid as written after the corrections above.
- The `ip6tables` commands remain valid on current systems, though many distributions now provide them through the `nf_tables` backend and use distro-specific persistence tooling.
