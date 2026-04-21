# Validation Summary: How to Configure TCP Keepalive Parameters on Linux for IPv4

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Linux TCP/IP networking
- TCP keepalive
- Linux kernel sysctl parameters
- procps `sysctl`
- `sysctl.d` configuration files
- Python `socket` module

## Sources Consulted
- Linux kernel IP sysctl documentation: https://docs.kernel.org/6.18/networking/ip-sysctl.html
- Linux `tcp(7)` manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux `socket(7)` manual page: https://man7.org/linux/man-pages/man7/socket.7.html
- procps-ng `sysctl(8)` manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- systemd `sysctl.d(5)` manual page: https://man7.org/linux/man-pages/man5/sysctl.d.5.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- Debian procps `sysctl.conf(5)` manual page: https://manpages.debian.org/unstable/procps/sysctl.conf.5.en.html

## Issues Found
- The "all at once" command used `sysctl net.ipv4 | grep keepalive`, which can scan unrelated IPv4 sysctls and may emit permission errors for unrelated keys. Changed it to query the three TCP keepalive keys directly in one `sysctl` invocation.
- The timing explanation said the configured values produced a "total 2.5 minutes before declaring dead." Kernel documentation defines `tcp_keepalive_intvl * tcp_keepalive_probes` as the retry time after keepalive probing starts. Clarified that this is about 2.5 minutes of retries after the initial 5-minute idle period, for roughly 7.5 minutes after the connection first becomes idle.

## Review Notes
- The sysctl defaults, parameter names, `sysctl -w` usage, `sysctl.d` assignment format, and Python `setsockopt()` example were verified as correct for Linux.
- TCP keepalive probes are only sent for sockets with `SO_KEEPALIVE` enabled; the post correctly includes this per-socket requirement.
- `/etc/sysctl.d/*.conf` is the most portable persistence recommendation on systemd-based systems. The post's `sysctl --system` command is valid for applying procps sysctl configuration without rebooting.
