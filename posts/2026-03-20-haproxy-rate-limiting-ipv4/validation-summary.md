# Validation Summary: How to Configure HAProxy Rate Limiting by IPv4 Address

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy
- HAProxy stick tables
- HAProxy Runtime API / admin socket
- HTTP rate limiting and `429 Too Many Requests`
- `socat`
- `awk`

## Sources Consulted
- HAProxy Configuration Manual 2.9: https://docs.haproxy.org/2.9/configuration.html
- HAProxy Configuration Manual 2.8: https://docs.haproxy.org/2.8/configuration.html
- HAProxy Configuration Manual 2.0, stick-table reference: https://docs.haproxy.org/2.0/configuration.html
- HAProxy Runtime API / management guide: https://www.haproxy.com/documentation/haproxy-configuration-manual/new/latest/management/
- HAProxy traffic policing tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/security/traffic-policing/
- RFC 6585, Additional HTTP Status Codes: https://www.rfc-editor.org/info/rfc6585

## Issues Found
- The multi-tier example declared a second `stick-table` inside the same `frontend` and used `id login_table`. HAProxy documents one stick-table per proxy; if another table is needed, it should live in a separate backend or peers table and be referenced with `table <name>`. I replaced the invalid inline table with a `backend login_rates` stick table and updated `track-sc1` to reference it.
- The multi-tier, whitelisting, and custom-header snippets used HTTP ACLs and `http-request`/`http-response` rules without explicitly setting `mode http`. These examples would only work if an external `defaults` section already forced HTTP mode. I added `mode http` so the snippets are valid as standalone examples.
- The custom-header section said it was returning RFC 6585 standard headers and tried to add `Retry-After` with `http-response set-header`. RFC 6585 defines `429 Too Many Requests` and allows `Retry-After`, but HAProxy `http-response` rules do not attach headers to HAProxy-generated deny responses. I changed the example to emit the rate-limited response with `http-request deny status 429 hdr Retry-After 60 ...` and clarified that `X-RateLimit-Limit` is a custom header.
- The monitoring commands used `socat stdio /run/haproxy/admin.sock`, which does not match HAProxy's documented Runtime API usage, and the `awk` example printed the expiry column instead of the client IP. I corrected the `socat` invocation order and fixed the `awk` field extraction so it reports `key=<ip>` values and the request rate.
- The `http_err_rate` comment implied a generic error counter. HAProxy documents that it covers request errors and 4xx responses, so I tightened the wording to match the actual counter semantics.

## Review Notes
- `http_err_rate` is useful for detecting malformed traffic, denied requests, failed auth, and 4xx-heavy scanning, but it does not represent backend 5xx failures. If the post later wants server-side failure tracking, `http_fail_rate` would be a better example.
- All examples rate limit `src`, which is correct when HAProxy sees the real client IP directly. If HAProxy sits behind another proxy or CDN, forwarded-client-IP handling would need a separate discussion.
- Local checks: the corrected `awk` pipeline was tested against the sample stick-table output and produced the expected IP/rate pair; `validation.json` was validated with `jq`. Runtime linting with `haproxy -c` and live Runtime API checks were not possible in this workspace because `haproxy` and `socat` are not installed.
