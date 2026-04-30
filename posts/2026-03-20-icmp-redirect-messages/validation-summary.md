# Validation Summary: How to Interpret ICMP Redirect Messages

## Status
validated

## Post Type
Guide / Reference

## Technologies Covered
- ICMP
- IPv4 routing
- Linux networking sysctls
- `tcpdump`
- `iproute2`

## Sources Consulted
- RFC 792: Internet Control Message Protocol — https://www.rfc-editor.org/rfc/rfc792
- RFC 1122: Requirements for Internet Hosts -- Communication Layers — https://www.rfc-editor.org/rfc/rfc1122.txt
- RFC 1812: Requirements for IP Version 4 Routers — https://www.rfc-editor.org/rfc/rfc1812
- Linux kernel IP sysctl documentation — https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-route(8)` Linux manual page — https://man7.org/linux/man-pages/man8/ip-route.8.html
- Local CLI verification: `sysctl --help`
- Local CLI verification: `tcpdump --help`
- Local CLI verification: `tcpdump -ddd 'icmp[0] = 5'`

## Issues Found
- The post told readers to inspect redirect-modified routes with `ip route show cache`. This is outdated for current Linux kernels because the IPv4 route cache was removed in Linux 3.6. I replaced those commands with `ip route get 10.20.0.5` and added a note explaining why.
- The line saying Linux accepts redirects by default for "non-routers" was imprecise. I changed it to say the default is enabled on hosts and disabled when IPv4 forwarding is enabled, matching current kernel documentation.
- The hardening example disabled `send_redirects` under `all` but not under `default`. I added `net.ipv4.conf.default.send_redirects=0` so newly created interfaces inherit the permanent setting.
- The statement that redirects are "disabled by default on routers" was too broad. I changed it to say they are often disabled as a hardening measure.

## Review Notes
- RFC 792 defines ICMP Redirect codes 0-3, but RFC 1812 says compliant routers must not generate Network Redirect and Network+ToS Redirect messages (codes 0 and 2). The post's code table is still valid as a reference to the defined codes.
- The packet capture filter `tcpdump -i eth0 -n -v 'icmp[0] = 5'` is syntactically valid and compiles correctly with current `tcpdump`.
