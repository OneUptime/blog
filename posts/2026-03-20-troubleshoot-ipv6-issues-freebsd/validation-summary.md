# Validation Summary: How to Troubleshoot IPv6 Issues on FreeBSD

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- FreeBSD IPv6 networking
- ifconfig, ping/ping6, route, netstat
- Neighbor Discovery Protocol (NDP)
- SLAAC, Router Solicitation, Router Advertisement
- rtsold/rtsol
- pf, ipfw, tcpdump
- resolv.conf DNS configuration

## Sources Consulted
- FreeBSD ifconfig(8): https://man.freebsd.org/cgi/man.cgi?query=ifconfig&sektion=8
- FreeBSD ping(8) / ping6 compatibility: https://man.freebsd.org/cgi/man.cgi?query=ping6&sektion=8
- FreeBSD route(8): https://man.freebsd.org/cgi/man.cgi?query=route&sektion=8
- FreeBSD netstat(1): https://man.freebsd.org/cgi/man.cgi?query=netstat&sektion=1
- FreeBSD ndp(8): https://man.freebsd.org/cgi/man.cgi?query=ndp&sektion=8
- FreeBSD rtsold(8) / rtsol(8): https://man.freebsd.org/cgi/man.cgi?query=rtsol&sektion=8
- FreeBSD rc.conf(5): https://man.freebsd.org/cgi/man.cgi?query=rc.conf&sektion=5
- FreeBSD rc.subr(8): https://man.freebsd.org/cgi/man.cgi?query=rc.subr&sektion=8
- FreeBSD grep(1): https://man.freebsd.org/cgi/man.cgi?query=grep&sektion=1
- FreeBSD resolver(5): https://man.freebsd.org/cgi/man.cgi?query=resolver&sektion=5
- RFC 4861, Neighbor Discovery for IPv6: https://www.rfc-editor.org/rfc/rfc4861
- RFC 4862, IPv6 Stateless Address Autoconfiguration: https://www.rfc-editor.org/rfc/rfc4862
- RFC 8106, IPv6 Router Advertisement DNS options: https://www.rfc-editor.org/rfc/rfc8106

## Issues Found
- The post said no link-local address means IPv6 is disabled. FreeBSD normally auto-configures link-local addresses for IPv6-enabled interfaces, but automatic link-local configuration can also be disabled, so the wording was softened to avoid an over-specific diagnosis.
- The `ndp -n em0 fe80::1` command was invalid for sending a Neighbor Solicitation. FreeBSD ndp(8) does not use that syntax; the example now uses `ping6 -c 1 fe80::1%em0` to trigger neighbor discovery.
- The `service rtsold start` troubleshooting command may do nothing when `rtsold_enable` is not set in rc.conf. It was changed to `service rtsold onestart`, which is the rc.subr-supported one-time start form that skips the rcvar check.
- The `net.inet6.ip6.accept_rtadv` note incorrectly implied the sysctl should be `0`. FreeBSD documents it as controlling the default for per-interface Router Advertisement acceptance, so the text now says to check the per-interface setting.
- The per-interface `accept_rtadv` grep was case-sensitive, but FreeBSD ifconfig output shows `ACCEPT_RTADV` in `nd6 options`. It now uses `grep -i`.
- Several grep examples used basic grep with alternation syntax. They now use `grep -E` or `grep -Ei`, matching FreeBSD grep(1)'s documented extended-regular-expression mode.
- The "No IPv6 address at all" diagnostic checked only `RUNNING` or `UP`, which does not show whether IPv6 is enabled. It now checks for IPv6 address/ND6 state indicators such as `inet6`, `IFDISABLED`, and `AUTO_LINKLOCAL`.

## Review Notes
- The `tcpdump` ICMPv6 type filters using `ip6[40]` are suitable for normal Router Advertisement and Neighbor Discovery troubleshooting, but they assume the ICMPv6 header begins immediately after the fixed IPv6 header.
- The post uses `ping6`, which remains supported for backward compatibility on current FreeBSD through the ping(8) implementation.
