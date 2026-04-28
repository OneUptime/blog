# Validation Summary: How to Set Up Nginx PROXY Protocol to Preserve IPv4 Client Addresses

## Status
validated

## Post Type
Tutorial / How-to Guide

## Technologies Covered
- Nginx (HTTP and Stream modules)
- PROXY Protocol (v1 and v2)
- HAProxy
- AWS Network Load Balancer (NLB)
- `ngx_http_realip_module` / `ngx_stream_realip_module`

## Sources Consulted
- Nginx `ngx_http_core_module` — `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx `ngx_http_realip_module`: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- Nginx `ngx_stream_core_module`: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx `ngx_stream_realip_module`: https://nginx.org/en/docs/stream/ngx_stream_realip_module.html
- HAProxy configuration manual — server keywords (`send-proxy`, `send-proxy-v2`): https://docs.haproxy.org/
- HAProxy / The PROXY protocol spec by Willy Tarreau: https://www.haproxy.org/download/1.8/doc/proxy-protocol.txt
- AWS ELBv2 NLB target group attributes (`proxy_protocol_v2.enabled`): https://docs.aws.amazon.com/elasticloadbalancing/latest/network/load-balancer-target-groups.html

## Issues Found
No technical issues found.

All directives, variables, and attribute names verified against current official documentation:
- `listen ... proxy_protocol` is a valid `listen` parameter on both HTTP and stream `server` blocks.
- Combining `ssl` and `proxy_protocol` on a single `listen` directive (as in `listen 443 ssl proxy_protocol;`) is supported.
- `real_ip_header proxy_protocol;` and `set_real_ip_from <cidr>;` are correct for both `ngx_http_realip_module` and `ngx_stream_realip_module`.
- `$proxy_protocol_addr` is a valid built-in variable populated when PROXY Protocol is enabled on the listen socket.
- HAProxy server keywords `send-proxy` (v1) and `send-proxy-v2` (v2) are correct.
- The AWS CLI command and the `proxy_protocol_v2.enabled=true` target group attribute match the AWS NLB docs.
- The security warning about restricting PROXY Protocol acceptance to trusted upstream IPs is accurate and important — the PROXY Protocol spec itself emphasizes that the receiver must only accept it from trusted senders.

## Review Notes
- The post overwrites `X-Forwarded-For` with just `$proxy_protocol_addr` rather than appending via `$proxy_add_x_forwarded_for`. This works for a single-hop scenario where Nginx sits directly behind the LB, but in multi-hop topologies the conventional approach is `proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;` (which, combined with the realip module, yields a correct chain). This is a minor stylistic / topology-dependent choice rather than a technical error.
- The validation curl example (`curl http://app.example.com/` returning `$proxy_protocol_addr`) implicitly relies on traffic flowing through the upstream LB — a direct curl to Nginx on a `proxy_protocol`-enabled listen socket without sending a PROXY header would fail. This is consistent with the post's setup but worth noting for readers.
- Version-specific note: PROXY Protocol support in Nginx HTTP listener has existed since 1.5.12 (and v2 since 1.13.11). The stream module supports it since 1.11.4 (v2 since 1.13.11). All versions in current LTS distributions support both, so no version caveat is needed.
