# Validation Summary: How to Switch TCP Congestion Control Algorithms on Linux

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Linux TCP congestion control
- Linux sysctl and procfs networking parameters
- Linux kernel modules
- systemd modules-load.d
- Python socket API
- iproute2 ss
- iperf3

## Sources Consulted
- Linux Kernel IP Sysctl documentation: https://docs.kernel.org/networking/ip-sysctl.html
- Linux tcp(7) manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Python socket module documentation: https://docs.python.org/3/library/socket.html
- procps-ng sysctl(8) manual page: https://man7.org/linux/man-pages/man8/sysctl.8.html
- kmod modprobe(8) manual page: https://man7.org/linux/man-pages/man8/modprobe.8.html
- systemd modules-load.d(5) manual page: https://www.man7.org/linux/man-pages/man5/modules-load.d.5.html
- iproute2 ss(8) manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- iperf3 official invocation documentation: https://software.es.net/iperf/invoking.html

## Issues Found
- The available-algorithm example used `sysctl` while showing value-only output. Changed the command to `sysctl -n net.ipv4.tcp_available_congestion_control`, matching the documented `--values` behavior.
- The module-loading section described "built-in algorithms (kernel modules)" and used `/etc/modules` for boot loading. Updated the wording to "algorithms provided as kernel modules" and changed the boot-load example to `/etc/modules-load.d/tcp-bbr.conf`, matching systemd's documented modules-load.d format.
- The Python verification used `algo.rstrip(b'\\x00')`, which strips the literal backslash sequence rather than NUL padding. Updated it to strip actual NUL bytes with `.rstrip(b"\0")` before decoding.
- The Python example hardcoded `TCP_CONGESTION = 13` even though modern Python exposes `socket.TCP_CONGESTION` when available. Updated it to use `getattr(socket, "TCP_CONGESTION", 13)` so current Python uses the exported constant while retaining the Linux fallback.
- The per-socket override explanation omitted Linux's permission policy. Added the `tcp_allowed_congestion_control` and `CAP_NET_ADMIN` caveat because unprivileged processes cannot choose arbitrary available algorithms.
- The algorithm availability check in the iperf3 comparison loop was reversed, so it tested whether the algorithm name contained the full available-algorithm list. Changed it to pipe the sysctl value into `grep -qw -- "$algo"`.
- The test loop left shell expansions unquoted. Quoted the sysctl assignment and iperf3 target to avoid malformed arguments if variables contain unexpected characters.
- The `ss` verification looked for a `cc:` prefix, but current `ss -i` output commonly displays the congestion control name directly in the TCP info line. Changed the grep command and note to look for algorithm names such as `bbr` or `cubic`.
- The quick `ss` grep used GNU grep's PCRE mode (`-P`) without needing PCRE. Changed it to `grep -Eo` for a simpler extended-regex form.

## Review Notes
The post is technically relevant and valid after the corrections. The administrative commands still require root privileges or suitable capabilities. No destructive system-changing commands were executed during validation.
