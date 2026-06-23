# Validation Summary: How to Fix 'upstream sent too big header' Errors

## Status
validated

## Post Type
Technical troubleshooting guide

## Technologies Covered
- Nginx reverse proxy buffering
- Nginx FastCGI buffering
- Nginx uWSGI buffering
- WebSocket proxying
- Server-Sent Events and streaming responses
- Bash command-line diagnostics

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_fastcgi_module documentation: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html
- Nginx ngx_http_uwsgi_module documentation: https://nginx.org/en/docs/http/ngx_http_uwsgi_module.html
- Nginx ngx_http_v2_module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx WebSocket proxying documentation: https://nginx.org/en/docs/http/websocket.html
- Nginx changelog for HTTP/2 listen parameter deprecation: https://nginx.org/en/CHANGES
- Local curl, awk, grep, sort, wc, and head command help/version output

## Issues Found
- The production example used `listen 443 ssl http2;`. Nginx 1.25.1 deprecated the `http2` parameter on the `listen` directive in favor of the separate `http2 on;` directive, so the example was updated to the current syntax.
- The WebSocket and streaming examples said `proxy_buffering off` disables buffering entirely. Nginx still uses `proxy_buffer_size` for the first part of the response when proxy buffering is disabled, so the wording was changed to "response body buffering."
- The header-size script printed the Set-Cookie count and the explanatory label on separate lines. It now stores the count and prints a single labeled result.

## Review Notes
The buffer directive names, contexts, and documented defaults match the official Nginx documentation. Nginx was not installed in the local environment, so full `nginx -t` validation could not be run locally.
