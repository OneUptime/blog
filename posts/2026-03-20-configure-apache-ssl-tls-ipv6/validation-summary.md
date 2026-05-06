# Validation Summary: How to Configure Apache SSL/TLS with IPv6

## Status
validated

## Post Type
Guide

## Technologies Covered
- Apache HTTP Server
- Apache `mod_ssl`
- Apache `mod_headers`
- IPv6 networking
- TLS/HTTPS
- Certbot / Let's Encrypt
- `curl`
- OpenSSL

## Sources Consulted
- Apache HTTP Server: Binding to Addresses and Ports — https://httpd.apache.org/docs/current/bind.html
- Apache HTTP Server: Name-based Virtual Host Support — https://httpd.apache.org/docs/current/vhosts/name-based.html
- Apache HTTP Server: `mod_ssl` — https://httpd.apache.org/docs/2.4/en/mod/mod_ssl.html
- Certbot Apache instructions — https://certbot.eff.org/instructions?os=pip&tab=standard&ws=apache
- Let's Encrypt: IPv6 Support — https://letsencrypt.org/docs/ipv6-support/
- Let's Encrypt: Challenge Types — https://letsencrypt.org/docs/challenge-types/
- curl man page — https://curl.se/docs/manpage.html
- OpenSSL `s_client` documentation — https://docs.openssl.org/3.6/man1/openssl-s_client/

## Issues Found
- The post used `SSLCertificateChainFile` in the Apache example. I removed it and changed `SSLCertificateFile` to a bundled certificate file because Apache documents `SSLCertificateChainFile` as obsolete in 2.4.8+ and expects intermediate certificates to be included in the certificate file.
- The dual-stack example declared both `Listen 443` and `Listen [::]:443` together. I removed the second line from that example because Apache documents `Listen 443` as listening on all interfaces, and overlapping `Listen` directives can prevent the server from starting.
- The IPv6-specific example implied a guaranteed IPv6-only setup. I changed it to an explicit IPv6 listener example and made `Listen [::]:443` an alternative to `Listen 443`, which is more accurate for Apache builds that use IPv4-mapped IPv6 sockets.
- The Let's Encrypt note said the IPv6 challenge concern only applied to IPv6-only servers. I corrected this to cover any domain with an `AAAA` record, which matches Let's Encrypt's IPv6 validation behavior.
- The ACME challenge test command assumed a file existed under `.well-known/acme-challenge/`. I added the missing precondition that a temporary file should be placed there before using the `curl -6` test.

## Review Notes
- The `SSLCipherSuite` example configures TLS 1.2 and earlier cipher suites. On Apache with OpenSSL support for TLS 1.3, TLS 1.3 cipher suites use library defaults unless explicitly configured separately.
- The HSTS header with `preload` is syntactically correct, but it should only be published if the site owner intends to meet browser preload requirements for the domain and its subdomains.
