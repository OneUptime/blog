# Validation Summary: How to Configure UFW for IPv6 on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- UFW (Uncomplicated Firewall)
- IPv6 / dual-stack networking
- iptables / ip6tables
- Ubuntu (18.04, 20.04, 22.04+)
- ICMPv6 (Neighbor Discovery Protocol)
- Linux networking (`/proc/sys/net/ipv6`, `ip` command)

## Sources Consulted
- UFW community documentation — https://help.ubuntu.com/community/UFW
- Ubuntu Server Guide (Firewall) — https://ubuntu.com/server/docs/security-firewall
- `ufw` man page and `/etc/default/ufw`, `/etc/ufw/before6.rules` defaults
- RFC 4861 (Neighbor Discovery for IPv6) — ICMPv6 type numbers
- RFC 4443 (ICMPv6) — message types
- IANA ICMPv6 Parameters — https://www.iana.org/assignments/icmpv6-parameters/icmpv6-parameters.xhtml
- RFC 4291 (IPv6 Addressing Architecture) — address scopes (fe80::/10, ff00::/8, ::1, ::/0)
- RFC 5375 (IPv6 Unicast Address Assignment Considerations)

## Issues Found
No technical issues found.

## Review Notes
- All CIDR arithmetic in the reference table is correct: /64 = 2^64 = 18,446,744,073,709,551,616 addresses; a /48 contains 2^16 = 65,536 /64 subnets; a /32 contains 2^16 = 65,536 /48 allocations.
- The rate-limiting description ("6 connections within 30 seconds") matches UFW's default `limit` behavior (implemented via the iptables `recent` module).
- ICMPv6 type numbers (Router Solicitation 133, Router Advertisement 134, Neighbor Solicitation 135, Neighbor Advertisement 136) are accurate, as are the `--hl-eq 255` hop-limit checks shown in the `before6.rules` excerpt.
- `disable_ipv6` semantics (0 = enabled, 1 = disabled) are correct.
- Address-scope examples (fe80::/10 link-local, ff00::/8 multicast, ::1 loopback, ::/0 any, ::ffff:x IPv4-mapped) are all correct.
- Minor (non-error) note: `ping6` is shown for connectivity testing; on modern Ubuntu the unified `ping -6` is also available, but `ping6` remains valid and is provided by iputils-ping. No change required.
- Minor (non-error) note: the `ip -6 addr show` example output is simplified (omits `qdisc`/`group` fields) but is not incorrect; left as-is to preserve author style.
