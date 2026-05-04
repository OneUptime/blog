# Validation Summary: How to Configure TCP Keepalive Settings on Linux

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel TCP/IP stack (`net.ipv4.tcp_keepalive_*` sysctls)
- POSIX/Linux socket API (`SO_KEEPALIVE`, `TCP_KEEPIDLE`, `TCP_KEEPINTVL`, `TCP_KEEPCNT`)
- Python `socket` module
- PostgreSQL connection configuration
- nginx upstream module
- Redis configuration
- `ss` and `tcpdump` for diagnostics

## Sources Consulted
- Linux kernel IP sysctl documentation: https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- tcp(7) man page: https://man7.org/linux/man-pages/man7/tcp.7.html
- ss(8) man page: https://man7.org/linux/man-pages/man8/ss.8.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html
- PostgreSQL connection settings: https://www.postgresql.org/docs/current/runtime-config-connection.html
- nginx `ngx_http_upstream_module` keepalive directive: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Redis `redis.conf` reference (tcp-keepalive)
- TLDP TCP-Keepalive HOWTO: https://tldp.org/HOWTO/TCP-Keepalive-HOWTO/

## Issues Found
No technical issues found.

Verified specifics:
- Default sysctl values are correct: `tcp_keepalive_time=7200`, `tcp_keepalive_intvl=75`, `tcp_keepalive_probes=9`.
- Arithmetic (7200 + 9×75 ≈ 7875s ≈ 2h11m, and 60 + 6×10 = 120s) is correct.
- Python socket constants (`SO_KEEPALIVE` on `SOL_SOCKET`; `TCP_KEEPIDLE`/`TCP_KEEPINTVL`/`TCP_KEEPCNT` on `IPPROTO_TCP`) are correct for Linux.
- PostgreSQL parameter names (`tcp_keepalives_idle`, `tcp_keepalives_interval`, `tcp_keepalives_count`) are correct.
- nginx upstream `keepalive 32;` syntax is correct.
- Redis `tcp-keepalive` directive is correct.
- The description of keepalive probes (ACK with `seq = last-seq - 1`) matches the kernel implementation (`SND.NXT - 1`).
- `ss -tnop` output does include `timer:(keepalive,...)` for sockets with active keepalive timers, so both `grep` patterns work.

## Review Notes
- The `tcpdump` filter `'tcp and not (tcp[tcpflags] & (tcp-push|tcp-fin) != 0)'` is valid BPF syntax but is fairly broad — it filters out PUSH/FIN packets rather than precisely isolating keepalives. This is acceptable as a starting filter and the explanation following it (look for ACKs with `seq = last-seq - 1`) gives the reader the right identifying signature.
- `ss -tnop | grep "keepalive"` and `ss -tnop | grep timer:keepalive` are essentially equivalent in practice; the first matches any line where the timer field contains "keepalive", and on Linux that's the only place the substring appears in `ss` output.
- The PostgreSQL `tcp_keepalives_*` parameters apply to the server side; a similar set exists for libpq client connections. The post does not need to spell this out, but readers connecting from clients may also want to set them in their client connection strings.
