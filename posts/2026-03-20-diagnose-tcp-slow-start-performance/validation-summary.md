# Validation Summary: How to Diagnose TCP Slow Start Performance Issues

## Status
validated

## Post Type
Technical guide / troubleshooting guide

## Technologies Covered
- TCP congestion control and slow start
- Linux networking tools (`ss`, `ip route`, `sysctl`)
- HTTP connection reuse with `curl`
- Python Requests connection pooling
- TCP Fast Open

## Sources Consulted
- RFC 5681, TCP Congestion Control: https://www.rfc-editor.org/rfc/rfc5681.html
- RFC 6928, Increasing TCP's Initial Window: https://www.rfc-editor.org/rfc/rfc6928.html
- RFC 7413, TCP Fast Open: https://datatracker.ietf.org/doc/html/rfc7413
- Linux kernel IP sysctl documentation (`tcp_slow_start_after_idle`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- `ip-route(8)` manual (`initcwnd` route attribute): https://man7.org/linux/man-pages/man8/ip-route.8.html
- Requests advanced usage documentation (Session reuse and connection pooling): https://docs.python-requests.org/en/latest/user/advanced/
- curl connection reuse documentation: https://everything.curl.dev/cmdline/urls/connreuse.html
- Local `ss --help`, `ip route help`, and live `ss -tin` output on the review machine to verify installed CLI syntax and the exposed CWND field name (`cwnd:`)

## Issues Found
- The throughput example described an HTTP request without accounting for handshake/request latency, and it understated the third-round transfer as `56 KB`. I clarified that the example is for response-payload transfer after request setup, corrected the third round to `58.4 KB`, and reworded the total as data-transfer time.
- The repeated `curl` loop used separate `curl` processes, so it would not demonstrate TCP connection reuse. I replaced it with a single `curl` invocation carrying multiple transfers and updated the note to say reuse depends on the server keeping the connection alive.
- The `ss` example filtered for `snd_cwnd`, but the installed `ss -tin` output exposes the congestion window as `cwnd:`. I corrected the command and clarified that it shows current CWND, which only approximates the initial window if sampled right after the flow starts.
- The route-inspection comments implied that `ip route show | grep initcwnd` reveals the Linux default initial window and even an available-bandwidth estimate. I rewrote those notes to describe what the command actually shows: explicit per-route `initcwnd` overrides.
- The `ip route change ... 2>&1` example treated `RTNETLINK answers: Invalid argument` as proof that the kernel version lacks `initcwnd` support. That error is not specific enough for that conclusion, so I replaced the example with a syntax check using `ip route help`.
- The idle section heading used `ssthresh retention`, which is not the relevant TCP concept here, and the comments implied the sysctl acts only on persistent connections. I renamed the section to `TCP Slow Start After Idle` and clarified that `tcp_slow_start_after_idle` is a system-wide setting whose common use case is persistent-connection-heavy workloads.
- The Python Requests example referenced an undefined `urls` variable and overstated reuse as eliminating slow start entirely. I added a concrete `urls` list and softened the comments to say reuse helps avoid a fresh slow start on subsequent requests.
- The conclusion implied TCP Fast Open helps with slow start directly. I corrected it to say TCP Fast Open reduces request setup latency by sending data in the initial SYN, but does not remove slow start itself.

## Review Notes
The post is now technically sound for a Linux-focused guide. One caveat worth keeping in mind is that `ip-route(8)` documents `initcwnd` as a per-route override but its historical man-page wording around defaults does not map cleanly to modern IW10 practice, so avoiding a hard claim about the implicit Linux default was the safer correction. Persisting `tcp_slow_start_after_idle` in `/etc/sysctl.conf` remains valid, although some distributions prefer drop-in files under `/etc/sysctl.d/`.
