# Validation Summary: How to Handle IPv6 Client IP Preservation in Load Balancers

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6
- Load balancers
- HAProxy
- nginx
- Proxy Protocol v2
- `X-Forwarded-For`
- `X-Real-IP`
- Python / Flask / Werkzeug
- Node.js / Express
- AWS Application Load Balancer
- Cloudflare

## Sources Consulted
- HAProxy Configuration Manual (`option forwardfor`, HTTP mode, address formats): https://docs.haproxy.org/2.9/configuration.html
- nginx `ngx_http_realip_module` docs: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- nginx `ngx_http_proxy_module` docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx `ngx_http_log_module` docs: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Flask deployment docs, "Tell Flask it is Behind a Proxy": https://flask.palletsprojects.com/en/stable/deploying/proxy_fix/
- Werkzeug `ProxyFix` docs: https://werkzeug.palletsprojects.com/en/stable/middleware/proxy_fix/
- Express "behind proxies" guide: https://expressjs.com/en/guide/behind-proxies.html
- Express API docs for `trust proxy` and `req.ip`: https://expressjs.com/en/api.html
- AWS ALB `X-Forwarded-*` header docs: https://docs.aws.amazon.com/elasticloadbalancing/latest/application/x-forwarded-headers.html
- Cloudflare HTTP headers reference: https://developers.cloudflare.com/fundamentals/reference/http-headers/
- Cloudflare IPv6 ranges list: https://www.cloudflare.com/ips-v6

## Issues Found
- Several example IPv6 literals were not syntactically valid, such as `2001:db8::client`, `2001:db8::lb`, and `2001:db8:lb::/64`. I replaced them with valid documentation-prefix IPv6 addresses so the examples are copyable and correct.
- The HAProxy `X-Forwarded-For` example implied the load balancer IP appears in the header by default and set `X-Real-IP` from `X-Forwarded-For`. HAProxy’s docs say `option forwardfor` adds the client IP and requires HTTP mode, so I added `mode http`, corrected the example header, and set `X-Real-IP` from `%[src]`.
- The Proxy Protocol nginx snippet put `log_format` inside a `server` block, but nginx documents `log_format` as `http`-context only. I moved the example into a valid `http { ... }` layout and added a matching `access_log` line.
- The Proxy Protocol nginx snippet also used invalid `set_real_ip_from` syntax with bracketed IPv6 and logged `$proxy_protocol_addr` instead of the resolved client address. I fixed the trusted IPv6 address syntax and switched logging to `$remote_addr` after `real_ip_header proxy_protocol`.
- The nginx `X-Forwarded-For` forwarding example used `$proxy_add_x_forwarded_for` in a configuration that already rewrites `$remote_addr` via the realip module. According to nginx’s variable behavior, that can duplicate the client IP. I changed it to pass through the trusted `X-Forwarded-For` chain without duplication.
- The Flask example manually parsed `X-Forwarded-For` from headers. Flask and Werkzeug recommend `ProxyFix` for trusted proxy setups, so I replaced the manual parsing with `ProxyFix(..., x_for=1)` and `request.remote_addr`.
- The Express example used `app.set('trust proxy', true)`. I narrowed it to `app.set('trust proxy', 1)` to match the single-load-balancer scenario described in the post and the documented hop-based trust model.
- The AWS ALB section showed a log-style example that does not match ALB header behavior and stated the behavior unconditionally. AWS documents this as the default `append` mode, with optional `preserve` and `remove` modes, so I changed the wording to "By default" and replaced the example with actual request-header examples, including the bracketed IPv6-with-port form.
- The nginx logging example used `$realip_remote_addr` as the "real client" field. nginx documents `$realip_remote_addr` as the original pre-rewrite address, which is typically the proxy or load balancer. I corrected the example to log `$remote_addr`.
- The Cloudflare section overstated `CF-Connecting-IP` as always carrying the original IPv6. Cloudflare documents that `Pseudo IPv4` in `Overwrite Headers` mode preserves the real IPv6 in `CF-Connecting-IPv6`, so I added that caveat.

## Review Notes
- The Cloudflare config snippet is still intentionally abbreviated; production configs must include all current Cloudflare IPv4 and IPv6 ranges, not just the sample prefixes shown.
- Local config validation with `nginx -t` or `haproxy -c` was not possible in this environment because those binaries are not installed.
