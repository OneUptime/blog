# Validation Summary: How to Troubleshoot IPv6 Streaming Latency Issues

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- IPv6 networking (ping6, traceroute6, tracepath6, ip -6)
- Linux kernel sysctl tuning (TCP buffer sizes)
- iptables/ip6tables (mangle table, DSCP marking)
- ICMPv6 / NDP (neighbor discovery)
- tcpdump packet analysis
- iperf3 throughput testing
- Hurricane Electric BGP whois tooling
- Streaming protocols: RTMP, HLS, SRT, WebRTC, RTMFP
- nginx-rtmp-module configuration
- ffmpeg with SRT output
- DSCP / QoS (RFC 4594 service classes)

## Sources Consulted
- RFC 4594 (Configuration Guidelines for DiffServ Service Classes) — CS3 vs AF31 classification
- iputils `tracepath`/`tracepath6` output format
- Hurricane Electric BGP toolkit (whois.he.net vs route-server.he.net)
- nginx-rtmp-module directive reference (github.com/arut/nginx-rtmp-module)
- Adobe RTMP specification (TCP-based transport)
- Haivision SRT protocol documentation (default `SRTO_LATENCY` = 120ms)
- Linux iproute2 / ip6tables manual pages

## Issues Found

1. **Incorrect HE.net whois host**: The post used `whois -h route-server.he.net`. `route-server.he.net` is a telnet-only looking glass, not a whois server — the command would fail to connect. Fixed to `whois -h whois.he.net`, which is HE's actual whois endpoint and returns BGP/ASN info.

2. **Wrong grep pattern for tracepath6**: `tracepath6 ... | grep Path` would match nothing — tracepath6 output uses lowercase `pmtu` (e.g., `pmtu 1500`, `Resume: pmtu 1500 hops 5`). Fixed to `grep pmtu`.

3. **"RTMP over UDP" is not a real protocol**: Standard RTMP is strictly TCP-based (port 1935). The UDP-based Adobe streaming protocol is RTMFP (Real-Time Media Flow Protocol), a separate protocol. Changed the comment from "RTMP over UDP, SRT" to "SRT, RTMFP".

4. **Non-existent nginx-rtmp-module directive**: The post referenced `flush_packets on;`, which is not a directive in the nginx-rtmp-module. Replaced with `out_cork 0;`, which is a real directive that controls TCP corking/buffering behavior.

5. **DSCP CS3 misclassified**: Per RFC 4594, CS3 is the "Broadcast Video" service class; the "Multimedia Streaming" class uses AF31/AF32/AF33. Updated both the comment and the `--set-dscp-class` argument from `CS3` to `AF31` for both iptables rules.

## Review Notes
- The placeholder `2001:db8::stream-server` contains non-hex characters (`s`, `t`, `r`, `m`) so it is technically not a parseable IPv6 literal. Left as-is because its use as a placeholder throughout is clear from context and consistent with how the author writes example addresses.
- `net.ipv4.tcp_rmem` / `net.ipv4.tcp_wmem` sysctls apply to both IPv4 and IPv6 TCP on Linux despite the `ipv4` prefix — this is a common point of confusion but the commands in the post are correct.
- `ping6`, `traceroute6`, and `netstat` are considered legacy on modern Linux distributions in favor of `ping -6`, `traceroute -6`, and `ss`, but the legacy forms remain widely available and work as shown.
- CS3 was historically used informally for streaming/signaling traffic in some network deployments, but the RFC 4594 mapping to AF31 is the current authoritative recommendation for multimedia streaming.
