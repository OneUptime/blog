# Validation Summary: How to Identify and Fix TCP MSS (Maximum Segment Size) Issues

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- MSS and MTU
- Path MTU Discovery (PMTUD)
- ICMP fragmentation-needed handling
- Linux networking tools (`tcpdump`, `ping`, `tracepath`, `ss`, `ip`)
- Netfilter/`iptables` TCPMSS clamping
- `systemd-networkd`

## Sources Consulted
- RFC 6691, "TCP Options and Maximum Segment Size (MSS)" https://www.rfc-editor.org/rfc/rfc6691
- RFC 1191, "Path MTU Discovery" https://www.rfc-editor.org/rfc/rfc1191
- RFC 2923, "TCP Problems with Path MTU Discovery" https://www.rfc-editor.org/rfc/rfc2923.html
- `iptables-extensions(8)` https://man7.org/linux/man-pages/man8/iptables-extensions.8.html
- `iptables-save(8)` https://man7.org/linux/man-pages/man8/iptables-save.8.html
- `ping(8)` https://man7.org/linux/man-pages/man8/ping.8.html
- `tracepath(8)` https://man7.org/linux/man-pages/man8/tracepath.8.html
- `ss(8)` https://man7.org/linux/man-pages/man8/ss.8.html
- `ip-link(8)` https://man7.org/linux/man-pages/man8/ip-link.8.html
- `systemd.network(5)` https://man7.org/linux/man-pages/man5/systemd.network.5.html
- `tcpdump(8)` https://man7.org/linux/man-pages/man8/tcpdump.8.html
- strongSwan documentation, "Forwarding and Split-Tunneling" https://docs.strongswan.org/docs/latest/howtos/forwarding.html

## Issues Found
- The introduction stated `MSS = MTU - 40 bytes for IP+TCP headers` as a general rule. I narrowed this to IPv4 and the fixed IP/TCP headers, which matches RFC 6691.
- The `ping -s` examples were numerically incorrect for relating ICMP probe size to path MTU. I changed them from `1432`/`1380` to `1472`/`1392` so the comments now correctly describe 1500-byte and 1420-byte IPv4 packets. `ping -s` sets ICMP payload size, so the 20-byte IPv4 header and 8-byte ICMP header must be added separately.
- The tunnel-specific `iptables` example mixed a `tun0` interface example with an IPsec-specific comment/value that did not line up cleanly with the earlier 1420-byte MTU worked example. I kept `tun0` as an example interface, clarified that it should be replaced as needed, and aligned the explicit MSS value to `1380`.
- The interface-MTU examples used `1400` while the surrounding worked example used a 1420-byte tunnel MTU. I changed the `ip link` and `MTUBytes=` examples to `1420` so the numeric guidance is internally consistent.
- The `iptables-save > /etc/iptables/rules.v4` line was written as a generic "save rules" step. I kept the command but labeled it as an example for systems using `iptables-persistent`, because `iptables-save` itself only writes the current ruleset and persistence is distro-specific.

## Review Notes
- The post is IPv4-centric. For IPv6, the header math and fragmentation behavior differ, and `--clamp-mss-to-pmtu` uses `path_MTU - 60` for IPv6 according to `iptables-extensions(8)`.
- The Linux commands used in the post are current and syntactically valid as of 2026-04-30.
- The post uses `iptables`, which remains valid on current Linux systems, including installations using the nftables backend. Some environments may still prefer native `nftables` syntax for new deployments.
