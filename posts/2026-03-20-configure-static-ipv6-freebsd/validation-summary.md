# Validation Summary: How to Configure Static IPv6 Addresses on FreeBSD

## Status
validated

## Post Type
Tutorial / Reference Guide

## Technologies Covered
- FreeBSD (network configuration)
- IPv6
- `/etc/rc.conf` (FreeBSD service configuration)
- `ifconfig(8)` (FreeBSD interface configuration utility)
- `route(8)` (FreeBSD routing utility)
- `netstat(1)` (FreeBSD network statistics utility)
- `service(8)` (FreeBSD service management)
- `/etc/resolv.conf` (resolver configuration)
- `ping6(8)` / IPv6 connectivity testing
- `host(1)` (DNS lookup tool)

## Sources Consulted
- FreeBSD Handbook — Network chapter (https://docs.freebsd.org/en/books/handbook/network/)
- FreeBSD `rc.conf(5)` man page (https://man.freebsd.org/cgi/man.cgi?rc.conf)
- FreeBSD `ifconfig(8)` man page (https://man.freebsd.org/cgi/man.cgi?ifconfig)
- FreeBSD `route(8)` man page (https://man.freebsd.org/cgi/man.cgi?route)
- FreeBSD `/etc/defaults/rc.conf` defaults
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation — 2001:db8::/32)
- RFC 4193 (Unique Local IPv6 Unicast Addresses — fd00::/8)

## Issues Found
No technical issues found.

The post correctly documents:
- `ifconfig_em0_ipv6="inet6 <addr> prefixlen <n>"` rc.conf syntax for primary IPv6 addresses.
- `ipv6_defaultrouter="<gw>"` rc.conf variable for IPv6 default route.
- `ifconfig_em0_aliasN="inet6 ..."` modern unified alias syntax (introduced in FreeBSD 9+).
- `ipv6_activate_all_interfaces="YES"` for enabling IPv6 on all interfaces.
- `service netif restart` and `service routing restart` to apply network/routing config without reboot.
- `route -6 add/delete default <gw>` — the `-6` flag is documented in route(8).
- `netstat -rn -f inet6` for displaying the IPv6 routing table.
- Use of RFC 3849 documentation prefix (2001:db8::/32) and RFC 4193 ULA prefix (fd00::/8).
- Link-local address output format with zone identifier (`fe80::...%em0`) and `scopeid`.

## Review Notes
- `ping6` is still available in modern FreeBSD; in FreeBSD 13+ `ping` was unified to support both address families, but `ping6` remains as a compatibility command. The post's usage is fine.
- `host` is not part of the FreeBSD base system in modern releases — it requires installing `dns/bind-tools` (or similar). Users without the package installed could alternatively use `drill -t AAAA google.com`. This is a minor caveat, not an error.
- `service netif restart` restarts all interfaces; for a single interface, `service netif restart em0` is less disruptive. The post's approach works correctly but could briefly affect other interfaces.
- The example `fd00:db8::/48` is technically a valid ULA, though real ULA prefixes should use a randomly generated 40-bit Global ID per RFC 4193. This is acceptable for a documentation example.
- `ifconfig em0 inet6 alias <addr> prefixlen 64` — the `alias` keyword position is flexible in ifconfig; both pre- and post-address placement are accepted by the parser.
