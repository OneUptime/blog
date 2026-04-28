# Validation Summary: How to Configure net.core.somaxconn and TCP Backlog for High-Connection Servers

## Status
validated

## Post Type
Tutorial / Guide (Linux server tuning)

## Technologies Covered
- Linux kernel sysctl parameters (`net.core.somaxconn`, `net.ipv4.tcp_max_syn_backlog`, `net.ipv4.tcp_syncookies`, `net.ipv4.tcp_fin_timeout`, `net.ipv4.tcp_tw_reuse`, `net.ipv4.ip_local_port_range`, `fs.file-max`)
- TCP listen backlog / accept queue / SYN queue
- `sysctl`, `netstat`, `ss`, `nstat` CLI tools
- `/etc/sysctl.d/` and `/etc/security/limits.conf`
- Nginx `listen` directive with `backlog` parameter
- Node.js `http` module `server.listen()` with backlog argument
- Python `socket.listen()` API

## Sources Consulted
- Linux kernel ip-sysctl documentation: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux kernel commit raising somaxconn default to 4096 (kernel 5.4): https://github.com/torvalds/linux/commit/19f92a030ca6d772ab44b22ee6a01378a8cb32d4
- Node.js `net.Server.listen()` API: https://nodejs.org/api/net.html
- Python `socket` module documentation (socket.listen backlog parameter)
- Nginx `ngx_http_core_module` documentation for the `listen` directive's `backlog` parameter
- `ss(8)`, `netstat(8)`, and `nstat(8)` man pages

## Issues Found
- **Outdated default for `net.core.somaxconn`**: The post stated the default is 128. This was true on older kernels but was raised to 4096 in Linux kernel 5.4 (released November 2019). Updated the comment in Step 1 and the conclusion to reflect both old and current defaults.
- **Imprecise default for `tcp_max_syn_backlog`**: The post claimed the default is 512. The actual default is computed dynamically based on system memory (commonly ranges from 128 to 2048+ on typical systems). Updated the inline comment to note the value scales with memory.

No other technical inaccuracies were found. Code samples, CLI invocations, kernel-parameter names, Nginx/Node.js/Python listen-backlog APIs, and netstat/ss output descriptions are correct.

## Review Notes
- The `tcp_tw_reuse=1` recommendation is appropriate for outbound-heavy hosts. Note that the upstream kernel default is `2` (loopback only) on recent kernels; setting `1` enables it globally, which is safe for clients/initiators but should not be expected to help inbound listeners.
- `net.ipv4.tcp_syncookies` defaults to `1` on essentially all modern Linux distributions; the explicit `sysctl -w net.ipv4.tcp_syncookies=1` is harmless and serves as documentation, but is rarely required.
- For `ss -lnt` on a `LISTEN` socket: `Recv-Q` is the current accept queue depth and `Send-Q` is the configured backlog (effectively `min(application_backlog, somaxconn)`); the post's explanation matches the man page.
- The `nstat TcpExtListenOverflows TcpExtListenDrops` invocation works because `nstat` accepts counter-name patterns as positional arguments; if no output appears, the counters are zero (use `-z` to also show zeroed counters).
- Setting `net.ipv4.ip_local_port_range = 1024 65535` overlaps the IANA registered-port range (1024-49151). This is fine for dedicated servers but may collide with services that bind to fixed low ports; tuning to `10240 65535` is a slightly safer alternative for shared boxes.
- The combined ulimit and `fs.file-max` values are reasonable for high-connection servers; `fs.file-max=2097152` and `nofile=1048576` headroom comfortably exceeds the 65535-per-socket backlog discussed.
