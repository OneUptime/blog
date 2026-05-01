# Validation Summary: How to Disable Nagle's Algorithm for Low-Latency Applications

## Status
validated

## Post Type
Guide

## Technologies Covered
- TCP
- Nagle's algorithm
- `TCP_NODELAY`
- Python sockets
- Node.js `net`
- Go `net`
- nginx
- PostgreSQL
- Redis
- Linux `ss`

## Sources Consulted
- Python `socket` documentation: https://docs.python.org/3/library/socket.html
- Node.js `net` documentation: https://nodejs.org/api/net.html#socketsetnodelaynodelay
- Go `net.TCPConn.SetNoDelay` documentation: https://pkg.go.dev/net#TCPConn.SetNoDelay
- nginx `tcp_nodelay` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#tcp_nodelay
- PostgreSQL connection settings documentation: https://www.postgresql.org/docs/17/runtime-config-connection.html
- PostgreSQL server source (`pqcomm.c`): https://raw.githubusercontent.com/postgres/postgres/master/src/backend/libpq/pqcomm.c
- PostgreSQL client source (`fe-connect.c`): https://raw.githubusercontent.com/postgres/postgres/master/src/interfaces/libpq/fe-connect.c
- Redis client handling documentation: https://redis.io/docs/latest/develop/reference/clients/
- Redis `CONFIG GET` documentation: https://redis.io/docs/latest/commands/config-get/
- Redis sample configuration (`redis.conf`): https://raw.githubusercontent.com/redis/redis/unstable/redis.conf
- Linux `tcp(7)` manual page: https://man7.org/linux/man-pages/man7/tcp.7.html
- Linux `ss(8)` manual page: https://man7.org/linux/man-pages/man8/ss.8.html
- RFC 896: https://www.rfc-editor.org/rfc/rfc896

## Issues Found
- The description and conclusion claimed a specific "40ms" latency improvement. That number is not a general property of disabling Nagle and depends on OS behavior, delayed ACKs, and traffic patterns. I replaced it with workload-dependent wording.
- The introduction described `TCP_NODELAY` as the standard setting for any interactive or real-time application. I changed this to "common configuration" to avoid overstating when it is appropriate.
- The Python server example called `handle_connection(conn)` without defining the function. I added a minimal handler so the snippet is syntactically and operationally complete.
- The Go example omitted that Go `*net.TCPConn` already defaults to no delay. I corrected the comment, added error handling for `SetNoDelay`, and added `defer conn.Close()`.
- The nginx section used `proxy_socket_keepalive on;`, which controls `SO_KEEPALIVE`, not `TCP_NODELAY`. I replaced it with `tcp_nodelay on;` and clarified the distinction.
- The PostgreSQL snippet implied `tcp_keepalives_idle` disables Nagle. It does not; it only tunes TCP keepalives. I corrected the comments and noted that PostgreSQL sets `TCP_NODELAY` in its code rather than through `postgresql.conf`.
- The Redis section mixed `TCP_NODELAY` with `tcp-keepalive` and suggested verifying `TCP_NODELAY` using `ss ... | grep nodelay`. The Redis docs confirm Redis sets `TCP_NODELAY` by default, but `tcp-keepalive` is a different socket option and the documented `ss` output does not provide a reliable `nodelay` check here. I removed the misleading verification command and clarified the distinction.
- The system-wide section included an `LD_PRELOAD` example that would not actually force `TCP_NODELAY` on arbitrary sockets as described. I replaced it with an accurate note that `TCP_NODELAY` is a per-socket setting with no supported global switch.

## Review Notes
- `TCP_NODELAY` only disables Nagle's algorithm; it does not eliminate every source of latency on a TCP connection. Delayed ACK behavior and application request/response patterns still matter.
- The Node.js example was syntax-checked locally with `node --check`. The Python snippet was compiled locally with `compile(...)`. A Go toolchain was not available in the environment, so the Go example was validated against the current official `net` package documentation rather than built locally.
