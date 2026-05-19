# Validation Summary: How to Configure stubby for DNS over TLS on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Stubby / getdns
- DNS over TLS (DoT)
- systemd-resolved
- NetworkManager
- resolv.conf
- dig, tcpdump, openssl, systemctl, journalctl
- Cloudflare 1.1.1.1 DNS
- Quad9 DNS

## Sources Consulted
- Stubby upstream README and configuration reference: https://github.com/getdnsapi/stubby
- Ubuntu Noble stubby package page: https://launchpad.net/ubuntu/noble/+package/stubby
- Cloudflare DNS over TLS documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/
- Quad9 services documentation: https://docs.quad9.net/services/
- systemd resolved.conf manual: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- Linux resolv.conf manual: https://man7.org/linux/man-pages/man5/resolv.conf.5.html
- RFC 7858, DNS over TLS: https://www.rfc-editor.org/rfc/rfc7858
- Local command help/man pages for dig, resolvectl, tcpdump, and resolved.conf on Ubuntu 24.04.

## Issues Found
- The DNS leak test command used `curl https://dnsleaktest.com/results.json`, but that URL returns 404 and is not a valid documented CLI API. Replaced it with opening the public DNSLeakTest site in a browser.
- The command-line verification used `dig +short TXT whoami.cloudflare.com @1.1.1.1`, which sends the query directly to Cloudflare and bypasses Stubby, so it does not validate the local Stubby/system resolver path. Removed the explicit resolver and added a Quad9 transport TXT check for Quad9 users.
- The text claimed that matching the returned IP alone proves queries are routed through Stubby. Adjusted the wording to require both expected upstream results and absence of external UDP/53 traffic in tcpdump.

## Review Notes
The main Stubby YAML fields, Cloudflare and Quad9 DoT endpoint names, systemd-resolved `DNS=127.0.0.1:5353` syntax, and diagnostic commands were checked against upstream documentation or local man/help output. The SPKI pin example is syntactically correct, but users should regenerate pins before relying on pin-based authentication because provider certificates and keys can change.
