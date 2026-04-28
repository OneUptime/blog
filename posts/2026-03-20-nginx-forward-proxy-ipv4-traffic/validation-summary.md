# Validation Summary: How to Set Up Nginx as a Forward Proxy for IPv4 Traffic

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx (HTTP forward proxy use case)
- `ngx_http_proxy_module` (`proxy_pass`, `proxy_set_header`, `proxy_*_timeout`, `proxy_buffering`)
- `ngx_http_core_module` (`resolver`, `resolver_timeout`, `listen`, `server`, `location`)
- `ngx_http_access_module` (`allow` / `deny`)
- `ngx_http_map_module` (`map`)
- `ngx_http_rewrite_module` (`if`, `return`)
- `ngx_http_auth_basic_module` (`auth_basic`, `auth_basic_user_file`)
- `ngx_http_log_module` (`log_format`, `access_log`, `error_log`)
- `ngx_http_proxy_connect_module` (third-party, for HTTPS CONNECT)
- `htpasswd` (Apache utilities)
- `curl` (`-x` proxy flag)
- Shell environment variables `http_proxy`, `https_proxy`, `no_proxy`
- IPv4 CIDR ranges (RFC 1918 private space)

## Sources Consulted
- Nginx `ngx_http_proxy_module` docs — https://nginx.org/en/docs/http/ngx_http_proxy_module.html (verified `proxy_pass` with variable, resolver requirement, URI pass-through)
- Nginx `ngx_http_core_module` docs — https://nginx.org/en/docs/http/ngx_http_core_module.html (`resolver`, `listen`)
- Nginx `ngx_http_access_module` docs — https://nginx.org/en/docs/http/ngx_http_access_module.html (`allow`/`deny`)
- Nginx `ngx_http_map_module` docs — https://nginx.org/en/docs/http/ngx_http_map_module.html
- Nginx `ngx_http_auth_basic_module` docs — https://nginx.org/en/docs/http/ngx_http_auth_basic_module.html
- Nginx `ngx_http_log_module` docs — https://nginx.org/en/docs/http/ngx_http_log_module.html (verified embedded variables: `$remote_addr`, `$remote_user`, `$time_local`, `$request`, `$status`, `$body_bytes_sent`, `$http_referer`, `$http_user_agent`, `$upstream_addr`, `$upstream_response_time`)
- chobits/ngx_http_proxy_connect_module — https://github.com/chobits/ngx_http_proxy_connect_module (confirmed it is third-party, requires patch + recompile, not part of stock Nginx)
- Apache `htpasswd` docs — https://httpd.apache.org/docs/current/programs/htpasswd.html (verified `-c` flag)
- curl manual — https://curl.se/docs/manpage.html (verified `-x`/`--proxy` flag)

## Issues Found
No technical issues found. The configuration patterns, directive names, embedded variables, CLI commands, and supporting claims (resolver requirement when using variables in `proxy_pass`, URI pass-through behavior, the third-party nature of `ngx_http_proxy_connect_module`) all match official documentation.

## Review Notes
- Port 3128 is described as the "standard proxy port" — this is conventional (Squid's default) and a reasonable choice; 8080 is another common alternative.
- `auth_basic` produces an HTTP 401 / `WWW-Authenticate` flow rather than the strict 407 / `Proxy-Authenticate` flow defined in RFC 7235 for HTTP proxies. In practice this works for forward-proxy clients that accept basic credentials in the request URL or via `Authorization`, and most curl/CLI clients handle it; readers needing strict proxy-auth semantics (407) would need a CONNECT-aware module or a different proxy.
- `proxy_pass http://$http_host;` is the well-known Nginx forward-proxy idiom and works because Nginx, when given a variable in `proxy_pass`, requires a resolver (correctly configured here) and passes the request URI as-is. It only handles plain HTTP — CONNECT tunneling for HTTPS genuinely needs the third-party module the post calls out.
- `$http_host` carries any client-supplied port (e.g., `example.com:8080`), so `proxy_pass http://$http_host;` will honor non-default ports — a small but useful detail not explicitly mentioned.
- The `if ($blocked) { return 403 ... }` pattern is acceptable here because `return` is one of the directives explicitly allowed inside `if` per Nginx's "if is evil" guidance.
- The post correctly notes that for production HTTPS forward-proxying, a dedicated tool like Squid is generally a better fit than a patched Nginx build.
