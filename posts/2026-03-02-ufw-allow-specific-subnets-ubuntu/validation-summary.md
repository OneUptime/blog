# Validation Summary: How to Set Up ufw Allow from Specific Subnets on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- Ubuntu Linux
- iptables / netfilter (underlying)
- IPv4 / IPv6 networking, CIDR notation
- RFC 1918 private address space
- Bash scripting

## Sources Consulted
- `ufw(8)` man page (May 2023 version) — verified rule syntax, `insert NUM`, `comment`, `proto`, `from`/`to` clauses
- Ubuntu Server Guide / Community UFW documentation (https://help.ubuntu.com/community/UFW)
- RFC 1918 (Private IP Address Allocation)
- RFC 3849 (IPv6 documentation prefix `2001:db8::/32`)
- Default service ports verified: PostgreSQL 5432, Redis 6379, MySQL 3306, NFS 2049, rpcbind 111, Prometheus node_exporter 9100, postgres_exporter 9187
- `/etc/default/ufw` and `IPV6=yes` setting per UFW packaging
- UFW log format (`UFW ALLOW`/`UFW BLOCK` prefixes, `DPT=` destination port) per iptables LOG target

## Issues Found
No technical issues found. All UFW commands, syntax patterns, port numbers, and configuration paths are correct:

- `ufw allow from <CIDR> to any port <N> [proto tcp]` syntax matches the man page extended rule syntax.
- `proto` placement at the end of the rule is valid — the UFW man page itself uses this ordering in its own example (`ufw allow in on eth0 to any port 80 proto tcp`).
- The `insert NUM` ordering example correctly places the more specific allow rule before the broader deny rule.
- IPv6 example uses the documentation prefix `2001:db8::/32` per RFC 3849.
- `/etc/default/ufw` with `IPV6=yes` is the correct location/setting to enable IPv6 firewalling.
- `/var/log/ufw.log` is the default UFW log target when rsyslog is configured (standard on modern Ubuntu).
- Comment support via the `comment` keyword is correctly described as available in newer UFW releases.
- RFC 1918 classifications in the comments (10.0.0.0/8 Class A, 172.16.0.0/12 Class B range, 192.168.0.0/16 Class C range) are accurate.

## Review Notes
- The "Wrong order" / "Correct order" example for rule precedence is correct but slightly subtle: `ufw insert 1 allow ...` followed by `ufw deny ...` only produces the right final ordering if applied to a fresh ruleset (or the prior deny has already been removed). On a ruleset that already contains the wrong-order deny, running `insert 1 allow` alone would fix it; running the second `deny` again would duplicate it. This is a presentation nuance, not a technical error.
- `rpcbind` (port 111) also listens on UDP in many deployments; the example only opens TCP. For NFSv4-only deployments TCP is sufficient, so this is correct as written for that common case.
- The IPv6 example uses `/32`, which is the entire RFC 3849 documentation block — a `/64` or `/48` would be more representative of a real allocation, but `/32` is syntactically valid and intentionally a documentation range.
- The "Block an entire country range" comment alongside `185.220.100.0/24` is loose phrasing (a /24 is 256 addresses, not a country), but it's clearly labeled as an example of a Tor exit node range, so not misleading.
