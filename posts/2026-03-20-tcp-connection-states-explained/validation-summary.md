# Validation Summary: How to Understand TCP Connection States (ESTABLISHED, TIME_WAIT, CLOSE_WAIT)

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- TCP connection state machine
- Linux networking
- iproute2 `ss`
- Linux TCP sysctl settings
- Python socket cleanup

## Sources Consulted
- RFC 9293: Transmission Control Protocol (TCP): https://datatracker.ietf.org/doc/html/rfc9293
- Linux kernel IP sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- iproute2 `ss(8)` man page: https://manpages.opensuse.org/Leap-16.0/iproute2/ss.8.en.html
- Linux kernel TCP constants (`include/net/tcp.h`): https://raw.githubusercontent.com/torvalds/linux/master/include/net/tcp.h
- Python `socket` module documentation: https://docs.python.org/3.11/library/socket.html
- Local command checks: `ss -h`, `ss -V`, `ss -tn state syn-received`, `ss -tn state syn-recv`, and `sysctl net.ipv4.tcp_fin_timeout net.ipv4.tcp_tw_reuse` on iproute2 6.1.0

## Issues Found
- The SYN_RECV example used `ss -tn state syn-received`, but `ss` expects the state filter name `syn-recv`. Changed the command to `ss -Htn state syn-recv | wc -l`.
- Several count examples piped `ss` output directly to `wc -l`, which counted the header line. Added `-H` to the relevant `ss` commands so the counts are exact.
- TIME_WAIT was described as "waiting 2 minutes" in one command comment. Reworded it to "waiting for the TIME_WAIT timer" and clarified that Linux uses about 60 seconds.
- The TIME_WAIT table implied only the active closer can enter TIME_WAIT. Updated it to include simultaneous close, where both peers can enter TIME_WAIT.
- `net.ipv4.tcp_fin_timeout` was described as configuring TIME_WAIT and affecting TIME_WAIT. Corrected it to say it controls the orphaned FIN_WAIT2 timeout only.
- The `tcp_tw_reuse` comment described the setting as simply safe for outbound connections to different servers. Adjusted the wording to match the Linux kernel documentation: reuse is allowed when protocol-safe and should be used with care.

## Review Notes
Most TCP state descriptions align with RFC 9293. `ss -tlnp` is valid, but process details may require elevated privileges for sockets owned by other users.
