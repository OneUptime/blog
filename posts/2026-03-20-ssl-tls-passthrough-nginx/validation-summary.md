# Validation Summary: How to Configure SSL/TLS Passthrough on Nginx Reverse Proxy

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- Nginx
- Nginx stream module
- Nginx stream proxy module
- Nginx stream SSL preread module
- TLS passthrough
- SNI-based routing
- OpenSSL s_client
- curl

## Sources Consulted
- Nginx `ngx_stream_core_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_core_module.html
- Nginx `ngx_stream_proxy_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_proxy_module.html
- Nginx `ngx_stream_ssl_preread_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_ssl_preread_module.html
- Nginx `ngx_stream_map_module` documentation: https://nginx.org/en/docs/stream/ngx_stream_map_module.html
- Nginx build configuration options: https://nginx.org/en/docs/configure.html
- Nginx Open Source installation and module packaging documentation: https://docs.nginx.com/nginx/admin-guide/installing-nginx/installing-nginx-open-source/
- Local `openssl s_client -help` output for `-connect` and `-servername`
- Local `curl --manual` output for `--resolve`

## Issues Found
1. **Missing SNI prerequisite**: The post only checked for the stream module, but SNI-based routing with `ssl_preread on` also requires `ngx_stream_ssl_preread_module`. Added an explicit prerequisite sentence and a `nginx -V` check for `--with-stream_ssl_preread_module`.

2. **Less precise Debian/Ubuntu package guidance**: The post suggested installing `nginx-extras` when stream support was missing. Changed the package command to `libnginx-mod-stream`, which directly provides the stream dynamic module on Debian/Ubuntu packaging.

3. **Invalid mixed HTTP/HTTPS example**: The mixed routing snippet used `$backend` and `backend_http` without defining them in the example. Added explicit `upstream ssl_backend` and `upstream backend_http` blocks, and changed the stream `proxy_pass` to use the defined upstream.

4. **Imprecise "HTTP termination" wording**: The mixed-mode section described plain HTTP handling as "termination", which is ambiguous in a TLS passthrough article. Changed it to "L7 handling".

5. **Overstated WAF/DDoS comparison**: The table said TLS termination provides "Full" WAF/DDoS protection. TLS termination enables full L7 inspection/WAF visibility, but DDoS protection is broader than TLS termination. Changed the row to "L7 WAF/inspection".

6. **Invalid curl placeholder**: The `curl --resolve` example used `proxy-ip`, which curl cannot parse as an address in the `host:port:addr` value. Replaced it with a concrete example IP address.

## Review Notes
- The `stream`, `map`, `upstream`, `server`, `listen`, `proxy_pass`, `proxy_timeout`, `proxy_connect_timeout`, and `ssl_preread` directives are used in valid Nginx contexts according to the official documentation.
- The `openssl s_client -connect ... -servername ...` and `curl --resolve host:port:addr` commands use valid flags.
- Nginx is not installed in this workspace, so I could not run `nginx -t` locally; configuration validation was based on official directive documentation.
