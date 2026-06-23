# Validation Summary: How to Configure Nginx Rate Limiting on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (limit_req / limit_conn rate and connection limiting modules)
- Ubuntu 20.04 / 22.04 / 24.04 LTS
- Nginx configuration directives: `limit_req_zone`, `limit_req`, `limit_conn_zone`, `limit_conn`, `limit_req_status`, `limit_conn_status`, `limit_rate`, `geo`, `map`, `set_real_ip_from` / `real_ip_header` / `real_ip_recursive`, `error_page`, named locations
- Testing tools: curl, Apache Bench (ab), wrk
- Bash scripting for testing/monitoring

## Sources Consulted
- Nginx `ngx_http_limit_req_module` docs — https://nginx.org/en/docs/http/ngx_http_limit_req_module.html (zone state size: ~64 bytes on 32-bit / ~128 bytes on 64-bit, ~8k 128-byte states per 1MB; default rejection status 503; empty-key requests are not accounted; `$limit_req_status` variable)
- Nginx `ngx_http_limit_conn_module` docs — https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html (`limit_conn_status`, `$limit_conn_status`)
- Nginx `ngx_http_geo_module` docs — https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Nginx `ngx_http_map_module` docs — https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_realip_module` docs — https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx `ngx_http_log_module` docs — https://nginx.org/en/docs/http/ngx_http_log_module.html (`access_log ... if=` conditional logging)
- Nginx `ngx_http_core_module` docs — https://nginx.org/en/docs/http/ngx_http_core_module.html (`location`, `error_page`, `limit_rate`)

## Issues Found
- **Duplicate `location /api/` block (config would fail `nginx -t`).** In the "Rate Limiting for APIs vs Web Pages" complete configuration, the API `server` block contained two identical `location /api/ { ... }` blocks. Nginx does not allow two prefix locations with the same path in one server and aborts startup/reload with `nginx: [emerg] duplicate location "/api/"`, so the presented "complete configuration" would not load. The second block was also broken on its own — it set `$write_request 1` via a `$request_method` check but never used the variable, so it had no functional effect. Fixed by removing the duplicate/incomplete second `location /api/` block (and its comment), leaving the working first `location /api/` in place. No other content changed.

## Review Notes
- The memory-sizing guidance (~128 bytes per state, ~8,000 IPs per 1MB) matches the official module docs for 64-bit platforms and is accurate.
- The burst/nodelay timing explanation (20 burst requests at 10r/s = ~2s without `nodelay`) is correct.
- The empty-key whitelisting pattern (`geo` → `map` producing an empty `$limit_key` so `limit_req` does not account the request) is valid and matches documented behavior.
- The `$limit_req_status` and `$limit_conn_status` log variables used in the custom log formats are real (introduced alongside the dry-run feature in modern Nginx versions, available on all currently supported releases).
- Minor caveat (not changed): the IPv6 `/64` prefix `map` regex in the Troubleshooting section is illustrative and will not correctly normalize every IPv6 representation (e.g. fully expanded vs. compressed addresses). It is explicitly framed as a "consideration," so it is acceptable as guidance, but readers deploying IPv6 prefix limiting should test it against their address formats.
- Minor caveat (not changed): `nginx -V 2>&1 | grep -o 'http_limit_req_module'` may return nothing even when rate limiting works, because the limit_req/limit_conn modules are compiled in by default and are not always shown as separate `--with-*` configure flags. The check is harmless but its absence of output should not be read as "module missing."
- All Ubuntu install/test commands (`apt install nginx`, `apache2-utils`, `wrk`), curl/ab/wrk invocations, and the bash test/monitor scripts are syntactically correct and current.
