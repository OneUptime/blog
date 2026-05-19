# Validation Summary: How to Optimize Nginx for High Concurrency on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (configuration directives, events module, http module)
- Ubuntu / Linux kernel sysctl parameters
- systemd service overrides (LimitNOFILE)
- Apache Bench (ab) and wrk for load testing
- Linux epoll event notification

## Sources Consulted
- Nginx core documentation: https://nginx.org/en/docs/ngx_core_module.html (worker_processes, worker_cpu_affinity, worker_connections, worker_rlimit_nofile, use, multi_accept)
- Nginx http core module: https://nginx.org/en/docs/http/ngx_http_core_module.html (sendfile, tcp_nopush, tcp_nodelay, keepalive_timeout, keepalive_requests, client_*_buffer, open_file_cache, etc.)
- Nginx gzip module: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Nginx limit_req: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- Nginx limit_conn: https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html
- Nginx stub_status: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- Linux tcp(7) man page (verified tcp_fin_timeout semantics)
- Linux kernel networking docs: https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt
- systemd.exec documentation: https://www.freedesktop.org/software/systemd/man/systemd.exec.html (LimitNOFILE)

## Issues Found
1. **`net.ipv4.tcp_fin_timeout` comment was incorrect**: The original comment read "Reduce TIME_WAIT timeout", which is a widespread misconception in Nginx tuning guides. According to the Linux tcp(7) man page and kernel sysctl docs, `tcp_fin_timeout` controls the FIN_WAIT_2 timeout (how long an orphaned socket waits for the peer's final FIN) — it does NOT change TIME_WAIT, which is hardcoded to 2*MSL. Updated the comment to accurately describe the behavior. Also clarified the adjacent `tcp_tw_reuse` comment to note it applies to new outbound connections (the kernel semantic).

## Review Notes
- `worker_cpu_affinity auto` requires Nginx >= 1.9.10 (Feb 2016); all currently supported Ubuntu LTS releases ship Nginx newer than this, so this is fine.
- `keepalive_requests` default was raised from 100 to 1000 in Nginx 1.19.10, so setting it explicitly to 1000 matches current upstream defaults but is still useful for older packaged versions.
- `tcp_tw_recycle` (a deprecated and removed companion to `tcp_tw_reuse`) was correctly omitted from the guide — it was removed in Linux 4.12.
- `gzip_types` correctly omits `text/html` since Nginx always compresses HTML when gzip is enabled.
- `proxy_busy_buffers_size 32k` is valid against the declared `proxy_buffer_size 16k` and `proxy_buffers 8 16k` (must be > proxy_buffer_size and < total proxy_buffers; 32k satisfies both).
- `text/javascript` is the current IANA-registered MIME type per RFC 9239 (2022); `application/javascript` is also still recognized. Both being listed is harmless.
- `wrk` is available in the Ubuntu universe repository on 20.04+.
- TIME_WAIT timeout itself (60s on Linux) is genuinely not tunable via sysctl without recompiling the kernel — the post no longer implies otherwise.
