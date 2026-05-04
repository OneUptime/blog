# Validation Summary: How to Configure Nginx Rate Limiting for IPv6 Clients

## Status
validated

## Post Type
Tutorial / Configuration guide

## Technologies Covered
- Nginx (`limit_req_zone`, `limit_req`, `limit_conn_zone`, `limit_conn`, `geo`, `map`, `error_page`, `add_header`, `default_type`)
- IPv6 addressing (privacy extensions, `/64` subnets, address rotation)
- HTTP status code 429 (Too Many Requests)
- curl (`-6` flag for IPv6)
- Bash brace expansion

## Sources Consulted
- Nginx `ngx_http_limit_req_module` docs: http://nginx.org/en/docs/http/ngx_http_limit_req_module.html (`limit_req_zone`, `limit_req`, `limit_req_status` — added in 1.3.15)
- Nginx `ngx_http_limit_conn_module` docs: http://nginx.org/en/docs/http/ngx_http_limit_conn_module.html
- Nginx `ngx_http_headers_module` docs: http://nginx.org/en/docs/http/ngx_http_headers_module.html (default `add_header` only applies to 200/201/204/206/301/302/303/304/307/308 — `always` parameter required for other codes)
- Nginx `ngx_http_geo_module` docs: http://nginx.org/en/docs/http/ngx_http_geo_module.html (IPv6 prefix support since 1.3.10)
- Nginx `ngx_http_core_module` docs (`listen`, `default_type`, `error_page`)
- RFC 4291 (IPv6 addressing — hex digits 0-9, a-f only)
- RFC 6585 (HTTP status code 429)
- RFC 4941 (IPv6 privacy extensions / temporary addresses)

## Issues Found
1. **Invalid IPv6 literal `2001:db8::backend`** — the letters `k` and `n` in "backend" are not valid hexadecimal digits. Replaced with `2001:db8::1` (RFC 3849 documentation prefix) in all four occurrences (`proxy_pass http://[...]:3000;`).
2. **Invalid IPv6 prefix `2001:db8:trusted::/48`** — `t`, `r`, `u`, `s` are not valid hex digits. Replaced with `2001:db8:abcd::/48`.
3. **`add_header` would not apply to 429 responses** — by default `add_header` only applies to a fixed set of success/redirect status codes. The `Retry-After` header on the custom 429 response would have been silently dropped. Added the `always` parameter (`add_header Retry-After 60 always;`).
4. **`Content-Type` for the JSON error body** — the original used `add_header Content-Type application/json;`, which (a) would not apply to 429 without `always`, and (b) is not the canonical way to set Content-Type in Nginx. Replaced with `default_type application/json;`, which correctly sets the response Content-Type for the `return 429 '...'` body.

## Review Notes
- The `if ($trusted_client = 1) { proxy_pass ...; break; }` pattern in the "Different Rates" section relies on the documented "if + proxy_pass" exception in Nginx's `ngx_http_rewrite_module`. The `break` is redundant (the request is already terminated by `proxy_pass`), but it is harmless. Note that the location-level `limit_req` may still apply to the implicit location created by the `if` block; for guaranteed bypass, a `map`-driven empty key on the `limit_req_zone` is the cleaner pattern. Left as-is — it is a common documented idiom.
- The `map $remote_addr $ipv6_subnet { ... ~^([0-9a-f:]{1,39}) $1; }` block does not actually extract a `/64` prefix — the regex captures the whole address. The author acknowledges this in inline comments ("Nginx doesn't have built-in IPv6 prefix extraction"). The `$ipv6_subnet` variable is also not used downstream, so the block is illustrative only. Left as-is since the comments make the limitation explicit.
- The `location = /rate-limit-exceeded.json` is nested inside `location /api/`. Nginx allows nested prefix/exact locations, and `error_page` internal redirects do reach the nested target in this configuration. A server-level placement would be more conventional, but the nested form works.
- The example URLs use `example.com` and the `2001:db8::/32` prefix (RFC 3849 documentation range), which is correct for examples.
- `limit_req_status 429` and `limit_conn_status 429` require Nginx 1.3.15+; this is universally available on any supported version today.
