# Validation Summary: How to Implement Keep-Alive for IPv4 TCP Connections

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP keep-alive
- Linux socket options (`SO_KEEPALIVE`, `TCP_KEEPIDLE`, `TCP_KEEPINTVL`, `TCP_KEEPCNT`)
- C socket programming
- Python `socket` module
- Go `net` package
- Linux `sysctl`

## Sources Consulted
- RFC 1122, section 4.2.3.6 TCP Keep-Alives: https://www.rfc-editor.org/rfc/rfc1122
- Linux `socket(7)` manual (`SO_KEEPALIVE`): https://man7.org/linux/man-pages/man7/socket.7.html
- Linux `tcp(7)` manual (`TCP_KEEPIDLE`, `TCP_KEEPINTVL`, `TCP_KEEPCNT`, and keepalive sysctl defaults): https://man7.org/linux/man-pages/man7/tcp.7.html
- Python `socket` module documentation (`TCP_KEEPIDLE`, `TCP_KEEPINTVL`, `TCP_KEEPCNT`, `TCP_KEEPALIVE`): https://docs.python.org/3.11/library/socket.html
- Go `net` package documentation (`TCPConn.SetKeepAliveConfig`, `KeepAliveConfig`, `SetKeepAlivePeriod`): https://pkg.go.dev/net
- Linux `sysctl(8)` manual: https://man7.org/linux/man-pages/man8/sysctl.8.html
- Local system headers used to confirm the C example's required includes: `/usr/include/netinet/in.h`, `/usr/include/netinet/tcp.h`

## Issues Found
- The C example used `IPPROTO_TCP` without including `<netinet/in.h>`. I added the missing header so the sample matches the platform headers and compiles correctly.
- The Python macOS example hardcoded `TCP_KEEPALIVE = 0x10`. I replaced that with `socket.TCP_KEEPALIVE`, which is the current official constant exposed by Python on macOS.
- The Go example accepted `interval` and `count` parameters but never applied them. I updated it to use `net.TCPConn.SetKeepAliveConfig(...)`, which actually enables keep-alive and sets idle time, interval, and probe count.
- The timing reference and sequence diagram implied `ECONNRESET` for unanswered keepalive probes. I corrected that wording to describe timeout/drop behavior more accurately and clarified the conclusion to note that the observed error can vary, commonly `ETIMEDOUT` or `ECONNRESET`.

## Review Notes
- The Go sample now uses `SetKeepAliveConfig`, which is available in Go 1.23 and later.
- The Python snippet shows Linux-specific per-socket tuning for idle/interval/count; the macOS branch only sets idle time via `TCP_KEEPALIVE`.
