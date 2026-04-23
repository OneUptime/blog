# Validation Summary: How to Rate Limit IPv6 Clients at the Reverse Proxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and prefix-based rate limiting
- NGINX `limit_req_zone`
- NGINX JavaScript module (`njs`)
- OpenResty / `lua-resty-limit-traffic`
- HAProxy stick tables and sample converters
- Traefik HTTP `rateLimit` middleware
- Python `ipaddress`

## Sources Consulted
- NGINX `ngx_http_limit_req_module`: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- NGINX `ngx_http_js_module`: https://nginx.org/en/docs/http/ngx_http_js_module.html
- NGINX JavaScript module overview and module export example: https://nginx.org/en/docs/njs/
- NGINX `ngx_http_realip_module`: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NGINX mailing list discussion on subnet-based `limit_req` keys in stock nginx: https://mailman.nginx.org/pipermail/nginx/2017-January/052671.html
- OpenResty `lua-resty-limit-traffic` repository: https://github.com/openresty/lua-resty-limit-traffic
- `resty.limit.req` documentation: https://github.com/openresty/lua-resty-limit-traffic/blob/master/lib/resty/limit/req.md
- HAProxy configuration manual (`track-sc*`, `set-src`, `ipmask`, stick tables): https://docs.haproxy.org/2.7/configuration.html
- Traefik rate-limit middleware docs (`sourceCriterion.ipStrategy.ipv6Subnet`): https://doc.traefik.io/traefik/v3.4/middlewares/http/ratelimit/
- Traefik HTTP service load balancer docs: https://doc.traefik.io/traefik/reference/routing-configuration/http/load-balancing/service/
- RFC 7421, Analysis of the 64-bit Boundary in IPv6 Addressing: https://www.rfc-editor.org/rfc/rfc7421
- RFC 8981, Temporary Address Extensions for SLAAC in IPv6: https://datatracker.ietf.org/doc/html/rfc8981
- RFC 6177, IPv6 Address Assignment to End Sites: https://datatracker.ietf.org/doc/html/rfc6177
- Python `ipaddress` library docs: https://docs.python.org/3/library/ipaddress.html

## Issues Found
- The original NGINX example attempted to derive a `/48` from `$remote_addr` with a text regex. That is not reliable for compressed IPv6 forms and is not a real prefix mask. I replaced it with an njs-based key generator using `js_set`, which is documented and handles compressed addresses correctly.
- The OpenResty example treated `resty.limit.req.new(..., 60, 20)` as if `60` meant requests per minute. The upstream docs define that argument as requests per second. I changed the example to `1` request per second (roughly 60 per minute on average), noted the unit explicitly, and fixed the limiter flow to apply `ngx.sleep(delay)` when the limiter returns a delay.
- The original Lua prefix extraction logic split the textual IPv6 address and failed on compressed forms. I replaced it with a key derived from `ngx.var.binary_remote_addr`, using the first 6 bytes for a `/48`, which matches the actual binary prefix.
- The OpenResty snippet returned from limiter-construction failure without terminating the request and did not handle non-rejection errors from `incoming()` correctly. I changed those paths to return `500` on internal failures and `429` on rejection.
- The HAProxy example used `src mask ffff:ffff:ffff::` with `track-sc*`, which is not the supported sample-expression form documented by HAProxy. I replaced it with `src,ipmask(0,48)` and the matching `sc0_http_req_rate` counter check.
- The Traefik section said IPv6 prefix grouping required a custom plugin or external solution. Current Traefik docs expose `sourceCriterion.ipStrategy.ipv6Subnet`, so I updated the example to use the built-in feature and added a minimal backend service block so the file-provider example is complete.
- The explanatory text overstated `/48 or /64` as the generic answer. I revised it so `/64` is presented as the common default for SLAAC/privacy-address clients, with broader masks such as `/56` or `/48` described as intentional aggregation choices that may group multiple users.
- The Python example hard-coded `/48` in the default constructor and comments. I changed it to a configurable-prefix explanation with a `/64` default to better match the corrected discussion.

## Review Notes
- The OpenResty example still uses a leaky-bucket limiter (`resty.limit.req`), so `1 req/s` is an average of about `60 req/min`, not a strict fixed one-minute window.
- The NGINX example now depends on the JavaScript module (`njs`). That is the cleanest documented way to compute an IPv6 prefix key inside NGINX configuration without relying on unreliable textual regex parsing.
- The trusted-client-IP guidance is version- and topology-sensitive. The corrected post now frames this properly: rate limiting should use the client address only after the reverse proxy has been configured to trust specific upstream proxies, rather than blindly trusting `X-Forwarded-For`.
