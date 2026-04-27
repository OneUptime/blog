# Validation Summary: How to Optimize TCP Performance Over High-Latency Links

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux TCP stack (sysctl: tcp_rmem, tcp_wmem, tcp_window_scaling, tcp_moderate_rcvbuf, tcp_sack, tcp_dsack, tcp_timestamps, tcp_slow_start_after_idle, tcp_ecn)
- BBR congestion control
- fq qdisc
- `ip route` initcwnd
- iperf3, ping, tcpdump, ss diagnostics
- Python httpx (HTTP/2, connection pooling, Limits, Timeout)
- Bandwidth-Delay Product (BDP) calculations
- PAWS (Protection Against Wrapped Sequences)

## Sources Consulted
- [Linux kernel ip-sysctl documentation](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt)
- [Google BBR FAQ on GitHub](https://github.com/google/bbr/blob/master/Documentation/bbr-faq.md)
- [HTTPX Resource Limits documentation](https://www.python-httpx.org/advanced/resource-limits/)
- [HTTPX Timeouts documentation](https://www.python-httpx.org/advanced/timeouts/)
- [HTTPX Developer Interface](https://www.python-httpx.org/api/)
- [iproute2 ss(8) manual and output format references](https://man7.org/linux/man-pages/man8/ss.8.html)
- [RFC 6928 - Increasing TCP's Initial Window](https://datatracker.ietf.org/doc/html/rfc6928)
- Dropbox blog: "Evaluating BBRv2 on the Dropbox Edge Network" (for ss -ti BBR output format reference)

## Issues Found

1. **Incorrect grep pattern for verifying BBR via `ss`** — The original line `ss -tin state established | grep cc:bbr | wc -l` would not match anything: the `ss -i` output prints the congestion control algorithm as a bare token (e.g., `bbr wscale:8,8 rto:344 ...`), not prefixed with `cc:`. Fixed to `grep -w bbr` so it matches the bare algorithm token without false-matching unrelated names.

2. **Misleading comment on initcwnd step** — The original comment read `# 8. Increase initial congestion window for known low-latency paths`, which directly contradicts the high-latency-optimization context of the post. Increasing the initial congestion window (RFC 6928 / `initcwnd`) is most valuable on high-RTT paths because slow start takes many RTTs to ramp. Updated the comment to `# 8. Increase initial congestion window to skip slow-start on high-RTT paths`.

## Review Notes

- The BDP calculation is correct: 500 Mbps × 0.120 s = 7,500,000 bytes (7.5 MB). The shell expression `BANDWIDTH_MBPS * 125000 * RTT_MS / 1000` correctly evaluates to 7,500,000 with the example values.
- All sysctl parameter names are valid for current Linux kernels (2.6+ for the basic ones; BBR requires 4.9+, and `fq` qdisc pairs well with BBR; BBR can also work with other qdiscs since 4.13 but `fq` remains recommended).
- `net.ipv4.tcp_ecn=1` actively requests and accepts ECN; `=2` is more conservative (accept-only). Value `1` is appropriate for the goal of the post but may cause issues with some legacy middleboxes — worth a future caveat.
- `net.ipv4.tcp_dsack=1` is the kernel default; explicit setting is harmless.
- The httpx `Client` invocation is correct: `http2=True`, `httpx.Timeout(connect=..., read=...)`, and `httpx.Limits(max_connections=..., max_keepalive_connections=..., keepalive_expiry=...)` are all valid parameters per the current httpx API. Note (not an error): enabling `http2=True` requires installing httpx with the `http2` extra (`pip install httpx[http2]`); the post does not mention this prerequisite, but it is documented elsewhere on the httpx site.
- `tcpdump` BPF filter `'tcp[tcpflags] & tcp-syn != 0'` correctly captures SYN/SYN-ACK packets where the wscale option is negotiated; `-v` is required to expose TCP options like `wscale`.
- The "10–50× throughput" range in the conclusion is plausible for transcontinental links where defaults severely cap window size; the wide range is reasonable as bound depends heavily on default tcp_rmem ceiling and path loss.
- `initcwnd 20` exceeds the RFC 6928 recommendation of 10. It is widely deployed (e.g., Google's CDN historically used larger values) but can cause buffer overruns on narrow links — the updated comment makes the use case clearer.
