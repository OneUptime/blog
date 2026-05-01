# Validation Summary: How to Configure Firewall Rules for 6in4 and 6to4 Tunnels (Protocol 41)

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv4 and IPv6 tunneling
- 6in4
- 6to4
- `iptables`
- `ip6tables`
- `nftables`
- `netfilter-persistent`
- Linux networking tools such as `ping`, `traceroute`, and `ip`

## Sources Consulted
- RFC 4213, "Basic Transition Mechanisms for IPv6 Hosts and Routers": https://datatracker.ietf.org/doc/html/rfc4213
- RFC 3056, "Connection of IPv6 Domains via IPv4 Clouds": https://datatracker.ietf.org/doc/rfc3056/
- RFC 7526, "Deprecating the Anycast Prefix for 6to4 Relay Routers": https://datatracker.ietf.org/doc/html/rfc7526
- RFC 3849, "IPv6 Address Prefix Reserved for Documentation": https://datatracker.ietf.org/doc/rfc3849/
- `iptables(8)` manual: https://manpages.debian.org/iptables/iptables.8
- `nftables(8)` manual: https://manpages.debian.org/bookworm/nftables/nftables.8.en.html
- `ping(8)` Linux man page: https://man7.org/linux/man-pages/man8/ping.8.html
- `traceroute(8)` Linux man page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- `netfilter-persistent(8)` Ubuntu man page: https://manpages.ubuntu.com/manpages/focal/man8/netfilter-persistent.8.html

## Issues Found
- The 6to4 section presented the historical anycast relay address `192.88.99.1` as normal guidance. I updated it to mark 6to4 as a legacy mechanism and note that RFC 7526 deprecated the anycast relay for new deployments.
- The Debian/Ubuntu persistence example used `iptables-save > /etc/iptables/rules.v4` as if it always enabled boot-time persistence. I changed it to `netfilter-persistent save` and scoped it to systems using `netfilter-persistent` or `iptables-persistent`.
- The `nftables` example matched `meta l4proto 41`. I changed it to `ip protocol 41`, which more directly matches the outer IPv4 protocol field used for IPv6-in-IPv4 encapsulation, and clarified that the rule assumes an existing `inet` filter table.
- The verification example used `ping6 2001:db8::1`. I replaced it with `ping -6` and a real reachable IPv6 target because `2001:db8::/32` is reserved for documentation and should not be used as a live destination.
- The stateful inspection note said firewalls cannot track protocol 41. I corrected this to the more accurate operational guidance that explicit protocol 41 ACCEPT rules are often still required.

## Review Notes
- 6to4 remains technically valid in the narrow sense that the mechanism exists, but it is a legacy transition technology and should generally not be used for new deployments.
- The `ip6tables` examples are intentionally broad. In production, these rules are usually tightened to specific interfaces, prefixes, or forwarding paths.
- `ping6` and `traceroute6` aliases still exist on some systems, but current Linux manuals document `ping -6` and `traceroute -6` as the modern forms.
