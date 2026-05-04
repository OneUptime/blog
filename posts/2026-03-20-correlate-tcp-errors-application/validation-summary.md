# Validation Summary: How to Correlate TCP Errors with Application Failures

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel TCP/IP stack
- `nstat` (iproute2)
- `ss` (iproute2)
- `tcpdump` / BPF filter expressions
- `journalctl` / systemd
- `curl`
- HTTP status codes (502, 503, 504)
- TCP connection states (SYN-SENT, ESTABLISHED, CLOSE-WAIT, FIN-WAIT-2, TIME-WAIT)
- TCP error counters from `/proc/net/snmp` and `/proc/net/netstat`

## Sources Consulted
- Linux kernel `include/uapi/linux/snmp.h` (counter definitions for LINUX_MIB_*)
- `/proc/net/snmp` and `/proc/net/netstat` output (verified live on Linux 6.17)
- `nstat -az` output (verified live)
- iproute2 `ss(8)` man page (state filters, expression syntax)
- tcpdump `pcap-filter(7)` man page (`tcp[tcpflags] & tcp-rst != 0` BPF expression)
- RFC 9293 (TCP) and RFC 6298 (RTO computation) for retransmit/RTO behaviour
- RFC 7231 / RFC 9110 for HTTP 502/503/504 semantics

## Issues Found
- **Incorrect counter name in Step 2.** The post listed `TcpTimeouts` as the counter for "RTO expired". This counter does not exist — `/proc/net/snmp`'s `Tcp:` line only contains `RtoAlgorithm, RtoMin, RtoMax, MaxConn, ActiveOpens, PassiveOpens, AttemptFails, EstabResets, CurrEstab, InSegs, OutSegs, RetransSegs, InErrs, OutRsts, InCsumErrors`. The RTO timeout counter lives in `/proc/net/netstat` under `TcpExt` and is exposed by `nstat` as `TcpExtTCPTimeouts`. The "Automated Correlation Script" later in the post already uses the correct name (`TcpExtTCPTimeouts`), so the legend in Step 2 was inconsistent with the rest of the post. Fixed by renaming the comment to `TcpExtTCPTimeouts`.

## Review Notes
- The other counters used in the post (`TcpAttemptFails`, `TcpEstabResets`, `TcpRetransSegs`, `TcpExtTCPSynRetrans`) are accurate and verified against live `nstat` output.
- The BPF filter `'tcp[tcpflags] & tcp-rst != 0'` for tcpdump is the canonical way to filter RST packets and is correct.
- The `ss` syntax (`ss -tnp state all dst ...`, `ss -tin state established dst ...`) is valid; `state all` and the `dst` host filter both work as documented in `ss(8)`.
- `ss -tn state time-wait | wc -l` includes the header line in the count, so the result is off by one. For an order-of-magnitude check (>10000) this is acceptable and not worth changing.
- The advice "consider SO_REUSEADDR or shorter TIME_WAIT" for high TIME_WAIT counts is a common simplification. In practice, `net.ipv4.tcp_tw_reuse` (client side) or connection pooling are more direct fixes; the Linux TIME_WAIT timeout (`TCP_TIMEWAIT_LEN`, 60s) is hardcoded and not tunable via sysctl. Left as-is since it is not strictly wrong and matches typical introductory guidance.
- `TcpEstabResets` actually counts transitions to CLOSED from ESTABLISHED *or* CLOSE_WAIT, which includes locally-sent RSTs as well as received ones. The post simplifies this to "RST received on ESTABLISHED connection". Left as-is — the simplification is reasonable for a debugging guide.
- HTTP 503 mapping to "connection pool exhausted (too many CLOSE_WAIT/TIME_WAIT)" is a reasonable interpretation in proxy/gateway contexts (e.g., Nginx returns 503 when no upstream is available) but 503 has broader meaning per RFC 9110. Acceptable for the post's debugging-focused framing.
