# Validation Summary: How to Set Up Unbound as a Recursive DNS Resolver on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu
- Unbound recursive DNS resolver
- DNSSEC
- DNS-over-TLS
- DNS-over-HTTPS
- AdGuard dnsproxy
- Pi-hole
- systemd
- curl, dig, kdig, drill, unbound-control

## Sources Consulted
- NLnet Labs Unbound configuration manual: https://nlnetlabs.nl/documentation/unbound/unbound.conf/
- NLnet Labs unbound-control manual: https://www.nlnetlabs.nl/documentation/unbound/unbound-control/
- Pi-hole official Unbound guide: https://docs.pi-hole.net/guides/dns/unbound/
- AdGuardTeam dnsproxy README and examples: https://github.com/AdguardTeam/dnsproxy
- AdGuardTeam dnsproxy releases: https://github.com/AdguardTeam/dnsproxy/releases
- BIND 9 dig manual: https://bind9.readthedocs.io/en/stable/manpages.html
- curl man page: https://curl.se/docs/manpage.html
- RFC 8484, DNS Queries over HTTPS: https://datatracker.ietf.org/doc/html/rfc8484
- Local Ubuntu package metadata for Unbound 1.19.2 and local CLI help for dig/curl.

## Issues Found
- The installation verification section implied Unbound would likely be inactive until configured. On Ubuntu package installs, the service may already be active with the default configuration. Updated the wording to avoid a misleading expectation.
- The `private-address` comment said Unbound would not query private ranges. The directive filters private addresses from answers for public names; it does not mean Unbound will never query those ranges. Updated the comment.
- The DoH section said Unbound does not natively support DoH. Modern Unbound can serve DoH when built with HTTP/2 support, and Ubuntu's package depends on `libnghttp2`. Updated the statement while keeping the proxy-based approach.
- The pinned dnsproxy version was outdated. Updated it from `0.72.0` to current release `0.81.4`.
- The dnsproxy systemd example configured plain DNS and DoH on port 443 at the same time. Changed `--port=443` to `--port=0`, matching dnsproxy's documented DoH-server examples.
- The DoH curl test used the non-standard JSON API style against `/dns-query`. dnsproxy serves standard RFC 8484 DoH, so the test was changed to use curl's `--doh-url` and `--doh-insecure` options.
- The dog DoH test used an unsupported `--insecure` option. Replaced it with a `dig +https` test that uses the generated self-signed certificate and expected TLS hostname.
- Two troubleshooting commands labeled `unbound-control list_auth_zones` as a trust-anchor check. That command lists configured authority zones, not DNSSEC trust anchors. Replaced those checks with reading `/var/lib/unbound/root.key`.

## Review Notes
The remaining examples are broadly consistent with current Unbound and Pi-hole guidance. Some tuning values, such as cache sizes, thread counts, rate limits, and kernel parameters, are environment-dependent and should be treated as starting points rather than universal recommendations.
