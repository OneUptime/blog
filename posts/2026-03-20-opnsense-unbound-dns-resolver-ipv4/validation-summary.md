# Validation Summary: How to Set Up Unbound DNS Resolver for IPv4 on OPNsense

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- OPNsense (firewall/router platform)
- Unbound DNS resolver
- DNSSEC
- DNS-over-TLS (DoT)
- dig (DNS query tool)
- unbound-control (Unbound management CLI)
- Cloudflare DNS (1.1.1.1)
- Quad9 DNS (9.9.9.9)

## Sources Consulted
- OPNsense documentation: https://docs.opnsense.org/manual/unbound.html
- Unbound documentation: https://nlnetlabs.nl/documentation/unbound/
- unbound-control(8) man page: https://nlnetlabs.nl/documentation/unbound/unbound-control/
- RFC 7858 (DNS over TLS): https://datatracker.ietf.org/doc/html/rfc7858
- Cloudflare DoT documentation: https://developers.cloudflare.com/1.1.1.1/encryption/dns-over-tls/
- Quad9 DoT documentation: https://docs.quad9.net/services/

## Issues Found
No technical issues found.

All technical claims verified:
- OPNsense uses Unbound as default DNS resolver — correct.
- Unbound performs full recursive resolution from root servers — correct.
- DoT default port 853 — correct (RFC 7858).
- Cloudflare DoT endpoint: 1.1.1.1, TLS hostname `cloudflare-dns.com` — correct.
- Quad9 DoT endpoint: 9.9.9.9, TLS hostname `dns.quad9.net` — correct.
- Access list action keywords (Allow, Refuse) are valid Unbound `access-control` actions.
- `unbound-control status` and `unbound-control flush_zone .` are valid commands; flushing the root zone effectively clears the entire cache tree.
- `dig @<server> +dnssec` is the correct way to request DNSSEC records.
- Cache TTL values (Min 300s, Max 86400s) are reasonable defaults.

## Review Notes
- The OPNsense UI has, in some recent versions, consolidated Host Overrides and Domain Overrides under a single "Overrides" tab (with sub-tabs). The post's separate "Host Overrides" and "Domain Overrides" labels still match earlier UI layouts and remain understandable; future readers may need to look under the "Overrides" parent menu in newer releases.
- The post correctly notes that `Register ISP-provided nameservers` should be unchecked when using Unbound for full recursion — this is important because leaving it checked turns Unbound into a forwarder, which contradicts the recursive-resolution premise.
- The example "Refuse Network: 0.0.0.0/0" entry depends on Unbound evaluating ACL entries as longest-prefix match; this is the expected behavior, so the catch-all deny works as written.
- Consider mentioning that DNSSEC validation requires accurate system time (NTP) — a common cause of resolution failures on freshly installed OPNsense systems — but this is an enhancement rather than a correction.
