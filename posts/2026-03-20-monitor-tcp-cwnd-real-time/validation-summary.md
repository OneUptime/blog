# Validation Summary: How to Monitor TCP Congestion Window (CWND) Size in Real Time

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Linux TCP stack and congestion control (CUBIC, BBR)
- `ss` (iproute2 socket statistics tool)
- `/proc/net/tcp`
- `nstat` (network counters)
- `iperf3` (network throughput testing, JSON output)
- Bash, awk, Python 3 (for parsing)
- TCP slow start / congestion avoidance (RFC 5681, RFC 6928)

## Sources Consulted
- iproute2 source code for `ss` (misc/ss.c) — confirms field name is `cwnd:`, not `snd_cwnd:`
- Live `ss -tin` output on Linux 6.17 to verify field names and format
- `/proc/net/tcp` header and live output to verify column positions
- RFC 6928 (Increasing TCP's Initial Window) — confirms Linux default initial CWND = 10
- iperf3 documentation / JSON schema — confirms `snd_cwnd` is the correct key in per-interval stream stats (in bytes)
- Linux kernel TCP states (include/net/tcp_states.h) — for state hex codes

## Issues Found
1. **Wrong field name `snd_cwnd:` in `ss` output.** The actual field printed by `ss -tin` is `cwnd:` (the kernel struct member is `tcpi_snd_cwnd`, but iproute2 prints it as `cwnd:`). Fixed in:
   - The example output block.
   - The awk regex in the monitoring script (changed `/snd_cwnd/` and `/snd_cwnd:.../` to `/cwnd:/` and `/[[:space:]]cwnd:.../`, plus added a leading space anchor so we don't accidentally match other fields ending in `cwnd`).
   - The `grep -oP 'snd_cwnd:\K[0-9]+'` pattern in the slow-start watch command (changed to `(?<=[[:space:]])cwnd:\K[0-9]+`).
2. **Non-existent field `rcvmsg_size:87380`** in the example output. Removed and replaced with real fields (`rcvmss:1460 advmss:1460`) that actually appear in `ss -tin` output.
3. **Wrong column for `/proc/net/tcp` connection state.** The post claimed column 6 is the connection state. After splitting on whitespace, column 4 (`$4`) is the state; column 6 is `tr:tm->when`. Fixed the awk index and the comment, and added concrete state-code examples (`01=ESTABLISHED`, `0A=LISTEN`). Also clarified that `/proc/net/tcp` does not actually expose CWND — detailed info is only available via netlink.
4. **Outdated slow-start sequence (`2, 4, 8, 16, 32, 64...`).** Modern Linux uses an initial CWND of 10 segments per RFC 6928 (default since kernel 2.6.39). Updated to `10, 20, 40, 80, 160...` and added a note citing RFC 6928.

## Review Notes
- The iperf3 Python snippet uses `s.get("snd_cwnd", 0)` — this is correct; in iperf3's JSON schema the per-interval per-stream key really is `snd_cwnd` (in bytes). This is unrelated to the `ss` field-name fix.
- "Sudden halving" on fast retransmit is true for Reno/NewReno but CUBIC reduces by `beta = 0.7` (not exactly halving). Left as a reasonable simplification since the table is meant as a pattern-recognition cheat sheet, not algorithm-specific reference.
- `nstat` does expose a CWND-related counter (`TcpExtTCPCwndRestart`); the `nstat | grep -i cwnd` invocation will surface it where present, so the example is valid.
- The `ss` filter syntax `"( dst $TARGET )"` and `'( dst 10.20.0.5 )'` are both valid forms accepted by iproute2's filter parser.
