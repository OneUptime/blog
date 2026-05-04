# Validation Summary: How to Configure IPv6 SLAAC on FreeBSD

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- IPv6 Stateless Address Autoconfiguration (SLAAC)
- FreeBSD operating system (rc.conf, sysctl, ifconfig)
- rtsold(8) / rtsol — Router Solicitation daemon
- ICMPv6 Router Advertisements (RA) and Router Solicitations (RS)
- RFC 4861 (Neighbor Discovery), RFC 4941 / RFC 8981 (Privacy Extensions / Temporary Addresses)
- FreeBSD service(8) and netif rc script

## Sources Consulted
- FreeBSD rtsold(8) man page — https://man.freebsd.org/cgi/man.cgi?query=rtsold&sektion=8
- FreeBSD ifconfig(8) man page — https://man.freebsd.org/cgi/man.cgi?query=ifconfig&sektion=8
- FreeBSD Handbook — Advanced Networking — https://docs.freebsd.org/en/books/handbook/advanced-networking/
- FreeBSD Forums discussion on IPv6 temporary addresses — https://forums.freebsd.org/threads/no-ipv6-temporary-addresses.73591/
- RFC 8981 (Temporary Address Extensions for SLAAC) — https://datatracker.ietf.org/doc/rfc8981/
- madboa.com FreeBSD IPv6 on CenturyLink — https://www.madboa.com/blog/2020/08/29/freebsd-ipv6/

## Issues Found

1. **Incorrect description of `rtsold -F` flag (two locations)**
   - The post originally claimed `-F` means "flush existing default route before accepting new one from RA" and "flush existing routes before processing RA".
   - Per the FreeBSD rtsold(8) man page, `-F` actually means: "Explicitly configure the kernel to accept Router Advertisements and disable IPv6 forwarding."
   - Fixed both occurrences (in the rc.conf comment and in the "Understanding rtsold Flags" section) to describe the flag accurately.

2. **Non-existent `-v` (verbose) flag for rtsold**
   - The post listed `-v = verbose output` for rtsold. The FreeBSD rtsold(8) man page does not include a `-v` flag; rtsold uses `-d` for debug and `-D` for more debug output. Verbosity is controlled by debug levels, not a `-v` flag.
   - Replaced the `-v` line with the valid `-D` (more debugging) and `-1` (send only one solicitation per interface and exit) flags so the reference list is accurate.

3. **Wrong flag string for ifconfig temporary-address grep**
   - The post used `ifconfig em0 | grep 'inet6.*tempaddr'` to verify RFC 4941 temporary addresses.
   - FreeBSD's ifconfig(8) prints temporary SLAAC addresses with the flag `temporary` (typically alongside `autoconf`), not `tempaddr` (which is the Linux/iproute2 token). The grep would have returned nothing on FreeBSD.
   - Changed to `grep 'inet6.*temporary'` so the verification command actually matches FreeBSD's ifconfig output.

## Review Notes

- `rtsol` is correctly used as a one-shot variant: invoking the binary as `rtsol` is equivalent to `rtsold -f1` with the specified interface(s), per the man page.
- `ifconfig_em0_ipv6="inet6 accept_rtadv"` is valid FreeBSD rc.conf syntax (the `_ipv6` suffix is the documented form for IPv6 interface settings; `_inet6` also works as an alias).
- `rtsold_enable="YES"` is the correct rc.conf knob to enable the rtsold service at boot.
- `service netif restart em0` and `service rtsold start` are valid FreeBSD service commands.
- `net.inet6.ip6.use_tempaddr` and `net.inet6.ip6.prefer_tempaddr` are valid FreeBSD sysctls for enabling RFC 4941/8981 privacy extensions.
- `ping6` is still available on FreeBSD and works for the example shown, though modern FreeBSD also accepts `ping -6`. The post's usage is fine.
- The example IPv6 prefix `2001:db8::/64` is correctly within the documentation prefix reserved by RFC 3849, which is the right choice for examples.
- Google Public DNS IPv6 addresses (`2001:4860:4860::8888`, `2001:4860:4860::8844`) used in the resolv.conf example are correct.
