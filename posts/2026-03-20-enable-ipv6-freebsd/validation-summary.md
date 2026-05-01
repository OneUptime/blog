# Validation Summary: How to Enable IPv6 on FreeBSD

## Status
validated

## Post Type
Guide

## Technologies Covered
- FreeBSD
- IPv6
- `rc.conf`
- `ifconfig`
- `rtsold`
- `rtsol`
- `route`
- `sysctl`
- DNS resolver configuration

## Sources Consulted
- FreeBSD Handbook, Network chapter: https://docs.freebsd.org/en/books/handbook/network/
- FreeBSD Developers' Handbook, IPv6 Internals: https://docs.freebsd.org/en/books/developers-handbook/ipv6/
- FreeBSD `rc.conf(5)` manual: https://man.freebsd.org/cgi/man.cgi?query=rc.conf&sektion=5&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly
- FreeBSD `ifconfig(8)` manual: https://man.freebsd.org/cgi/man.cgi?query=ifconfig&sektion=8&manpath=FreeBSD+14.4-RELEASE+and+Ports
- FreeBSD `route(8)` manual: https://man.freebsd.org/cgi/man.cgi?query=route&sektion=8&manpath=FreeBSD+15.0-STABLE
- FreeBSD `ping6(8)` manual: https://man.freebsd.org/cgi/man.cgi?query=ping6&sektion=8&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly
- FreeBSD `resolvconf(8)` manual: https://man.freebsd.org/cgi/man.cgi?query=resolvconf&manpath=FreeBSD+15.0-RELEASE+and+Ports.quarterly

## Issues Found
- The post described `net.inet6.ip6.forwarding` and `net.inet6.ip6.accept_rtadv` as checking whether IPv6 is "enabled in the kernel". That wording was inaccurate because those sysctls control forwarding and Router Advertisement behavior, not basic kernel IPv6 support. The comment was corrected.
- The SLAAC `rc.conf` example set `rtsold_flags="-aF"`. This was removed because the FreeBSD Handbook only requires `ifconfig_em0_ipv6="inet6 accept_rtadv"` and `rtsold_enable="YES"`, while `-F` also forces host-mode behavior by disabling IPv6 forwarding and `-a` is unnecessary for a specific interface-focused example.
- The static `rc.conf` example only restarted `netif`. Since `ipv6_defaultrouter` is part of route configuration, `service routing restart` was added so the default IPv6 route is applied immediately.
- The immediate `ifconfig` example did not fully enable IPv6 on interfaces that start with the `IFDISABLED` flag, and the SLAAC example did not actually solicit Router Advertisements immediately. The post was corrected to use `ifconfig em0 inet6 -ifdisabled`, add the address with `alias`, and run `rtsol em0` after enabling `accept_rtadv`.
- The post did not mention the documented FreeBSD requirement that a forwarding system using SLAAC must set `net.inet6.ip6.rfc6204w3=1`. This caveat was added to the forwarding section and summary.

## Review Notes
- Manual edits to `/etc/resolv.conf` can be overwritten later by DHCP, DHCPv6, or Router Advertisement-driven resolver tooling, depending on how the host is configured.
