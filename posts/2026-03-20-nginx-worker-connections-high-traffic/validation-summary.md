# Validation Summary: How to Configure Nginx worker_connections for High Traffic on IPv4

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Nginx (worker_connections, worker_rlimit_nofile, worker_processes, events block, epoll, multi_accept, keepalive)
- Linux PAM limits (`/etc/security/limits.conf`)
- systemd service overrides (`LimitNOFILE`)
- Linux kernel sysctl (net.core.somaxconn, net.ipv4.tcp_max_syn_backlog, net.ipv4.tcp_fastopen, net.ipv4.tcp_tw_reuse)
- Linux CLI tools (`ulimit`, `ss`, `watch`, `grep`, `sysctl`)

## Sources Consulted
- Nginx core module documentation: https://nginx.org/en/docs/ngx_core_module.html (verified `worker_processes auto`, `worker_rlimit_nofile`)
- Nginx events module documentation (verified `worker_connections`, `use epoll`, `multi_accept`)
- Linux `listen(2)` man page: https://man7.org/linux/man-pages/man2/listen.2.html (verified `net.core.somaxconn` semantics)
- Linux `socket(7)` man page: https://man7.org/linux/man-pages/man7/socket.7.html
- Linux kernel networking sysctl documentation (verified tcp_max_syn_backlog, tcp_fastopen=3, tcp_tw_reuse semantics)
- systemd.exec(5) documentation (verified `LimitNOFILE=` syntax)

## Issues Found
- **Inaccurate comment for `net.core.somaxconn`**: The original sysctl block described `net.core.somaxconn` as "Increase the maximum number of open sockets". Per the Linux `listen(2)` man page, `somaxconn` caps the listen backlog (accept queue), not the number of open sockets. Updated the comment to "Increase the listen() accept queue limit".
- **Slightly imprecise comment for `net.ipv4.tcp_max_syn_backlog`**: The original comment ("Larger TCP backlog") conflated the SYN queue with the accept queue. Tightened to "Larger SYN backlog for half-open connections" for accuracy and to distinguish it from `somaxconn`.

## Review Notes
- The formula `max_connections = worker_processes × worker_connections` is technically a maximum *worker capacity* number; for a reverse-proxy workload, each client request typically consumes two connections (client + upstream), which can halve the effective client capacity. This is a common and acceptable simplification for an introductory tuning post and was left as-is.
- `net.ipv4.tcp_tw_reuse = 1` only affects outbound connections (Nginx → upstream). The post's wording is acceptable but readers should be aware it does not help inbound listening sockets.
- `keepalive_requests 1000;` matches the current Nginx default (since 1.19.10). Setting it explicitly is harmless and makes intent visible.
- `net.core.somaxconn` accepts very large values on modern kernels (Linux 5.4+ raised the cap considerably); 65535 is well within range and a reasonable choice.
- `LimitNOFILE=65535` in the systemd unit is correct; on very modern systemd one could use `LimitNOFILE=infinity`, but the explicit numeric value matches the rest of the tutorial and is fine.
