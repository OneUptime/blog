# Validation Summary: How to Configure Wowza Streaming Engine with IPv6

## Status
validated

## Post Type
Tutorial / Configuration Guide

## Technologies Covered
- Wowza Streaming Engine (4.8.x)
- IPv6 networking
- RTMP (Real-Time Messaging Protocol)
- HLS (HTTP Live Streaming)
- HTTP / HTTPS
- RTSP / RTP
- ip6tables (Linux IPv6 firewall)
- ffmpeg / ffplay
- OBS Studio (ingest client)
- Wowza Streaming Engine REST API
- Wowza Streaming Engine Manager UI

## Sources Consulted
- Wowza Streaming Engine docs — VHost.xml reference: https://www.wowza.com/docs/how-to-configure-virtual-hosts
- Wowza HostPort / IpAddress binding docs: https://www.wowza.com/docs/how-to-modify-network-and-http-configuration
- Wowza Application.xml Transcoder block reference: https://www.wowza.com/docs/how-to-set-up-and-run-wowza-transcoder-for-live-streaming
- Wowza REST API reference (port 8087): https://www.wowza.com/docs/wowza-streaming-engine-rest-api-query-examples
- Wowza Engine Manager default port 8088: https://www.wowza.com/docs/how-to-change-wowza-streaming-engine-manager-port
- RFC 4291 — IP Version 6 Addressing Architecture (IPv6 text format, hex digits 0-9 / a-f only)
- RFC 3986 — URI generic syntax (bracketed IPv6 literals in URLs)
- RFC 3849 — IPv6 documentation prefix 2001:db8::/32
- iptables / ip6tables man pages (Debian, Netfilter)
- ss(8) man page (iproute2)

## Issues Found
1. **`chmod +x` applied to a `.tar.gz` archive** — tar.gz archives are not executed; `chmod +x` has no useful effect on them. Additionally the original filename `WowzaStreamingEngine-4.8.x+9.tar.gz` included a non-standard `+9` fragment. Removed the `chmod +x` line and simplified the archive filename to `WowzaStreamingEngine-4.8.x.tar.gz`.
2. **Invalid IPv6 literal `2001:db8::wowza`** — IPv6 addresses per RFC 4291 only allow hex digits (0-9, a-f); `w` and `z` are not valid. Replaced all occurrences with `2001:db8::1`, a valid literal within the RFC 3849 documentation prefix.
3. **Invalid IPv6 literal `2001:db8::admin`** in the ip6tables rule — same RFC 4291 issue (`i`, `n` not hex). Replaced with `2001:db8::a` and reordered the rule so `--dport` precedes `-j ACCEPT` to match the common ip6tables argument style.
4. **Non-existent `<TranscoderProfile>` element** in `Application.xml` — Wowza Streaming Engine's transcoder configuration uses the `<Transcoder>` block with `<LiveStreamTranscoder>`, `<Templates>`, `<ProfileDir>`, and `<TemplateDir>` children. Replaced with the correct `<Transcoder>` block structure.

## Review Notes
- The `<HTTPProvider>` `<BaseClass>` value `com.wowza.wms.http.HTTPConnectionInfo` is a real Wowza HTTP provider class and is correct.
- Wowza Streaming Engine Manager's default port is 8088 and the REST API default port is 8087 — both match the post.
- The `::` unspecified address correctly binds to all IPv6 (and, on dual-stack kernels with IPV6_V6ONLY=0, IPv4) interfaces, which is the standard approach the post describes.
- The `ss -6 -tlnp` invocation is correct for listing IPv6 TCP listeners with associated processes.
- Wowza Streaming Engine 4.8.x is the last 4.x series — Wowza has since released Streaming Engine 4.9.x and (more recently) the 4.8.27+ patch line; readers on newer versions may see slightly different default `VHost.xml` templates but the `HostPort` / `IpAddress` binding semantics are unchanged.
- The 6970:9999 UDP range for RTP is conservative; real deployments may narrow this based on their configured MediaCaster/RTP session ranges.
