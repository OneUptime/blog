# Validation Summary: How to Monitor VoIP Quality over IPv6

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- RTCP (RTP Control Protocol, RFC 3550)
- RTP over IPv6
- tcpdump / tshark (Wireshark) packet capture and dissection
- Python 3 (`socket`, `struct`) for raw RTCP RR parsing
- SIPp active SIP load/probing tool
- Asterisk PBX (chan_pjsip, RTP CLI, res_hep)
- Homer SIP capture / HEP (Homer Encapsulation Protocol)
- Prometheus client (`prometheus_client` Python library)
- sipsak (SIP OPTIONS probing)

## Sources Consulted
- RFC 3550 — RTP/RTCP packet formats (Receiver Report block layout, fraction-lost fixed-point semantics): https://datatracker.ietf.org/doc/html/rfc3550
- Wireshark RTCP display filter reference: https://www.wireshark.org/docs/dfref/r/rtcp.html
- Asterisk `hep.conf.sample` (master): https://raw.githubusercontent.com/asterisk/asterisk/master/configs/samples/hep.conf.sample
- Asterisk RTP CLI source (`res/res_rtp_asterisk.c`) for `rtp set debug` and `rtp show settings` registrations
- Asterisk `core show channels [concise|verbose|count]` CLI registration
- SIPp transport documentation (`docs/transport.rst`): `-t un` = UDP one socket per call
- sipsak(1) man page (Debian bookworm): https://manpages.debian.org/bookworm/sipsak/sipsak.1.en.html — `-T` is traceroute mode
- ITU-T G.114 (one-way delay recommendations) — informs the latency thresholds in the metrics table
- Python `socket` AF_INET6 binding semantics

## Issues Found

1. **Wireshark/tshark RTCP filter field names were wrong.** The post used legacy/invented names (`rtcp.fraction_lost`, `rtcp.cum_nr_of_loss`, `rtcp.inter_arriv_jitter`, `rtcp.dlsr`, bare `rtcp.ssrc`) that do not exist in Wireshark's current RTCP dissector. Per https://www.wireshark.org/docs/dfref/r/rtcp.html the receiver-report block fields live under `rtcp.ssrc.*`. Updated the `tshark -e ...` invocation to use:
   - `rtcp.ssrc.identifier`
   - `rtcp.ssrc.fraction`
   - `rtcp.ssrc.cum_nr`
   - `rtcp.ssrc.jitter`
   - `rtcp.ssrc.dlsr`

2. **Asterisk CLI: `rtp show` is not a registered command.** `res_rtp_asterisk` registers `rtp show settings` (the bare verb requires a subcommand and Asterisk will reject it). Changed `asterisk -rx "rtp show"` → `asterisk -rx "rtp show settings"`.

3. **Asterisk `hep.conf` had an invented `[capture_info]` section and was missing `enabled=yes`.** Per the official `hep.conf.sample`, all settings live in `[general]` and `enabled=yes` is required to activate the module; there is no `[capture_info]` stanza. Also, `capture_address` must include a port (default Homer/HEP is 9060) and bracketed-IPv6 form is needed when supplying a literal IPv6 address. Rewrote the snippet to add `enabled=yes`, bracket the IPv6 literal with port, drop the bogus `[capture_info]` section, and add `uuid_type=call-id`.

4. **sipsak `-T` flag is traceroute mode, not OPTIONS RTT.** The original Python exporter ran `sipsak ... -v -T`, but `-T` activates SIP traceroute (decrementing Max-Forwards hop-by-hop) — its output format is not what the regex `(\d+\.\d+) ms` is designed to capture, and it isn't a true end-to-end OPTIONS RTT probe. Replaced with `-vv` (default OPTIONS mode, verbose) which prints per-request timings the regex can pick up.

## Review Notes

- **sipsak IPv6 caveat (not patched).** The reference sipsak (nils-ohlmeier/sipsak) historically lacks IPv6 support — the Debian man page even notes "IPv6 is not supported." Some forks/distros have added it, but operators using upstream sipsak against an IPv6-only SIP server may need an alternative tool (`sipp -sn options` with `-t un` and an IPv6 `-i`, or a small custom probe). Worth flagging in a future revision but the syntactic example itself is correct.
- **RTCP RR parser correctness.** The Python `parse_rtcp_rr` byte offsets match RFC 3550 §6.4.2 exactly: 8-byte RTCP header, 24-byte report block (fraction lost / 24-bit cumulative / extended seq / jitter / LSR / DLSR). The `(fraction_lost / 256.0) * 100` conversion is the correct fixed-point interpretation. The 8 kHz / 8 samples-per-ms jitter conversion is correct for G.711 only — for G.722 (16 kHz RTP clock) or Opus (48 kHz) the divisor would differ; the inline comment correctly scopes the assumption.
- **SIPp `-fd 1` with `-trace_stat`.** Both flags are valid; `-fd` is the periodic stat dump frequency (seconds) and `-trace_stat` writes a CSV next to the scenario file. The bracketed IPv6 target syntax `[2001:db8::sip-server]:5060` is the documented SIPp form.
- **Quality thresholds.** The latency/jitter/loss/MOS thresholds are consistent with ITU-T G.114 (≤150 ms one-way delay considered acceptable for most user applications) and common industry MOS bands.
- **Listening on port 5005 (`::`)** in the Python monitor is fine for a lab; in production RTCP traffic for an Asterisk endpoint is multiplexed on (RTP port + 1) per call, so a single listener won't see live call traffic without explicit forking/forwarding (e.g., HEP via res_hep_rtcp). The example is illustrative rather than drop-in production.
