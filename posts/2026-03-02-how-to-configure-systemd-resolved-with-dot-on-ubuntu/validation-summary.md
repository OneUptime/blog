# Validation Summary: How to Configure systemd-resolved with DoT on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- systemd-resolved
- DNS over TLS (DoT)
- DNSSEC
- resolvectl
- NetworkManager
- systemd-networkd
- OpenSSL
- tcpdump

## Sources Consulted
- systemd `resolved.conf(5)` manual: https://www.freedesktop.org/software/systemd/man/resolved.conf.html
- systemd `systemd-resolved.service(8)` manual: https://www.freedesktop.org/software/systemd/man/systemd-resolved.service.html
- systemd `resolvectl(1)` manual: https://www.freedesktop.org/software/systemd/man/resolvectl.html
- systemd `systemd.network(5)` manual: https://www.freedesktop.org/software/systemd/man/systemd.network.html
- NetworkManager `NetworkManager.conf(5)` and `nm-settings-nmcli(5)` local manuals
- Ubuntu 18.04 release notes: https://wiki.ubuntu.com/BionicBeaver/ReleaseNotes/18.04
- RFC 7858, Specification for DNS over Transport Layer Security: https://www.rfc-editor.org/rfc/rfc7858
- RFC 8310, Usage Profiles for DNS over TLS and DNS over DTLS: https://www.rfc-editor.org/rfc/rfc8310
- Cloudflare DNS over TLS documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/
- Quad9 services documentation: https://docs.quad9.net/services/
- Google Public DNS over TLS documentation: https://developers.google.com/speed/public-dns/docs/dns-over-tls

## Issues Found
- The post incorrectly said systemd 243+ was needed for strict DoT mode. `DNSOverTLS=` was added in systemd 239, and `DNSOverTLS=yes` is the strict mode. Updated the version check comment.
- The basic DoT configuration had the `yes` and `opportunistic` meanings reversed. Updated the comments so `yes` requires encrypted TLS and `opportunistic` may fall back to plaintext.
- The strict mode example used `DNSOverTLS=opportunistic`, which is not strict. Changed it to `DNSOverTLS=yes`.
- The `FallbackDNS=` comment described it as a primary-server failover mechanism. systemd uses fallback DNS only when no other DNS server information is known, so the comment was corrected.
- The `dig` example claimed it always goes through `systemd-resolved`. This is only true when `/etc/resolv.conf` points at the resolved stub, so the comment was clarified.
- The NetworkManager DNS example omitted the DoT authentication name suffix. Added `#cloudflare-dns.com` to match NetworkManager's documented SNI syntax.
- The OpenSSL troubleshooting command checked certificate subject/CN only. Replaced it with `-verify_hostname` so it actually verifies the configured authentication name.
- The NetworkManager troubleshooting comment said `dns=systemd-resolved` tells NetworkManager not to manage DNS. Corrected the wording: it tells NetworkManager to use `systemd-resolved` for DNS.

## Review Notes
The post is technically relevant and valid after the fixes. Some behavior is distribution- and version-sensitive, especially NetworkManager integration and the exact `resolvectl status` output, but the corrected guidance matches current systemd and NetworkManager documentation.
