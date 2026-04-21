# Validation Summary: How to Test Dual-Stack Connectivity

## Status
validated

## Post Type
Technical guide / troubleshooting tutorial

## Technologies Covered
- IPv4 and IPv6 dual-stack networking
- ICMP ping and ICMPv6
- Linux, macOS/BSD, and Windows network troubleshooting commands
- DNS A and AAAA record lookup
- HTTP/HTTPS connectivity testing with curl
- Linux iproute2 routing and socket inspection
- SSH and OpenSSL TLS connectivity tests
- IPv6 Path MTU Discovery

## Sources Consulted
- iputils ping manual: https://manpages.debian.org/testing/iputils-ping/ping.8.en.html
- Linux traceroute manual: https://www.man7.org/linux/man-pages/man8/traceroute.8.html
- Microsoft ping command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/ping
- Microsoft tracert command documentation: https://learn.microsoft.com/en-us/windows-server/administration/windows-commands/tracert
- ISC BIND 9 dig manual: https://downloads.isc.org/isc/bind9/9.20.11/doc/arm/html/manpages.html#dig-dns-lookup-utility
- systemd resolvectl manual: https://www.freedesktop.org/software/systemd/man/latest/resolvectl.html
- Microsoft Resolve-DnsName documentation: https://learn.microsoft.com/en-us/powershell/module/dnsclient/resolve-dnsname
- curl manual: https://man7.org/linux/man-pages/man1/curl.1.html
- Linux ip-route manual: https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux ss manual: https://man7.org/linux/man-pages/man8/ss.8.html
- OpenSSH ssh manual: https://man.openbsd.org/ssh
- OpenSSL s_client manual: https://docs.openssl.org/3.2/man1/openssl-s_client/
- RFC 6724, Default Address Selection for IPv6: https://datatracker.ietf.org/doc/html/rfc6724
- RFC 8201, Path MTU Discovery for IPv6: https://datatracker.ietf.org/doc/html/rfc8201
- RFC 4443, ICMPv6 Packet Too Big messages: https://datatracker.ietf.org/doc/rfc4443/
- test-ipv6.com: https://test-ipv6.com
- ipv6-test.com: https://ipv6-test.com
- whatismyv6ip.com: https://www.whatismyv6ip.com
- RIPE Atlas: https://atlas.ripe.net
- Hurricane Electric BGP Toolkit: https://bgp.he.net

## Issues Found
- The Windows examples used hyphen switches for `ping` and `tracert`. Microsoft documents these options as `/6` and `/4`, so the Windows examples were updated to the documented syntax.
- The Linux link-local ping example used `ping6`. Current iputils documents `ping -6` and notes that `ping6` has been merged into `ping`, so the example now uses `ping -6 fe80::1%eth0`.
- The curl sample output included stale hard-coded `example.com` IPv4 and IPv6 addresses. These were replaced with generic placeholders so the post remains correct even if DNS answers change.
- The online tools table listed `whatismyipv6.com`, which could not be validated as a reachable current tool. It was replaced with the verified `https://www.whatismyv6ip.com`.
- The HTTPS-to-IPv6-literal curl example could fail due to TLS certificate hostname/SNI mismatch rather than IPv6 reachability. It was changed to use `curl --resolve` with an IPv6 address, preserving the hostname for Host/SNI and certificate validation.

## Review Notes
The remaining examples are technically valid. The `192.0.2.0/24` and `2001:db8::/32` addresses are documentation placeholders and should be replaced with real local addresses when used. For `ping -s`, the size is ICMP payload data, not the full IPv6 packet size. Some browser-based IPv6 test sites require JavaScript, so CLI checks may not show the same results as a browser.
