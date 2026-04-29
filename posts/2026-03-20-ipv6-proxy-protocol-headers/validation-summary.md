# Validation Summary: How to Handle IPv6 in Proxy Protocol Headers

## Status
validated

## Post Type
Guide

## Technologies Covered
- PROXY Protocol v1 and v2
- IPv6
- HAProxy
- NGINX
- Python
- TCP networking
- Netcat

## Sources Consulted
- HAProxy PROXY protocol specification: https://raw.githubusercontent.com/haproxy/haproxy/master/doc/proxy-protocol.txt
- HAProxy 2.8 Configuration Manual: https://docs.haproxy.org/2.8/configuration.html
- NGINX Admin Guide, Accepting the PROXY Protocol: https://docs.nginx.com/nginx/admin-guide/load-balancer/using-proxy-protocol/
- NGINX `ngx_http_realip_module`: https://nginx.org/en/docs/http/ngx_http_realip_module.html
- NGINX `ngx_stream_realip_module`: https://nginx.org/en/docs/stream/ngx_stream_realip_module.html
- Python `ipaddress` module documentation: https://docs.python.org/3/library/ipaddress.html
- GitHub profile link check for the author URL: https://github.com/nawazdhandala

## Issues Found
1. **PROXY Protocol v2 header description was inaccurate**: The post described v2 as having a "16-byte signature" and treated `0x11` and `0x21` as address-family values. Updated the text to reflect the actual fixed 16-byte header structure: a 12-byte signature plus version/command, family/protocol, and length fields, with `0x11` meaning TCP over IPv4 and `0x21` meaning TCP over IPv6.

2. **NGINX HTTP example used an invalid IPv6 CIDR**: `2001:db8:proxy::/48` is not a valid IPv6 network literal. Replaced it with `2001:db8::/32`, which matches valid IPv6 example ranges used in documentation.

3. **NGINX `stream` and `http` examples conflicted on the same port**: Both examples listened on `8080` in the same `nginx.conf` snippet, which would create a bind conflict. Moved the `stream` example to `12345` so the combined example is internally valid.

4. **NGINX proxy targets were undefined**: The original `proxy_pass backend;` and `proxy_pass http://backend;` snippets referenced upstream names that were never defined. Replaced them with concrete upstream addresses so the examples are syntactically complete as written.

5. **Python parser accepted malformed PROXY v1 headers**: The code only validated IPv6 addresses, accepted unsupported protocol tokens, and allowed invalid port values and oversized headers. Updated the parser to enforce `TCP4`/`TCP6`, validate IPv4 and IPv6 addresses with the correct classes, check port formatting and range, and reject headers longer than the specification allows.

6. **Connection handler could mis-handle partial or malformed PROXY headers**: The original server example parsed after a single `recv()` and would fall back to the socket peer IP if the header arrived in fragments or was malformed. Updated it to continue reading until the PROXY line is complete for `PROXY `-prefixed connections, and to close the connection if the header is invalid.

7. **The manual test command relied on shell-specific `echo -e` behavior**: Replaced `echo -e` with `printf` so the bytes sent to `nc` are predictable across shells.

## Review Notes
- NGINX Open Source can accept PROXY protocol in both `http` and `stream`, but the RealIP modules are version- and build-dependent. The admin guide notes that HTTP PROXY protocol support requires NGINX Open Source 1.5.12+, stream PROXY protocol support requires 1.11.4+, and PROXY protocol v2 support requires 1.13.11+. It also notes that the HTTP and stream RealIP modules are not included in NGINX Open Source by default.
- The `send-proxy-v2` HAProxy example is technically correct, but it assumes the backend is explicitly configured to expect PROXY protocol headers. Enabling it against an unaware backend will break connections.
