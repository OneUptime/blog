# Validation Summary: How to Configure BIND as a Recursive IPv6 DNS Server

## Status
validated

## Post Type
Guide

## Technologies Covered
- BIND 9
- DNS recursion
- IPv6
- DNS forwarders
- DNSSEC
- `dig`
- `named-checkconf`

## Sources Consulted
- BIND 9 Configuration Reference 9.20.16: https://bind9.readthedocs.io/en/v9.20.16/reference.html
- BIND 9 Configuration Reference 9.18.21 (`listen-on-v6` semantics): https://bind9.readthedocs.io/en/v9.18.21/reference.html
- BIND 9 Configurations and Zone Files 9.20.22 (resolver and forwarding examples): https://bind9.readthedocs.io/en/v9.20.22/chapter3.html
- BIND 9 IPv6 Support documentation: https://bind9.readthedocs.io/en/v9.20.8/chapter6.html
- BIND 9 DNSSEC Guide: https://bind9.readthedocs.io/en/stable/dnssec-guide.html
- BIND 9 DNSSEC Guide 9.16.20 (`ad` flag and `dnssec-failed.org` validation workflow): https://bind9.readthedocs.io/en/v9.16.20/dnssec-guide.html
- BIND 9 `dig` manual: https://bind9.readthedocs.io/en/v9.20.16/manpages.html

## Issues Found
- The introduction described a recursive resolver as forwarding queries to authoritative servers. That was inaccurate. I corrected it to describe normal recursive resolution and clarified that forwarding is optional behavior controlled by `forwarders` and `forward`.
- The Step 1 example claimed to accept IPv4 and IPv6 clients, but `listen-on { 127.0.0.1; };` only allowed IPv4 loopback queries. I changed it to `listen-on { any; };` so the example matches the stated behavior.
- The Step 1 ACL guidance only used `allow-query`, which is not the clearest or safest way to describe access control for a caching resolver. I added explicit `allow-query-cache` and `allow-recursion` directives and switched the example to BIND’s built-in `localhost` and `localnets` ACLs so the snippet is practical and current.
- The forwarding section contained contradictory guidance: the comment said not to do full recursion if forwarders fail, but the configuration used `forward first`, which does fall back to normal recursion. I corrected the comments to match the actual `forward first` behavior documented by BIND.
- The outbound IPv6 section incorrectly implied that `query-source-v6` is how you make BIND prefer IPv6, and it hard-coded `2001:db8::53`, which is a documentation prefix rather than a usable local address. I rewrote that section to explain that BIND already uses IPv6 on IPv6-capable systems and that `query-source-v6` only controls the local source address for IPv6 upstream queries.
- The DNSSEC validation test was incomplete because `dig +dnssec` by itself does not tell readers what successful validation looks like. I updated it to tell readers to look for the `ad` flag in the response header, consistent with the BIND DNSSEC guide.
- The `dnssec-failed.org` test was technically wrong because it used `+cd` as the primary validation check and then claimed that the absence of `AD` proved failure. Per the BIND DNSSEC guide, the correct validation test is that the normal query returns `SERVFAIL`, and that retrying with `+cd` succeeds if the failure is specifically due to DNSSEC validation. I corrected those commands and explanations.
- The conclusion overstated that `listen-on-v6 { any; };` is required and did not emphasize recursion/cache ACLs. I corrected it to focus on recursion enablement, client restrictions, and optional forwarders.

## Review Notes
- `listen-on-v6 { any; };` is explicit but not strictly required in current BIND releases; if omitted, BIND listens on all IPv6 interfaces by default. Leaving it explicit in the post is still valid.
- The post uses Debian/Ubuntu-style paths and service names (`/etc/bind`, `bind9`). Other distributions often use different file locations or the `named` service name.
- BIND supports `rate-limit` on recursive servers, but ISC documents it as primarily intended for authoritative servers and notes that it can slow legitimate recursive workloads. The section is technically valid, but ACLs that keep the resolver closed are the more important first control.
- I did not run `named-checkconf` locally because BIND is not installed in this environment.
