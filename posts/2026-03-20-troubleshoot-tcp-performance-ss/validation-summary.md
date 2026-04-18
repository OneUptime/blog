# Validation Summary: How to Troubleshoot TCP Performance with the ss Command

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux `ss` command (iproute2 package)
- TCP protocol internals (RTT, CWND, ssthresh, MSS, retransmissions, window scaling)
- Bash scripting (regex parsing of ss output)
- TCP states (ESTABLISHED, SYN-RECV, CLOSE-WAIT, TIME-WAIT)

## Sources Consulted
- iproute2 `ss.8` man page (https://github.com/iproute2/iproute2/blob/main/man/man8/ss.8)
- iproute2 source (`misc/ss.c`) for output field formatting
- Linux kernel `struct tcp_info` (include/uapi/linux/tcp.h) and `tcp_get_info()` in `net/ipv4/tcp.c`
- RFC 4898 (TCP Extended Statistics MIB) for `bytes_acked` / `data_segs_out` semantics
- RFC 793 (Transmission Control Protocol) for connection state terminology

## Issues Found
- **`rcv_space` description corrected.** The original text stated `rcv_space = receive buffer actually allocated by kernel`. This is inaccurate: `rcv_space` in ss output corresponds to the kernel's `tp->rcv_space.space` helper variable used for TCP receive buffer auto-tuning (tracked bytes copied per RTT), not the actual allocated receive buffer size (which is `sk->sk_rcvbuf`, reflected in `skmem` as `rb:`). Updated to: `helper variable for TCP receive buffer auto-tuning (not the actual allocated rcvbuf)`, matching the iproute2 man page description.

## Review Notes
- All other command syntax, flag combinations (`-t`, `-i`, `-n`), and filter expressions (`( dst ... )`, `( dport = :... )`, `( sport = :... )`) are correct per the ss(8) man page.
- Field semantics verified: `rto` (ms), `rtt:srtt/rttvar` (ms), `ato` (ms), `mss`, `cwnd`, `ssthresh`, `snd_wnd`, `retrans:unacked/total`, `bytes_acked`, `data_segs_out` — all match kernel/iproute2 behavior.
- `cwnd` is technically in segments/packets in the kernel, but in practice one segment ≈ one MSS, so "MSS units" is a commonly accepted description and left unchanged.
- Calling SYN-RECV "half-open" is a defensible common usage (cf. SYN-flood / half-open connection attacks), even though RFC 793 applies "half-open" more broadly to any pre-established socket pair. Left unchanged.
- `snd_wnd` field requires Linux kernel 5.4+ (added alongside `tcpi_snd_wnd`). Users on older kernels may not see this field — not a correctness issue, but worth noting.
- The grep patterns using PCRE `\K` require GNU grep with `-P` support, which is standard on most Linux distros.
