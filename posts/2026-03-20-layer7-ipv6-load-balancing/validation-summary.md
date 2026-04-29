# Validation Summary: How to Configure Layer 7 IPv6 Load Balancing

## Status
validated

## Post Type
Guide

## Technologies Covered
- IPv6 addressing and documentation prefixes
- HAProxy HTTP load balancing and health checks
- nginx HTTP load balancing and upstream configuration
- nginx real IP handling
- HTTP header forwarding
- `curl` IPv6 testing

## Sources Consulted
- HAProxy Configuration Manual: https://www.haproxy.com/documentation/haproxy-configuration-manual/latest/
- HAProxy Configuration Manual 2.6 (`option httpchk`, `server`, `bind`): https://www.haproxy.com/documentation/haproxy-configuration-manual/2-6r1/
- HAProxy ACLs tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/custom-rules/acls/
- HAProxy HTTP rewrites tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/http-rewrites/
- HAProxy Frontends tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/configuration-basics/frontends/
- nginx load balancing docs: https://nginx.org/en/docs/http/load_balancing.html
- nginx upstream module docs: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- nginx proxy module docs: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- nginx real IP module docs: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- nginx stub status module docs: https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- curl man page: https://curl.se/docs/manpage.html
- RFC 4291, IPv6 Addressing Architecture: https://datatracker.ietf.org/doc/html/rfc4291
- RFC 3849, IPv6 Address Prefix Reserved for Documentation: https://datatracker.ietf.org/doc/html/rfc3849

## Issues Found
- The HAProxy HTTPS frontend used `src_is_ipv6`, which is not a documented/current HAProxy ACL or fetch for this purpose. I replaced it with `http-request set-header X-Real-IP %[src]`, which is a documented way to forward the client IP.
- The HAProxy HTTPS frontend terminated TLS but did not perform the same path-based Layer 7 routing as the HTTP frontend. I added the `/api/`, `/static/`, and `/health` ACL/backend rules so HTTPS traffic is load-balanced at Layer 7 as described.
- The HAProxy health checks used HTTP/1.1 without a `Host` header. HAProxy documents that HTTP/1.1 health checks require a `Host` field, so I added `http-check send hdr Host example.com` to the affected backends.
- Multiple HAProxy and nginx example addresses were not valid IPv6 literals, including placeholders such as `2001:db8::web1`, `2001:db8::server1`, and `2001:db8:lb::/64`. I replaced them with valid `2001:db8::/32` documentation-prefix examples and valid hexadecimal hextets.
- The nginx snippet was labeled as `/etc/nginx/nginx.conf`, but the shown content is a partial `http`-context configuration snippet, not a complete standalone top-level nginx config. I relabeled it as `/etc/nginx/conf.d/ipv6-lb.conf`.
- The nginx upstream example claimed weighted round-robin while also enabling `least_conn`. I corrected the comment to describe weighted least-connection balancing and reordered the directives to match nginx’s documented examples.
- The nginx config referenced `ipv6_static_backends` but never defined that upstream. I added the missing upstream block.
- The nginx `/static/` location used `proxy_cache_valid` without enabling `proxy_cache`. Since nginx defaults `proxy_cache` to `off`, that line did not create working caching behavior. I removed it rather than implying caching was configured.
- The nginx API location added a custom `X-Original-IPv6` header even though the server listens on both IPv4 and IPv6 and already forwards the client address in standard headers. I removed the misleading extra header.
- The `curl --interface` example used an invalid placeholder IPv6 address. I changed it to a valid documentation-prefix address and kept `-6` so the test explicitly targets IPv6.
- The HAProxy stats and nginx status test commands assumed optional status endpoints that were not configured in the snippets. I clarified both commands so they are explicitly conditional on those status endpoints being enabled.

## Review Notes
- The post is technically sound after correction.
- Local `haproxy` and `nginx` binaries were not available in the workspace, so I validated against official documentation rather than running live `haproxy -c` or `nginx -t` checks.
- nginx upstream keepalive behavior changed in recent releases. Current nginx documentation says upstream HTTP proxying defaults to HTTP/1.1 as of 1.29.7, so the keepalive example is valid as written for current nginx.
- `stub_status` is an optional nginx module in source builds. The status-check command is valid only when that module is present and configured.
