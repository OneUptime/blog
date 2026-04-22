# Validation Summary: How to Set the Don't Fragment (DF) Bit in IPv4 Packets

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- IPv4 fragmentation and DF bit
- Path MTU Discovery (PMTUD)
- Linux `ping`, `tracepath`, `tcpdump`, `ss`, `iptables`, and `iproute2`
- Python UDP sockets on Linux

## Sources Consulted
- RFC 791: Internet Protocol - https://www.rfc-editor.org/rfc/rfc791
- RFC 1191: Path MTU Discovery - https://www.rfc-editor.org/rfc/rfc1191
- Linux `ip(7)` manual for `IP_MTU_DISCOVER`, `IP_MTU`, and PMTUD socket behavior - https://www.man7.org/linux/man-pages/man7/ip.7.html
- Linux `ping(8)` manual for `-M do|want|probe|dont` - https://man7.org/linux/man-pages/man8/ping.8.html
- Linux `ip-route(8)` manual for `mtu` and `mtu lock` route attributes - https://man7.org/linux/man-pages/man8/ip-route.8.html
- Linux `iptables-extensions(8)` manual for the `MARK` target - https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- Linux `tracepath(8)` manual for PMTU discovery behavior - https://man7.org/linux/man-pages/man8/tracepath.8%40%40iputils.html
- Python `socket` module documentation - https://docs.python.org/3/library/socket.html
- Local Linux UAPI header `/usr/include/linux/in.h` for numeric `IP_MTU_DISCOVER`, `IP_MTU`, and `IP_PMTUDISC_*` values

## Issues Found
- The Python example used `socket.IP_MTU_DISCOVER`, `socket.IP_MTU`, and `socket.IP_PMTUDISC_*` constants directly. These constants are Linux socket constants, but Python does not expose all such names on every build; in the local Python 3.12.3 environment they were missing. Added Linux fallback values from `/usr/include/linux/in.h`.
- The Python example set `IP_PMTUDISC_DO` and then immediately set `IP_PMTUDISC_PROBE`, which overwrote the first setting. Changed `PROBE` to a commented diagnostic alternative and clarified that `PROBE` sets DF while ignoring cached PMTU.
- The Python example checked `e.errno == 90`. Replaced this with `errno.EMSGSIZE` and re-raised unrelated `OSError` exceptions.
- The ping examples described a 1448-byte ICMP payload as typical for GRE/IPsec VPNs. Reworded it as a 1476-byte tunnel path MTU example because tunnel and IPsec overhead varies by encapsulation and options.
- The TCP section said TCP always sets DF by default on Linux. Clarified that this is the normal default when PMTUD is enabled, because Linux can disable PMTUD through `net.ipv4.ip_no_pmtu_disc` or socket settings.
- The iptables section implied that `MARK --set-mark` can mark flows "to not be fragmented" and used `POSTROUTING`. Corrected it to explain that iptables MARK only labels packets for policy routing, moved the local-output example to the `OUTPUT` chain, and added `ip rule`/`ip route` examples for route MTU policy.
- The iptables section implied direct DF manipulation with iptables. Replaced that with the Linux `ip route ... mtu lock` behavior, which sends IPv4 packets without DF for that route.
- The ICMP section said the ICMP message includes the bottleneck MTU unconditionally. Clarified that this is the RFC 1191 behavior; older messages can omit the Next-Hop MTU.

## Review Notes
The `ping -M do -s 1472` example is correct for IPv4 without IP options: 1472 bytes of ICMP payload plus 8 bytes of ICMP header and 20 bytes of IPv4 header yields a 1500-byte IP packet. The commands use Linux-specific behavior and should be treated as Linux examples.
