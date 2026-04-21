# Validation Summary: How to Troubleshoot Dual-Stack IPv4/IPv6 Connectivity Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- Dual-stack IPv4/IPv6 networking
- DNS A and AAAA records
- Happy Eyeballs / protocol selection
- Linux routing and IPv6 sysctls
- Linux CLI tools: curl, ping, dig, host, ip, traceroute, ss, nc
- glibc getaddrinfo and /etc/gai.conf
- Python socket module

## Sources Consulted
- RFC 8305, Happy Eyeballs Version 2: https://datatracker.ietf.org/doc/rfc8305/
- RFC 6724, Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 8200, IPv6 Specification: https://www.rfc-editor.org/rfc/rfc8200
- curl manpage: https://curl.se/docs/manpage.html
- BIND 9 dig/host manual pages: https://bind9.readthedocs.io/en/v9.18.44/manpages.html
- Linux ping(8) manual page: https://man7.org/linux/man-pages/man8/ping.8.html
- Linux ip-route(8) manual page: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux traceroute(8) manual page: https://man7.org/linux/man-pages/man8/traceroute.8.html
- Linux ss(8) manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Linux gai.conf(5) manual page: https://man7.org/linux/man-pages/man5/gai.conf.5.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.12/networking/ip-sysctl.html
- Python socket.getaddrinfo documentation: https://docs.python.org/3/library/socket.html#socket.getaddrinfo
- OpenBSD nc(1) manual page: https://man.openbsd.org/nc.1

## Issues Found
1. **Oversimplified Happy Eyeballs behavior**: The post said clients try IPv6 first and fall back only if IPv6 fails. Updated the wording to reflect RFC 8305 behavior: clients prefer IPv6 but start IPv4 shortly after if IPv6 is slow or unreachable.

2. **Overstated IPv6 loopback expectation**: Changed "should always work" for `ping -6 ::1` to "should work if IPv6 stack is enabled" because the command can fail when IPv6 is disabled.

3. **Missing link-local gateway syntax**: Added a `ping -6 fe80::1%eth0` example because link-local IPv6 destinations commonly need an output interface or zone identifier.

4. **DNS record type confused with DNS transport**: The original `dig -4 A` and `dig -6 AAAA` comments implied `-4` and `-6` selected A/AAAA record families. In BIND dig, those flags select DNS query transport. Replaced the record-type test with `dig A` and `dig AAAA`, then added separate `dig -4` / `dig -6` transport examples.

5. **Overcertain fallback/latency claims**: Changed statements that broken AAAA records "hang" or "will be slow" to "may stall" or "may be slow" because Happy Eyeballs implementations can reduce the delay.

6. **MTU example mixed minimum MTU with 1500-byte testing**: Added a 1232-byte ICMPv6 payload example for the IPv6 1280-byte minimum MTU, kept the 1452-byte payload as a 1500-byte path test, and clarified that failures may indicate MTU or ICMPv6 Packet Too Big handling issues.

7. **/etc/gai.conf commands and wording needed precision**: Replaced the `cat | grep` example with direct `grep -vE`, made the `sed` expression use POSIX character classes, and clarified that default policy generally prefers IPv6 when both addresses are suitable.

8. **Listener expectations were too strict**: Clarified that IPv4 and IPv6 listeners may appear separately, and that on Linux an IPv6 wildcard listener may also accept IPv4 when `net.ipv6.bindv6only=0`.

9. **netcat examples could hang or send an incomplete HTTP request**: Replaced bare `nc` connection tests with `nc -vz -w 5` and replaced the single-line `echo` request with a CRLF-terminated `printf` HTTP request including a blank line.

## Review Notes
- The commands are Linux-oriented, especially `/proc/sys/net/ipv6`, `ip`, `ss`, and `/etc/gai.conf`.
- `traceroute` may need to be installed separately on some Linux distributions.
- The author link is plausible and no external content links in the post required correction.
