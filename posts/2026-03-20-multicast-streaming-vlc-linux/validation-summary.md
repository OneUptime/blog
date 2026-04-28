# Validation Summary: How to Configure Multicast Streaming with VLC on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- VLC Media Player (CLI)
- RTP / UDP multicast streaming
- IPv4 multicast addressing (administratively scoped 239.0.0.0/8)
- MPEG-TS containers
- IGMP / multicast group membership
- XSPF and M3U playlist formats
- ffmpeg / ffplay (used for comparison)
- tcpdump, iproute2 (`ip maddr`), iptables for troubleshooting

## Sources Consulted
- [VLC command-line help — VideoLAN Wiki](https://wiki.videolan.org/VLC_command-line_help/)
- [Documentation:Streaming HowTo/Advanced Streaming Using the Command Line — VideoLAN Wiki](https://wiki.videolan.org/Documentation:Streaming_HowTo/Advanced_Streaming_Using_the_Command_Line/)
- [Documentation:Streaming HowTo/Command Line Examples — VideoLAN Wiki](https://wiki.videolan.org/Documentation:Streaming_HowTo/Command_Line_Examples)
- [Documentation:Modules/standard — VideoLAN Wiki](https://wiki.videolan.org/Documentation:Modules/standard/)
- [Documentation:Modules/udp — VideoLAN Wiki](https://wiki.videolan.org/Documentation:Modules/udp/)
- [Stream over UDP — VLC Desktop User Documentation 3.0](https://docs.videolan.me/vlc-user/desktop/3.0/en/advanced/streaming/stream_over_udp.html)
- VLC forum threads on `--miface` and the obsolete `--miface-addr` (trac.videolan.org #7707; vlc-commits patch obsoleting `--miface-addr`)

## Issues Found
1. **Invalid `bind=` parameter on `#rtp{}`.** The "Bind sender to specific interface" example used `--sout '#rtp{...,bind=192.168.1.10}'`. The official VLC documentation for the RTP stream output module lists only `dst, port, port-video, port-audio, sdp, ttl, mux, rtcp-mux, proto, name, description, url, email` — there is no `bind` parameter on `#rtp{}` (it exists on `#standard{}` / `#http{}`, where it makes sense as a server-side listen address, but not on the RTP sender). Replaced with the correct, documented mechanism: `--miface eth0`, which is the global VLC option for selecting the multicast output interface.

2. **Non-existent `--stop-after-time` option.** The headless receive example passed both `--run-time=60` and `--stop-after-time=60`. VLC has `--run-time` and `--stop-time`, but no `--stop-after-time` flag. Removed `--stop-after-time=60`; `--run-time=60` already provides the duration limit, after which `vlc://quit` exits the process.

## Review Notes
- `#udp{}` is still accepted as a shortcut for `#standard{access=udp,...}` in current VLC, so the raw-UDP example is fine, though `#standard{access=udp,mux=ts,dst=...}` is the more forward-compatible form.
- `--sout-rtp-ttl 16` (space form) and `--sout-rtp-ttl=16` (equals form) are both accepted by VLC's option parser; the post mixes the chain-level `ttl=16` inside `#rtp{}` and the global `--sout-rtp-ttl` flag, which is fine — both set the same TTL.
- The MPEG-TS payload size `pkt_size=1316` in the ffmpeg example is correct (7 × 188-byte TS packets per UDP datagram, the de-facto IPTV default).
- `vlc screen://` requires the screen access module; on Wayland sessions this may need `--screen-display` adjustments or a fallback to PipeWire/X11 — out of scope for the post but worth flagging if readers report a black stream.
- `ip maddr show` output formatting differs slightly across iproute2 versions; the `grep 239.255.0.1` filter works on all current Linux distributions.
