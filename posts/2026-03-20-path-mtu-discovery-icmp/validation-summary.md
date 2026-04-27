# Validation Summary: How to Understand Path MTU Discovery Using ICMP

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- ICMP (Type 3 Code 4 — Fragmentation Needed)
- IPv4 Path MTU Discovery (PMTUD)
- Linux iputils `ping`
- `tcpdump` BPF filters
- Linux `ip route` (iproute2)
- Python `socket` module / Linux socket options (`IP_MTU_DISCOVER`, `IP_PMTUDISC_*`)
- `iptables` (mangle table, TCPMSS target)

## Sources Consulted
- RFC 1191 — Path MTU Discovery (https://datatracker.ietf.org/doc/html/rfc1191)
- RFC 792 — Internet Control Message Protocol (https://datatracker.ietf.org/doc/html/rfc792)
- iputils `ping(8)` man page (https://manpages.debian.org/bookworm/iputils-ping/ping.8.en.html)
- `tcpdump(8)` / pcap-filter(7) man pages (https://www.tcpdump.org/manpages/pcap-filter.7.html)
- iproute2 `ip-route(8)` man page (https://manpages.debian.org/bookworm/iproute2/ip-route.8.en.html)
- Linux kernel `<linux/in.h>` for `IP_MTU_DISCOVER` and `IP_PMTUDISC_*` constants
- `iptables-extensions(8)` man page for the TCPMSS target (https://manpages.debian.org/bookworm/iptables/iptables-extensions.8.en.html)
- Python `socket` module documentation (https://docs.python.org/3/library/socket.html)

## Issues Found
No technical issues found.

Specific items verified:
- ICMP Type 3 Code 4 ("Destination Unreachable — Fragmentation Needed and DF set") is the correct trigger message for IPv4 PMTUD per RFC 1191.
- The packet-size arithmetic is correct: `ping -s 1472` produces a 1472-byte ICMP payload; adding the 8-byte ICMP echo header and 20-byte IPv4 header yields a 1500-byte IP datagram.
- `ping -M do` correctly sets the DF bit and prohibits local fragmentation (per the iputils `ping(8)` man page); the resulting `local error: Message too long, mtu=NNNN` message is what the kernel returns via `EMSGSIZE` when the cached PMTU is smaller than the requested size.
- The tcpdump filter `icmp[0]=3 and icmp[1]=4` is valid: byte 0 of the ICMP header is the Type field, byte 1 is the Code field.
- The Python socket option constants match the kernel definitions in `<linux/in.h>`: `IP_MTU_DISCOVER=10`, `IP_PMTUDISC_DONT=0`, `IP_PMTUDISC_WANT=1`, `IP_PMTUDISC_DO=2`.
- The iptables MSS-clamping rule (`-t mangle -A FORWARD -p tcp --tcp-flags SYN,RST SYN -j TCPMSS --clamp-mss-to-pmtu`) is the canonical form; matching `SYN,RST SYN` selects packets where SYN is set and RST is clear, which covers both SYN and SYN+ACK segments where MSS negotiation occurs.
- The Mermaid sequence diagram correctly depicts the RFC 1191 exchange: oversized DF=1 packet → ICMP Frag Needed with next-hop MTU → sender retransmits with reduced size.

## Review Notes
- The IPv4 route cache was removed in Linux 3.6; on modern kernels, `ip route show cache` displays PMTU next-hop exceptions rather than a full route cache, and `ip route flush cache` flushes those exceptions. Both commands still work as the post describes for PMTU purposes, so this is not an error, but readers on very old documentation may see slightly different output. `ip route get <dest>` is an alternative that explicitly shows learned PMTU for a single destination.
- The post is scoped to IPv4 (correctly noted in the tags). For IPv6 the equivalent message is ICMPv6 Type 2 (Packet Too Big) and PMTUD is mandatory because IPv6 routers do not fragment; that is out of scope here.
- Modern Python (3.x on Linux) exposes `socket.IP_MTU_DISCOVER` and the `socket.IP_PMTUDISC_*` constants directly, so the manual integer definitions in the example are not strictly required, but they are correct and make the example portable to older Python builds.
