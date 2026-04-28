# Validation Summary: How to Configure Nginx Logging to Capture Client IPv4 Addresses

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (access logging, `log_format` directive)
- `ngx_http_realip_module` (`set_real_ip_from`, `real_ip_header`, `real_ip_recursive`)
- X-Forwarded-For HTTP header chain handling
- JSON-structured logging (`escape=json`) for ELK / Datadog / Splunk
- Conditional logging via the `map` module (`if=` parameter on `access_log`)
- Standard Unix log analysis tools (`awk`, `grep`, `sort`, `uniq`, `head`)

## Sources Consulted
- Nginx `ngx_http_log_module` documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx `ngx_http_core_module` variables: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx `ngx_http_realip_module` documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx `ngx_http_map_module` documentation: https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_upstream_module` (for `$upstream_addr`, `$upstream_response_time`): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- GNU coreutils `head` documentation (for syntax of line-count flag)

## Issues Found
1. **Invalid `head 10` / `head 20` syntax** in the "Analyzing Logs by IPv4 Address" section. `head` does not accept a bare numeric argument; passing `10` causes `head` to attempt to open a file literally named `10` and produce `head: cannot open '10' for reading: No such file or directory`. Verified by execution. Changed to `head -n 10` and `head -n 20` (the canonical, POSIX-compatible spelling).
2. **Unescaped regex metacharacters in the grep example** (`grep '^203.0.113.50'`). The `.` characters are regex wildcards, so the pattern would also match e.g. `203a0b113c50`. Additionally, without a trailing space anchor, it would also match `203.0.113.500`, `203.0.113.501`, etc. Replaced with `grep '^203\.0\.113\.50 '` to escape the dots and require a space after the IP (the field separator in the combined log format).

## Review Notes
- The `combined` `log_format` shown matches the default built into Nginx (see `ngx_http_log_module.html`).
- The `escape=json` parameter on `log_format` requires Nginx 1.11.8 or newer (released 2017); essentially every supported release today qualifies, so no version caveat is needed.
- The `real_ip_recursive on` comment ("Use the leftmost (original client) IP in the header") is a reasonable end-result simplification: the directive actually walks X-Forwarded-For from right to left skipping addresses listed in `set_real_ip_from`, and stops at the last *non-trusted* address. When every proxy hop is in the trusted list, that resolves to the leftmost (original client) IP, which is the typical deployment, so the description is accurate in practice.
- `$upstream_response_time` and `$upstream_addr` can contain comma-separated lists when a request hits multiple upstreams (retries / next-upstream); the JSON format quotes them as strings, which correctly handles that case.
- The `map` block must live in the `http` context — the example places it correctly.
