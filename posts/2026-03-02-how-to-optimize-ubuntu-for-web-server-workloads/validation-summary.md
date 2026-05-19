# Validation Summary: How to Optimize Ubuntu for Web Server Workloads

## Status
validated

## Post Type
Tutorial / How-to guide

## Technologies Covered
- Ubuntu (Linux kernel sysctl tuning)
- Nginx (worker tuning, gzip, open_file_cache, rate limiting, TFO, static caching)
- TCP/IP networking (buffers, backlogs, TIME_WAIT, keepalive, SYN cookies, BBR, fq qdisc)
- TCP Fast Open (RFC 7413)
- systemd (LimitNOFILE, LimitNPROC, unit overrides)
- PAM limits (`/etc/security/limits.d/`)
- numactl (NUMA pinning)
- IRQ affinity (`/proc/irq/*/smp_affinity`)
- Apache Bench (`ab`), `wrk`, `ss`, `netstat`

## Sources Consulted
- Nginx core directives reference: https://nginx.org/en/docs/ngx_core_module.html
- Nginx HTTP core module: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Linux kernel networking sysctl docs: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- Linux kernel TCP BBR / fq documentation
- systemd.exec(5) man page for `LimitNOFILE`, `LimitNPROC`, `ExecStart`, `ExecStartPre`
- limits.conf(5) man page for PAM limits format
- numactl(8) man page
- RFC 7413 (TCP Fast Open)
- Linux `/proc/sys/fs/file-nr` documentation (filesystems/proc.rst)
- `ab(1)`, `wrk(1)`, `ss(8)` man pages

## Issues Found

1. **Invalid Nginx directive placement**: `worker_connections 65535;` appeared at the top-level (main) context. Per the official Nginx docs, `worker_connections` is only valid inside the `events` block; placing it at the top level produces a `"worker_connections" directive is not allowed here` config error. Removed the duplicate top-level occurrence and kept the (correct) one inside `events { ... }`. Moved the explanatory comment into the events block.

2. **NUMA pinning did not actually pin the running nginx process**: The systemd override used `ExecStart=/usr/sbin/nginx -g "daemon off;"` (without numactl) and put `numactl --cpunodebind=0 --membind=0 nginx -t` in `ExecStartPre`. `nginx -t` only validates the configuration and exits, so numactl was applied to a short-lived test process, not the actual server. Rewrote the override so `ExecStart` itself invokes nginx via numactl: `ExecStart=/usr/bin/numactl --cpunodebind=0 --membind=0 /usr/sbin/nginx -g "daemon off;"`.

## Review Notes

- `net.ipv4.tcp_tw_reuse=1` is safe with timestamps and is primarily relevant for outbound connections (e.g., reverse-proxy → upstream); for a pure inbound listener it is effectively a no-op. The post's framing is fine, just worth noting.
- `net.core.somaxconn = 65535` is the maximum on kernels prior to 5.4; on newer kernels the cap is much larger, so 65535 is a conservative but valid choice.
- `net.ipv4.tcp_timestamps = 1` is already the default; setting it explicitly is harmless and documents the dependency for `tcp_tw_reuse`.
- The TFO section's note about "upstream backends" with `keepalive 64;` mixes two unrelated concepts (upstream HTTP keepalive vs TCP Fast Open). The listener-side `fastopen=10` example is correct; the upstream commentary is slightly imprecise but not technically wrong, so left as-is.
- The comment formula `(2 * worker_rlimit_nofile / workers)` is a rule-of-thumb description, not literally the value chosen (65535). Left intact since it is presented as guidance.
- `/proc/sys/fs/file-nr` returns three values `[allocated, unused, max]`; on modern kernels the middle field is always 0, so the post's `[open, 0, max]` comment is accurate for current Ubuntu kernels.
- `worker_processes auto;` is the recommended modern setting (Nginx maps it to the number of online CPU cores).
