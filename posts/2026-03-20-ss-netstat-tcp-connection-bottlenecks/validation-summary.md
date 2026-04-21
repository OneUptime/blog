# Validation Summary: How to Use ss and netstat to Identify TCP Connection Bottlenecks

## Status
validated

## Post Type
Tutorial / troubleshooting guide

## Technologies Covered
- Linux TCP sockets
- `ss`
- `netstat`
- `sysctl`
- TCP connection states
- Linux TCP/IP kernel tunables

## Sources Consulted
- `ss(8)` Linux manual page: https://www.man7.org/linux/man-pages/man8/ss.8.html
- `netstat(8)` Linux manual page: https://man7.org/linux/man-pages/man8/netstat.8.html
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- `ip(7)` Linux manual page: https://man7.org/linux/man-pages/man7/ip.7.html
- `sysctl(8)` Linux manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- Local command verification with `ss --help`, `netstat --help`, `ss -tan`, `ss -tlnp`, and relevant `sysctl` reads.

## Issues Found
- `netstat -s` was labeled as an equivalent to `ss -s`. It reports protocol counters rather than a live socket-state summary, so the comment was changed to describe it as related TCP counters.
- The `ss` state-count example showed `ESTABLISHED`, but `ss` commonly prints established TCP sockets as `ESTAB`. The example output was corrected.
- The takeaway implied that `ss -s` directly shows `CLOSE-WAIT` counts. It was corrected to use `ss -s` for overview and the state-count command for specific TIME-WAIT/CLOSE-WAIT counts.
- Several `ss` pipelines skipped headers manually or counted the header in `wc -l`. The commands were updated to use `ss -H` where appropriate.
- The listen backlog explanation implied that changing `net.core.somaxconn` alone increases the effective backlog. The text now notes that the application's `listen()` backlog must also be high enough.
- The established-socket queue explanation described `Send-Q` as only data waiting to be sent. It was corrected to data sent or queued locally but not yet acknowledged, and `Recv-Q` was clarified as bytes not read by the application.
- The ephemeral port range math was off by one: `32768 60999` contains 28,232 ports, not 28,231.
- The TIME_WAIT/port exhaustion guidance was too broad. It now notes that high TIME_WAIT counts matter most when many short-lived connections target the same remote endpoint, and it cautions that global `tcp_tw_reuse` should be tested before enabling.
- The sample widened ephemeral port range started at `1024`. It was changed to `20000 65535` to avoid the lower privileged/service-port boundary while still widening the range.
- The process-owner comment said root is required unconditionally. It now says root is required for sockets the user does not own.

## Review Notes
`netstat` commands are valid when the `net-tools` package is installed, but many modern minimal Linux environments install `ss` by default and omit `netstat`. The `sysctl -w` examples make runtime changes; persistent configuration would need a sysctl configuration file, which is outside this post's current scope.
