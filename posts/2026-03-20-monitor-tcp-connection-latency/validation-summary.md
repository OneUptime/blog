# Validation Summary: How to Monitor TCP Connection Establishment Latency

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- TCP (three-way handshake, connection establishment)
- curl (timing variables: `time_connect`, `time_starttransfer`)
- hping3 (SYN probing)
- tcpdump (packet capture)
- tshark / Wireshark (display filters, TCP analysis fields)
- Linux `ss` command (socket statistics, RTT reporting)
- Python `socket` and `time.perf_counter()` for client-side timing

## Sources Consulted
- [curl `--write-out` variables](https://curl.se/docs/manpage.html#-w) — verified `time_connect` and `time_starttransfer` semantics
- [hping3 man page](https://linux.die.net/man/8/hping3) — verified `-S`, `-p`, `-c` flags
- [Wireshark Display Filter Reference: TCP](https://www.wireshark.org/docs/dfref/t/tcp.html) — checked TCP analysis fields
- [Wireshark TCP Analysis docs](https://www.wireshark.org/docs/wsug_html_chunked/ChAdvTCPAnalysis.html) — confirmed `tcp.analysis.initial_rtt` is the correct field
- [Ask Wireshark: tshark and tcp.analysis.initial_rtt](https://ask.wireshark.org/question/32685/tshark-does-not-recognize-tcpanalysisinitial_rtt/) — confirmed tshark requires `-2` (2-pass) flag for this field
- [iproute2 `ss` man page](https://man7.org/linux/man-pages/man8/ss.8.html) — verified `-t -i -n` flags and `state established` filter; confirmed `rtt:<srtt>/<rttvar>` output format
- [Python socket docs](https://docs.python.org/3/library/socket.html) and [time.perf_counter](https://docs.python.org/3/library/time.html#time.perf_counter) — verified API usage
- [tcpdump man page](https://www.tcpdump.org/manpages/tcpdump.1.html) — verified `-i`, `-n`, `-w` flags and BPF filter syntax

## Issues Found
- **`tcp.analysis.handshake_time` is not a real Wireshark/tshark display filter field.** The correct field for the initial RTT computed from the three-way handshake is `tcp.analysis.initial_rtt`. Additionally, tshark only computes this field when invoked with `-2` (two-pass analysis); the default single-pass mode does not populate it. Fixed by replacing the field name with `tcp.analysis.initial_rtt`, adding `-2` to the tshark command, and adding a brief inline note explaining the two-pass requirement.

## Review Notes
- The first tshark display filter `"tcp.flags.syn==1 or (tcp.flags.syn==1 && tcp.flags.ack==1)"` is logically redundant — the second clause is a subset of the first, so the expression simplifies to `tcp.flags.syn==1`. It still works correctly (matches both SYN-only and SYN+ACK packets, which is what the author wants), so I left it as written. A cleaner future revision could shorten it.
- `curl`'s `time_connect` is technically the time from the start of the request through TCP connect completion, which *includes* DNS resolution time. In the post's examples the targets are raw IPs (10.20.0.5), so DNS is a no-op and `time_connect` is effectively equal to TCP handshake time — the simplification is fine for this context. For hostnames, the precise TCP handshake time would be `time_connect - time_namelookup`.
- `apt install hping3` will require `sudo` on most systems; the post omits it for brevity, which is a common convention.
- `grep -oP 'rtt:\K[\d.]+'` relies on GNU grep's PCRE support (`-P`); BSD/macOS grep does not support this. Acceptable since the post is Linux-focused (per tags).
- Python example uses blocking `socket.connect()` and counts the full round trip (SYN → SYN-ACK → ACK + kernel handoff) as the latency, which is the standard and correct way to measure connect latency from a client. Good baseline approach.
