# Validation Summary: How to Tune TCP Keepalive Parameters on Linux for IPv4

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Linux kernel TCP/IP stack (IPv4)
- sysctl / /etc/sysctl.d configuration
- TCP keepalive (`SO_KEEPALIVE`, `tcp_keepalive_time`, `tcp_keepalive_intvl`, `tcp_keepalive_probes`)
- Nginx (`keepalive_timeout` directive)
- PostgreSQL (`tcp_keepalives_idle`, `tcp_keepalives_interval`, `tcp_keepalives_count`)
- Redis (`tcp-keepalive` directive)
- `ss` (iproute2) and `tcpdump` utilities

## Sources Consulted
- Linux kernel documentation: Documentation/networking/ip-sysctl.txt / ip-sysctl.rst (default values 7200 / 75 / 9)
- man 7 tcp (TCP keepalive semantics and SO_KEEPALIVE socket option)
- PostgreSQL docs: https://www.postgresql.org/docs/current/runtime-config-connection.html (tcp_keepalives_* parameters)
- Redis reference: https://redis.io/docs/latest/operate/oss_and_stack/management/config/ (tcp-keepalive directive)
- Nginx docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#keepalive_timeout
- iproute2 `ss` man page (flags: -t TCP, -n numeric, -o show timer info, -p show processes; timer:(keepalive,...) output format)
- pcap-filter(7) for tcpdump expression syntax (tcp[tcpflags], tcp-ack, tcp-rst, ip[2:2])

## Issues Found
No technical issues found.

Verification details:
- Default keepalive values (7200s / 75s / 9 probes) match the Linux kernel defaults.
- Formula `tcp_keepalive_time + (tcp_keepalive_probes × tcp_keepalive_intvl)` correctly computes total time to declare a connection dead; the arithmetic `60 + 5*10 = 110s` is correct.
- PostgreSQL parameter names (`tcp_keepalives_idle`, `tcp_keepalives_interval`, `tcp_keepalives_count`) are the exact names from postgresql.conf.
- Redis `tcp-keepalive <seconds>` directive is valid.
- `ss -tnop` flags and the `timer:(keepalive,58sec,0)` example output format are accurate.
- tcpdump BPF expressions are syntactically valid; `ip[2:2] < 60` (IP total length) is a reasonable approximation for small keepalive probes, even if not uniquely specific to them.

## Review Notes
- The `ip[2:2] < 60` tcpdump filter matches small TCP ACKs in general, not only keepalive probes. It is a useful heuristic but readers should be aware it can produce false positives on other small ACKs.
- Redis' upstream default for `tcp-keepalive` changed to 300 in recent versions; the post's example setting of 60 is a user tuning choice and not a statement about the default, so no change is needed.
- The aggressive 60-second `tcp_keepalive_time` is appropriate for NAT-heavy environments but can generate noticeable probe traffic across very large connection pools. Not incorrect, just a trade-off worth flagging in a future revision.
