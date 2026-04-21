# Validation Summary: How to Configure SRT Streaming Protocol with IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Secure Reliable Transport (SRT)
- IPv6 addressing and bracket notation in SRT URLs
- `srt-live-transmit`
- FFmpeg SRT protocol support
- SRTLA link aggregation
- Linux IPv6 firewall rules with `ip6tables`

## Sources Consulted
- Haivision SRT `srt-live-transmit` documentation: https://github.com/Haivision/srt/blob/master/docs/apps/srt-live-transmit.md
- Haivision SRT socket options documentation: https://github.com/Haivision/srt/blob/master/docs/API/API-socket-options.md
- Haivision SRT encryption documentation: https://doc.haivision.com/SRT/1.5.3/Haivision/encrypting-srt-streams
- FFmpeg protocol documentation for SRT: https://ffmpeg.org/ffmpeg-protocols.html#srt
- Local FFmpeg protocol help: `ffmpeg -hide_banner -h protocol=srt` on FFmpeg 6.1.1 with `--enable-libsrt`
- BELABOX SRTLA README and source: https://github.com/BELABOX/srtla
- RFC 3849 IPv6 documentation prefix: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- Replaced invalid IPv6 placeholders such as `2001:db8::server`, `2001:db8::peer`, and `2001:db8::destination` with valid RFC 3849 documentation addresses like `2001:db8::10`.
- Changed `srt-live-transmit --version` to `srt-live-transmit -version`, matching the documented SRT tool option.
- Corrected the all-interfaces IPv6 `srt-live-transmit` listener from `srt://:9000` to `srt://[::]:9000?mode=listener&ipv6only=1`; the empty-host form is documented as IPv4 listener mode.
- Added explicit `mode=listener` for `srt-live-transmit` listener examples that bind to an IPv6 address, because a non-empty host otherwise defaults to caller mode.
- Replaced unsupported `file://video.ts` usage in `srt-live-transmit` with `cat video.ts | srt-live-transmit "file://con" ...`; `srt-live-transmit` documents `file://con` for standard input/output.
- Replaced the invalid SRT encryption option `encryption=1` with `pbkeylen=16&passphrase=SecurePass`, which matches SRT/FFmpeg encryption options.
- Changed the FFmpeg IPv6 listener example from wildcard `[::]` to the example local IPv6 address; local FFmpeg validation showed wildcard binding was rejected by this build while concrete IPv6 listener binding was accepted.
- Clarified the rendezvous comment to avoid implying IPv6 NAT is the normal case; the example now describes simultaneous initiation through firewalls.
- Renamed the misleading "Bidirectional relay" comment because `srt-live-transmit` relays one input to one output in the shown command.
- Corrected the SRTLA example to use `127.0.0.1` for the local handoff and start the SRT listener first; the current BELABOX `srtla_rec` source uses IPv4 sockets for its listener and SRT target resolution.
- Changed the `ip6tables-save` command to run the shell redirection under `sudo`, so writing `/etc/ip6tables/rules.v6` works.
- Replaced unsupported `null://` and invalid `file://output.ts` `srt-live-transmit` examples with `file://con` plus shell redirection and `-statsout` for statistics.

## Review Notes
SRTLA is experimental and the upstream README says the server component is unsupported and not suitable for production deployment. The post is technically valid after correction, but a future revision should call out that operational caveat if SRTLA remains in scope.
