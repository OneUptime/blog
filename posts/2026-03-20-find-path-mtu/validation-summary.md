# Validation Summary: How to Find the Path MTU Between Two Hosts

## Status
validated

## Post Type
Guide

## Technologies Covered
- Path MTU Discovery (PMTUD)
- Linux networking
- `tracepath` / iputils
- `ping` / ICMP
- Python `socket` API
- TCP and UDP
- PPPoE, GRE, VXLAN, IPsec, and WireGuard encapsulation overhead

## Sources Consulted
- Linux `tracepath(8)` manual page (iputils): https://man7.org/linux/man-pages/man8/tracepath.8.html
- Linux `ping(8)` manual page (iputils): https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `ip(7)` manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- Linux `udp(7)` manual page: https://man7.org/linux/man-pages/man7/udp.7.html
- Linux `ipv6(7)` manual page: https://man7.org/linux/man-pages/man7/ipv6.7.html
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- RFC 1191, Path MTU Discovery: https://www.rfc-editor.org/rfc/rfc1191
- RFC 2516, PPP over Ethernet (PPPoE): https://www.rfc-editor.org/rfc/rfc2516
- RFC 2784, Generic Routing Encapsulation (GRE): https://www.rfc-editor.org/rfc/rfc2784
- RFC 4303, IP Encapsulating Security Payload (ESP): https://www.rfc-editor.org/rfc/rfc4303.html
- RFC 4106, AES-GCM for ESP: https://www.rfc-editor.org/rfc/rfc4106.html
- RFC 7348, VXLAN: https://www.rfc-editor.org/rfc/rfc7348.html
- WireGuard `wg-quick(8)` manual page: https://man7.org/linux/man-pages/man8/wg-quick.8.html
- Linux UAPI header for IPv4 socket option numbers: `/usr/include/linux/in.h`

## Issues Found
- The `tracepath` section incorrectly described `tracepath` as reporting MTU at each hop. I corrected it to reflect current iputils behavior: it reports PMTU changes along the path, the last reported `pmtu` is the current path MTU, and IPv6 usage is `tracepath -6` rather than `tracepath6`.
- The `ping` binary-search script had an off-by-one bug. It printed `HIGH`, which is the first failing MTU, instead of `LOW`, which is the largest successful MTU. I fixed the result and payload calculations to use `LOW`.
- The `ping` script comment said `576` was the minimum IPv4 MTU per RFC. That was inaccurate in this context. I changed the lower bound comment to match RFC 1191's PMTU floor guidance and made the example explicitly IPv4 with `ping -4`.
- The Python example relied on `socket.IP_MTU_DISCOVER` and `socket.IP_MTU` always being exposed by Python. They are platform-dependent and were not present in the local Python runtime. I changed the snippet to use Linux-documented socket option numbers as fallbacks.
- The Python example also overstated what the socket call returns. I updated it to describe and print Linux's current PMTU estimate from `IP_MTU`, and to refresh that estimate after an `EMSGSIZE` error rather than claiming exact discovery from `IP_PMTUDISC_PROBE`.
- The verification section used a very specific `ping` error string that is not stable across environments. I generalized it to fragmentation-needed / message-too-long errors that include the MTU.
- The TCP verification example could race `ss` against the background `iperf3` connection. I added a short `sleep` and adjusted the `grep` to match `mss` or `pmtu`.
- The IPsec table entry was too precise for a highly variable overhead. I replaced it with a bounded range and an explicit note that cipher, mode, and NAT-T affect the effective MTU.

## Review Notes
- The post is Linux-specific. `tracepath`, `ping -M`, `ss`, and the `IP_MTU` / `IP_MTU_DISCOVER` socket options are not portable to all Unix-like systems.
- The encapsulation values in the table are still approximate operational defaults rather than protocol-mandated PMTUs; actual effective MTU depends on the exact tunnel mode, outer IP version, and deployment details.
- The socket example now accurately reflects Linux's documented PMTU estimate behavior. Exact application-layer probing is possible, but it requires more advanced Linux error-queue handling than this post covers.
