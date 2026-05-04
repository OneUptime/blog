# Validation Summary: How to Configure IPv6 with rc.conf on FreeBSD

## Status
validated

## Post Type
Reference / Configuration Guide

## Technologies Covered
- FreeBSD operating system
- IPv6 networking
- `/etc/rc.conf` configuration
- SLAAC (Stateless Address Autoconfiguration)
- `rtsold(8)` Router Solicitation daemon
- `rtadvd(8)` Router Advertisement daemon
- FreeBSD `service(8)` command (`netif`, `routing`, `rtsold`, `rtadvd`)
- `ifconfig(8)` IPv6 syntax

## Sources Consulted
- FreeBSD rtsold(8) manual page: https://man.freebsd.org/cgi/man.cgi?query=rtsold&sektion=8
- FreeBSD rc.conf(5) manual page: https://man.freebsd.org/cgi/man.cgi?query=rc.conf&sektion=5
- FreeBSD source `libexec/rc/rc.conf` (defaults): https://github.com/freebsd/freebsd-src/blob/main/libexec/rc/rc.conf
- FreeBSD source `libexec/rc/rc.d/netif`: https://github.com/freebsd/freebsd-src/blob/main/libexec/rc/rc.d/netif
- FreeBSD Handbook, Network chapter: https://docs.freebsd.org/en/books/handbook/network/
- RFC 3849 (IPv6 Address Prefix Reserved for Documentation): `2001:db8::/32`

## Issues Found

1. **Incorrect description of `rtsold` `-F` flag.**
   - Original comment: `# -a: autodetect interfaces, -F: flush existing routes`
   - The `-F` flag does not flush routes. Per the FreeBSD rtsold(8) man page, `-F` "explicitly configure[s] the kernel to accept Router Advertisements and disable IPv6 forwarding" (i.e. it sets `net.inet6.ip6.accept_rtadv=1` and `net.inet6.ip6.forwarding=0`).
   - Updated comment to: `# -a: autoprobe interfaces, -F: configure kernel to accept RAs and disable IPv6 forwarding`.

2. **Invalid IPv6 literals used as placeholders.**
   - `2001:db8:upstream::1`, `2001:db8:downstream::1`, `2001:db8:remote::/48`, and `2001:db8::gateway` are not syntactically valid IPv6 addresses (the words `upstream`, `downstream`, `remote`, and `gateway` are not hex digits). If a reader copy-pasted these into `/etc/rc.conf` they would fail to parse.
   - Replaced with valid hex examples within the documentation prefix `2001:db8::/32` (RFC 3849): `2001:db8:1::1`, `2001:db8:2::1`, `2001:db8:1::/48`, and `2001:db8::1`.

## Review Notes
- The post sets `rtsold_flags="-aF"`, which is non-default — FreeBSD's `/etc/defaults/rc.conf` ships with `rtsold_flags="-i"`. Using `-aF` is still valid and sometimes recommended for hosts that want rtsold to manage the relevant `accept_rtadv` / `forwarding` sysctls automatically; this is a stylistic choice rather than an error.
- `ipv6_route_<name>` accepts both CIDR-suffix (`2001:db8:1::/48 gateway`) and `-prefixlen` (`2001:db8:1:: -prefixlen 48 gateway`) forms via `route(8)`. The default `/etc/defaults/rc.conf` example uses `-prefixlen`; the post's CIDR form also works and was left as-is.
- The example `service netif restart em0` is supported — the netif rc.d script accepts an interface name as a positional argument.
- IPv6 documentation prefix `2001:db8::/32` (RFC 3849) is used appropriately throughout; readers should substitute their own assigned prefix in production.
- Defaults note: `ipv6_activate_all_interfaces` defaults to `NO`, so IPv6 is only initialized on interfaces with explicit `ifconfig_<iface>_ipv6` (or `_alias`) configuration unless this is enabled, as the post correctly states.
