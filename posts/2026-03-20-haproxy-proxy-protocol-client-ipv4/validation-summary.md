# Validation Summary: How to Forward Client IPv4 Addresses with the PROXY Protocol in HAProxy

## Status
validated

## Post Type
Guide

## Technologies Covered
- HAProxy
- PROXY protocol
- Nginx
- TCP networking
- IPv4 client IP forwarding

## Sources Consulted
- HAProxy Configuration Manual: https://www.haproxy.org/download/2.9/doc/configuration.txt
- HAProxy PROXY protocol specification: https://www.haproxy.org/download/2.9/doc/proxy-protocol.txt
- NGINX `ngx_http_realip_module` documentation: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NGINX `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen

## Issues Found
- The PROXY protocol example line in the Mermaid diagram used the backend server IP and port as the destination tuple. I changed it to the original frontend/public destination (`203.0.113.10:80`) because the PROXY protocol carries the original source and destination addresses of the proxied connection.
- The HAProxy `accept-proxy` example claimed `$REMOTE_ADDR` would contain the real client IP. I changed this comment to refer to HAProxy seeing the real client IP as `src` for ACLs and logging, because `REMOTE_ADDR` is not a HAProxy configuration variable.
- The verification section used `show servers state` as if it verified PROXY protocol forwarding. I replaced it with a `tcpdump` capture command because `show servers state` reports backend server state, not whether HAProxy is prepending a PROXY header on traffic.
- The manual PROXY protocol test used `echo -e` and a destination tuple that did not match the proxied connection described in the post. I replaced it with `printf` and a header that simulates what HAProxy would send in this example.

## Review Notes
- NGINX `listen 8080 proxy_protocol;` requires clients on that socket to send the PROXY header. Plain direct connections to that port will fail unless they also speak PROXY protocol.
- HAProxy automatically uses PROXY protocol for health checks when `send-proxy` is set, unless health checks override `port` or `addr`; in that case `check-send-proxy` is required. The post’s current server examples do not override those values, so the snippets remain valid.
