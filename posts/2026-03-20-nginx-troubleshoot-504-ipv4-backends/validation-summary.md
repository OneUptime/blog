# Validation Summary: How to Troubleshoot Nginx 504 Gateway Timeout for IPv4 Backend Servers

## Status
validated

## Post Type
Tutorial / Troubleshooting Guide

## Technologies Covered
- Nginx (proxy module: `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`, `upstream`, `log_format`)
- HTTP status codes (504 Gateway Timeout, 502 Bad Gateway, 202 Accepted)
- curl, Apache Bench (`ab`), `httpstat`
- Linux tooling (`ss`, `tail`, `top`, `sort`, `ssh`)

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html (directives `proxy_connect_timeout`, `proxy_send_timeout`, `proxy_read_timeout`)
- Nginx ngx_http_log_module documentation (variables `$upstream_response_time`, `$request_time`): https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- Linux errno reference (`errno.h`): ETIMEDOUT = 110 on Linux; ETIMEDOUT = 60 on macOS/BSD
- httpstat on PyPI: https://pypi.org/project/httpstat/
- Apache Bench (`ab`) docs: https://httpd.apache.org/docs/current/programs/ab.html

## Issues Found
1. **Inaccurate `proxy_read_timeout` description.** The post described it as "Time to receive the FIRST byte of response". Per the official nginx docs, the timeout is set between two successive read operations from the upstream, not just for the first byte. Updated the inline comment to "Timeout between successive reads from upstream (increase for slow queries)".
2. **Inaccurate `proxy_send_timeout` description.** The post described it as "Time to send the full request body". Per nginx docs, this timeout is between two successive write operations, not for the whole request. Updated the inline comment to reflect this.
3. **Errno mismatch in error log examples.** The original log examples included one line with `(60: Operation timed out)` mixed with two lines using `(110: Connection timed out)`. Errno 60 is the BSD/macOS value for ETIMEDOUT, while Linux uses 110. Added a clarifying note that Linux uses 110 and macOS/BSD uses 60, and made all three example lines consistent (using 110, since the post otherwise targets a Linux-style `/var/log/nginx/error.log`). Also corrected the wording of the third line to the actual nginx phrase `while reading upstream` and added "from upstream" to the first line to match nginx's actual error-log output.
4. **Contradictory `proxy_connect_timeout` comment.** The example sets `proxy_connect_timeout 10s` but the comment said "default 60s - usually fine", which contradicts the override. Updated the comment to note the default (60s) and the hard cap (75s, per nginx docs).

## Review Notes
- The conclusion's statement that "504 Gateway Timeout in Nginx is always a backend performance issue" is a slight overgeneralization — 504 can also be triggered by network issues between Nginx and the upstream, or by overly aggressive timeout configuration on the Nginx side. Not changed because the surrounding paragraph correctly steers readers toward measuring backend response times before raising timeouts, which is the practical takeaway.
- `proxy_connect_timeout` cannot exceed 75 seconds per nginx documentation; the example uses 10s, which is well within bounds.
- `pip install httpstat` works as written; `httpstat` is available on PyPI.
- The `sort -t= -k2 -n` pipeline in Step 5 produces a usable ordering by `upstream_response_time` because the second `=`-delimited field starts with the numeric upstream response time; it is not the most robust approach (a malformed line could throw off the order), but it works for the given log format.
- The diagram in "Understanding Nginx Timeout Directives" is a simplification but conveys the relative ordering of the three timeouts correctly.
