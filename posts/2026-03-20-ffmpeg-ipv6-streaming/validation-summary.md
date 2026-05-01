# Validation Summary: How to Configure FFmpeg for IPv6 Streaming

## Status
validated

## Post Type
Guide

## Technologies Covered
- FFmpeg
- IPv6
- RTMP
- RTSP
- SRT
- UDP
- HLS
- MPEG-TS

## Sources Consulted
- FFmpeg Protocols Documentation: https://ffmpeg.org/ffmpeg-protocols.html
- FFmpeg Formats Documentation: https://ffmpeg.org/ffmpeg-formats.html
- FFmpeg CLI help from the local FFmpeg 6.1.1 install: `ffmpeg -protocols`, `ffmpeg -h protocol=udp`, `ffmpeg -h protocol=tcp`, `ffmpeg -h protocol=srt`, `ffmpeg -h muxer=hls`
- RFC 3986, URI Generic Syntax: https://datatracker.ietf.org/doc/html/rfc3986
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://www.rfc-editor.org/rfc/rfc3849

## Issues Found
- Multiple examples used invalid IPv6 literals such as `2001:db8::server`, `2001:db8::camera`, and `2001:db8::ipv6-server`. Those are not valid IPv6 addresses under RFC 3986 URI host syntax. I replaced them with valid documentation addresses from `2001:db8::/32`.
- The multi-bitrate HLS example was not valid for FFmpeg’s HLS muxer. It reused unqualified `-b:v` and `-s` options for a single output with multiple variant streams, and it omitted an `hls_segment_filename` pattern containing `%v`, which FFmpeg requires when `var_stream_map` defines multiple variants. I replaced it with a valid per-stream mapping/bitrate example and added `-hls_segment_filename "/var/www/html/hls/stream_%v_%03d.ts"`.
- The “Force IPv6 connection” example used `-protocol_whitelist` and `-rw_timeout`, but those options do not force IPv6 according to FFmpeg’s protocol documentation. I replaced that with a literal IPv6 RTMP URL and changed the local bind example to the documented UDP `localaddr` option.
- Several UDP and SRT receive/relay examples used `-c:v copy`, which would drop audio and other non-video streams even though the commands were described as general stream receive/relay workflows. I changed those examples to `-c copy`.
- The introduction and conclusion overstated FFmpeg’s behavior by saying IPv6 support covered “all network-based inputs and outputs” and that URL syntax was the “only” required change. I narrowed that language to match FFmpeg’s documentation and noted that protocol-specific bind options such as `localaddr` and `local_addr` may still matter.

## Review Notes
- The corrected multi-bitrate HLS example was validated locally with FFmpeg 6.1.1 using synthetic audio/video inputs and successfully generated a master playlist, variant playlists, and per-variant segment files.
- The network examples assume FFmpeg was built with the relevant protocol support (`rtmp`, `srt`, `udp`, `tcp`, `http`) and that the host has working IPv6 connectivity.
