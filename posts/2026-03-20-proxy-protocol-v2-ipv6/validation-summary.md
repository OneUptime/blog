# Validation Summary: How to Configure PROXY Protocol v2 for IPv6

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- IPv6
- PROXY Protocol v2
- HAProxy
- NGINX
- Python
- curl
- AWS Network Load Balancer

## Sources Consulted
- HAProxy PROXY protocol tutorial: https://www.haproxy.com/documentation/haproxy-configuration-tutorials/proxying-essentials/client-ip-preservation/enable-proxy-protocol/
- HAProxy PROXY protocol specification: https://raw.githubusercontent.com/haproxy/haproxy/master/doc/proxy-protocol.txt
- NGINX admin guide, accepting the PROXY protocol: https://docs.nginx.com/nginx/admin-guide/load-balancer/using-proxy-protocol/
- NGINX `ngx_http_realip_module` docs: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NGINX `ngx_http_log_module` docs: https://nginx.org/en/docs/http/ngx_http_log_module.html
- curl man page: https://curl.se/docs/manpage.html
- AWS Network Load Balancer target group attributes and Proxy Protocol v2: https://docs.aws.amazon.com/elasticloadbalancing/latest/network/edit-target-group-attributes.html
- Python `ipaddress` library docs: https://docs.python.org/3/library/ipaddress.html
- Local CLI verification: `curl --help all`

## Issues Found
- The introduction referred to "AWS ELB" in a v2-specific context. I changed this to AWS Network Load Balancer, which is the AWS load balancer documented to use Proxy Protocol v2.
- The NGINX config placed `log_format` inside the `server` block. `log_format` is only valid in the `http` context, so I moved it to the file's top level and clarified that the file is included from `http {}`.
- The HAProxy logging section incorrectly implied `fc_pp_authority` returns the client IP. That fetch is for the PROXY v2 authority TLV; the snippet actually logs `%ci`, so I corrected the comment.
- The Python parser accepted incomplete or insufficiently validated headers. I added checks for full header length, validated the version/command/protocol combination, and updated the connection handler to continue reading until the full advertised header is available when the PROXY v2 signature is present.
- The testing section used `curl --haproxy-protocol` as though it tested Proxy Protocol v2 and included a `socat` example that was not a valid PROXY v2 test. I replaced it with a Python example that sends a real binary Proxy Protocol v2 IPv6 header and noted that curl's HAProxy option is v1-only.
- The common-pitfalls table mixed up NGINX and HAProxy directives and variables. I corrected the rows so they accurately distinguish `proxy_protocol`, `accept-proxy`, `$proxy_protocol_addr`, and `real_ip_header proxy_protocol`.

## Review Notes
- NGINX Open Source accepts PROXY protocol v2 starting with 1.13.11; older open source releases only support earlier PROXY protocol functionality.
- `ngx_http_realip_module` is not built into NGINX Open Source by default, so the `real_ip_header proxy_protocol` example depends on that module being available.
- HAProxy `accept-proxy` accepts incoming PROXY protocol headers generally; it is not limited to v2-only traffic.
- AWS Network Load Balancer health checks include a Proxy Protocol v2 header when the feature is enabled, but they do not carry end-client connection information in the same way as proxied client traffic.
