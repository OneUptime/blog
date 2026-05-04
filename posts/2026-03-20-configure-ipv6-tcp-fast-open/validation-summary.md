# Validation Summary: How to Configure IPv6 TCP Fast Open

## Status
validated

## Post Type
Tutorial / Technical Guide

## Technologies Covered
- TCP Fast Open (TFO, RFC 7413)
- Linux kernel sysctl (`net.ipv4.tcp_fastopen`)
- IPv6
- NGINX `listen` directive (`fastopen=`, `reuseport`)
- Python `socket` module (`TCP_FASTOPEN`, `MSG_FASTOPEN`)
- `tcpdump`, `ss`, `curl` verification tooling

## Sources Consulted
- RFC 7413 — TCP Fast Open: https://datatracker.ietf.org/doc/html/rfc7413
- Linux kernel networking docs — Documentation/networking/ip-sysctl.rst (`tcp_fastopen`, `tcp_fastopen_key`): https://www.kernel.org/doc/html/latest/networking/ip-sysctl.html
- Linux header `<netinet/tcp.h>` — `TCP_FASTOPEN = 23`
- Linux header `<bits/socket.h>` — `MSG_FASTOPEN = 0x20000000`
- NGINX `listen` directive docs: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- curl manual — `--tcp-fastopen` (added in 7.49.0): https://curl.se/docs/manpage.html
- Python `socket` module documentation: https://docs.python.org/3/library/socket.html

## Issues Found
1. **Incorrect description and value for `net.ipv4.tcp_fastopen_key`** — The post claimed this sysctl tuned "the TFO cookie size (in bytes, default 8)" and set it to `1`. This is wrong on two counts: (a) `tcp_fastopen_key` is the 128-bit secret key the kernel uses to *generate* TFO cookies, formatted as four 8-character hex strings separated by dashes (e.g., `xxxxxxxx-xxxxxxxx-xxxxxxxx-xxxxxxxx`); it does not control cookie size. (b) Writing `1` is not a valid value for that key format. Removed the misleading three-line snippet entirely; the rest of Step 1 (enabling `tcp_fastopen = 3`) is correct and sufficient for enabling TFO.

## Review Notes
- The `TCP_FASTOPEN = 23` and `MSG_FASTOPEN = 0x20000000` numeric constants are correct on Linux. Modern Python (3.6+) exposes `socket.TCP_FASTOPEN` and `socket.MSG_FASTOPEN` directly, so the manual fallback definitions in the post are functional but not strictly necessary on current Python versions.
- The Mermaid sequence diagram correctly shows the two-phase TFO handshake (cookie acquisition on the first connection, 0-RTT data on subsequent connections) per RFC 7413.
- The IPv6 socket address tuple `(host, port, flowinfo, scope_id)` used in the Python examples is the correct form for `AF_INET6`.
- The NGINX `listen ... fastopen=N reuseport` syntax is valid; both options are independent and well-supported in mainline NGINX.
- The `tcp[tcpflags]` BPF expression in the tcpdump command works on Linux when there are no IPv6 extension headers between the IPv6 and TCP headers, which is the common case. It may silently miss packets that carry IPv6 extension headers, but this is acceptable for a quick verification step.
- `ss -6 -t -i` output includes a `fastopen` marker in the per-connection internal info on recent iproute2 versions; older releases may not show it.
- The `--tcp-fastopen` curl option requires curl built with TFO support (default on most Linux distributions since curl 7.49.0).
