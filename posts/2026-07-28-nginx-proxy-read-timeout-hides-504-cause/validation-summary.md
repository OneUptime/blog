# Validation Summary: Why Increasing NGINX `proxy_read_timeout` Can Hide the Real 504 Cause

## Status

validated

## Post Type

Troubleshooting guide

## Technologies Covered

- NGINX HTTP proxy module
- NGINX upstream timing and access logging
- HTTP reverse proxies and gateway timeouts
- HTTP 202, 429, 503, and 504 status codes
- Server-sent events and idle heartbeats
- Retry, deadline, cancellation, queueing, and load-shedding behavior
- Little's Law

## Sources Consulted

- [NGINX HTTP proxy module](https://nginx.org/en/docs/http/ngx_http_proxy_module.html)
- [NGINX HTTP upstream module](https://nginx.org/en/docs/http/ngx_http_upstream_module.html)
- [NGINX HTTP log module](https://nginx.org/en/docs/http/ngx_http_log_module.html)
- [NGINX HTTP core module variables](https://nginx.org/en/docs/http/ngx_http_core_module.html#variables)
- [NGINX upstream implementation](https://github.com/nginx/nginx/blob/master/src/http/ngx_http_upstream.c)
- [NGINX mailing-list explanation of NGINX-generated values in `$upstream_status`](https://mailman.nginx.org/pipermail/nginx/2020-August/059769.html)
- [RFC 9110: HTTP Semantics](https://www.rfc-editor.org/rfc/rfc9110.html)
- [RFC 6585: 429 Too Many Requests](https://www.rfc-editor.org/rfc/rfc6585.html#section-4)
- [WHATWG HTML Standard: Server-sent events](https://html.spec.whatwg.org/multipage/server-sent-events.html)
- [Google SRE Book: Addressing Cascading Failures](https://sre.google/sre-book/addressing-cascading-failures/)
- [National Academy of Engineering: Little's Law](https://www.nationalacademies.org/read/1867/chapter/22)

## Issues Found

- The description of `proxy_next_upstream_timeout` called it the total time allowed while trying alternative upstreams. NGINX checks this cumulative limit when deciding whether to pass the request to another server; it does not abort an upstream attempt already in progress. The description now states that boundary explicitly.
- The description of `$upstream_status` said it represented an upstream status only if one was received. NGINX can also place a generated 502 or 504 in this variable when it detects an upstream error or timeout. The description now distinguishes a status associated with an attempt from a status actually sent by the upstream.
- The description treated commas and colons in upstream timing variables as generic separators for multiple attempts. NGINX uses commas between contacted servers and colons between upstream server groups created by internal redirects such as `X-Accel-Redirect` or `error_page`. The prose and timing-pattern table now preserve that distinction.

## Review Notes

The timeout defaults, inactivity semantics, directive names and contexts, logging variables, retry restrictions for non-idempotent methods, HTTP status-code explanations, server-sent event heartbeat guidance, and Little's Law calculation were verified and are current. The post does not target a specific NGINX version; `$request_id`, `$upstream_header_time`, and `$upstream_connect_time` require NGINX 1.11.0, 1.7.10, and 1.9.1 or newer, respectively. No reviewed directive or variable is deprecated in current NGINX.
