# Validation Summary: How to Rewrite URLs in Proxy Responses in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx reverse proxy configuration
- `proxy_redirect`
- `ngx_http_sub_module` / `sub_filter`
- `proxy_cookie_domain`, `proxy_cookie_path`, and `proxy_cookie_flags`
- `headers-more-nginx-module`
- `curl`

## Sources Consulted
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_sub_module` documentation: https://nginx.org/en/docs/http/ngx_http_sub_module.html
- Nginx `ngx_http_gunzip_module` documentation: https://nginx.org/en/docs/http/ngx_http_gunzip_module.html
- NGINX reverse proxy admin guide: https://docs.nginx.com/nginx/admin-guide/web-server/reverse-proxy/
- OpenResty `headers-more-nginx-module` documentation: https://github.com/openresty/headers-more-nginx-module

## Issues Found
- The "Protocol-Relative Rewrites" heading described redirects that use `$scheme://$host`, not protocol-relative URLs. Renamed it to "Scheme-Aware Rewrites" to match the configuration shown.
- The compressed-response example said `proxy_set_header Accept-Encoding ""` decompresses the backend response. That directive actually prevents sending the header to the upstream, so the backend is asked for an uncompressed response. Updated the wording and comments. Also clarified that `gunzip on` only decompresses gzip responses for clients that do not advertise gzip support.
- The `headers-more-nginx-module` example set `Location: https://public.example.com$upstream_http_location`, which could produce invalid URLs when the upstream Location header is already absolute and is not a reliable rewrite pattern. Replaced it with a technically correct conditional response header example.
- The performance section claimed `sub_filter` requires buffering the entire response. The official module documentation describes it as a response body filter that replaces strings in output buffers, not as requiring whole-response buffering. Updated the claim to CPU and memory overhead from scanning and modifying response buffers.

## Review Notes
The main Nginx directives and examples are otherwise consistent with official documentation. The post should continue to prefer `proxy_redirect` for redirect header rewriting; `headers-more` is useful for advanced header manipulation but is not a substitute for structured URL rewriting unless the replacement value is carefully computed.
