# Validation Summary: How to Set Up DNS over HTTPS (DoH) on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- DNS over HTTPS (DoH)
- DNS over TLS (DoT)
- systemd-resolved and resolvectl
- dnscrypt-proxy
- cloudflared proxy-dns (legacy only)
- dig and tcpdump
- Public encrypted DNS resolvers: Cloudflare, Google Public DNS, Quad9, NextDNS, Mullvad

## Sources Consulted
- systemd resolved.conf manual: https://www.freedesktop.org/software/systemd/man/latest/resolved.conf.html
- systemd syntax manual: https://www.freedesktop.org/software/systemd/man/latest/systemd.syntax.html
- systemd resolvectl manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- DNSCrypt-Proxy example configuration: https://github.com/DNSCrypt/dnscrypt-proxy/blob/master/dnscrypt-proxy/example-dnscrypt-proxy.toml
- DNSCrypt public resolver list: https://github.com/DNSCrypt/dnscrypt-resolvers/blob/master/v3/public-resolvers.md
- Cloudflare DNS over HTTPS documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/
- Cloudflare DoH clients documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-https/dns-over-https-client/
- Cloudflare cloudflared proxy-dns removal notice: https://developers.cloudflare.com/changelog/post/2025-11-11-cloudflared-proxy-dns/
- Cloudflare 1.1.1.1 IP addresses and Families documentation: https://developers.cloudflare.com/1.1.1.1/ip-addresses/
- Google Public DNS DoH documentation: https://developers.google.com/speed/public-dns/docs/doh/
- Google Public DNS privacy policy: https://developers.google.com/speed/public-dns/privacy
- Quad9 FAQ and DoH documentation: https://quad9.com/support/faq/
- NextDNS setup/help guidance: https://help.nextdns.io/
- Mullvad encrypted DNS documentation: https://mullvad.net/help/dns-over-https-and-dns-over-tls/
- RFC 8484, DNS Queries over HTTPS: https://www.rfc-editor.org/rfc/rfc8484
- RFC 7858, DNS over TLS: https://www.rfc-editor.org/rfc/rfc7858

## Issues Found
- The post described systemd-resolved as part of a DoH setup. systemd-resolved supports DNS over TLS via `DNSOverTLS=`, not DNS over HTTPS, so the description and introductory wording were changed to refer to encrypted DNS and to distinguish DoT from DoH.
- The privacy explanation overstated DoH by implying all observers are prevented from seeing DNS activity. The wording now clarifies that DoH protects DNS message contents between the host and resolver, while the upstream resolver can still see queries.
- The systemd-resolved snippet used inline comments after `DNSOverTLS=yes` and `DNSSEC=yes`. systemd configuration syntax only treats lines starting with `#` or `;` as comments, so those comments were moved to their own lines.
- The systemd-resolved examples set global `DNS=` servers but did not set a route-only domain. Because resolved can also use suitable per-link DNS servers, `Domains=~.` was added so the configured encrypted resolver is preferred for all domains.
- The DoT verification command used `grep -E "DNS\|TLS\|Protocol"`, which does not match normal output with extended grep. It was replaced with a working pattern for `DNSOverTLS`, DNS server, and protocol status lines.
- The systemd-resolved test command used `dig google.com`, which may bypass resolved depending on `/etc/resolv.conf`. It was changed to `resolvectl query google.com`.
- The dnscrypt-proxy DoH-only configuration selected `quad9-dnscrypt-ip4-filter-pri`, which is a DNSCrypt resolver name, while `dnscrypt_servers = false` disables DNSCrypt. It was replaced with `quad9-doh-ip4-port443-filter-pri`.
- The dnscrypt-proxy logging snippet used a non-current `[log]` section with `level` and `file`. It was changed to the documented `log_level` and `log_file` settings.
- The cloudflared method installed the latest cloudflared release and used `cloudflared proxy-dns`, but Cloudflare removed `proxy-dns` from new releases starting February 2, 2026. The section is now explicitly marked legacy-only and no longer tells readers to install the latest package for this method.
- The cloudflared resolved.conf note incorrectly used `nameserver 127.0.0.1:5053` terminology. It now uses the correct systemd-resolved setting, `DNS=127.0.0.1:5053`.
- The verification section used `curl https://1.1.1.1/help`, but Cloudflare's DoH status check is a browser page. The command was replaced with a browser-check note.
- The verification section claimed `https://www.cloudflare.com/cdn-cgi/trace` would show `DoH=1`, which it does not. That check was replaced with a `resolvectl status` check for the DoT method.
- The tcpdump guidance only checked UDP port 53 in one place. It now checks all port 53 traffic and states the result as "no plaintext DNS leak on that interface" rather than absolute proof of DoH.
- The public resolver table had inaccurate or incomplete endpoint notes: Cloudflare's official DoH endpoint is `https://cloudflare-dns.com/dns-query`, `1.1.1.2` is malware filtering rather than a "no logging option", Google's logging note was inaccurate, NextDNS custom filtering requires a configuration ID path, and Mullvad's ad-blocking DoH endpoint needs `/dns-query`. These entries were corrected.

## Review Notes
The post is now technically accurate as a mixed encrypted DNS guide: systemd-resolved is presented as DoT, dnscrypt-proxy as the current DoH proxy path, and cloudflared proxy-dns as legacy-only. Future updates should consider replacing the cloudflared legacy section with Cloudflare WARP or another maintained DoH proxy if the post needs only current setup methods.
