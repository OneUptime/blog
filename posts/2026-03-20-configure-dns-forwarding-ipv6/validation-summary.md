# Validation Summary: How to Configure DNS Forwarding for IPv6 Queries

## Status
validated

## Post Type
Guide

## Technologies Covered
- DNS forwarding
- IPv6
- BIND 9
- Unbound
- CoreDNS
- `dig`
- `unbound-control`
- `tcpdump`
- `ping`

## Sources Consulted
- ISC BIND 9 Configuration Reference: https://bind9.readthedocs.io/en/v9.21.9/reference.html
- ISC BIND 9 manual pages (`dig`): https://bind9.readthedocs.io/en/v9.20.9/manpages.html
- NLnet Labs Unbound `unbound.conf(5)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound.conf.html
- NLnet Labs Unbound getting started / remote control setup: https://unbound.docs.nlnetlabs.nl/en/latest/getting-started/configuration.html
- NLnet Labs Unbound setup guide: https://nlnetlabs.nl/documentation/unbound/howto-setup/
- NLnet Labs Unbound `unbound-control(8)`: https://unbound.docs.nlnetlabs.nl/en/latest/manpages/unbound-control.html
- CoreDNS forward plugin documentation: https://coredns.io/plugins/forward/
- CoreDNS bind plugin documentation: https://coredns.io/plugins/bind/
- CoreDNS official parser source for upstream endpoint parsing: https://raw.githubusercontent.com/coredns/coredns/master/plugin/pkg/parse/host.go
- Local command help checked: `dig -h`, `ping -6 -h`, `tcpdump --help`

## Issues Found
- The BIND per-domain example used `2001:db8:partner::53`, which is not a valid IPv6 literal because `partner` is not hexadecimal. I replaced it with the valid documentation-prefix address `2001:db8:100::53`.
- The Unbound forwarder comment incorrectly implied that `forward-tls-upstream` controls DNSSEC validation. I corrected the comment to describe its actual purpose: plain DNS vs. DNS-over-TLS transport to the upstream resolver.
- The Unbound stub-zone example described the target as a resolver and used "forward" wording. Unbound's documentation states that stub zones point to authoritative servers and Unbound performs recursion itself for those zones, so I corrected the wording and inline comments.
- The CoreDNS note said it "listens on :: by default." The official CoreDNS bind documentation describes the default behavior as binding to the wildcard host / all interfaces, so I updated the comment to match that behavior.
- The BIND testing section used `rndc querylog` plus a hardcoded `queries.log` path to verify IPv6 upstream forwarding. BIND query logging records client queries, not actual upstream forwarder traffic, and the destination is logging-config dependent. I replaced that with `tcpdump`-based verification against an IPv6 forwarder address.
- The Unbound testing example used `unbound-control` without noting that remote control must be enabled first. I added that prerequisite inline.
- The reachability section labeled the `dig` test as specifically UDP and used `ping6`. I changed the wording to DNS reachability over IPv6 and updated the latency example to `ping -6`, which matches current CLI help and is more portable.

## Review Notes
- BIND `type master` is still technically valid as a synonym for `primary`, so it was left unchanged.
- When verifying whether forwarding actually uses IPv6, cached answers can hide upstream traffic. Using a name that is not already cached, or clearing cache first, produces a more reliable test.
- `unbound-control` often requires remote-control keys and may require `sudo`, depending on how the package is installed.
