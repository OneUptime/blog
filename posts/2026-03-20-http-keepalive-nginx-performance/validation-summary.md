# Validation Summary: How to Configure HTTP Keep-Alive on Nginx for Better Performance

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP server
- HTTP/1.1 persistent connections
- Nginx reverse proxy configuration
- `curl` command-line HTTP client
- Nginx `stub_status` monitoring

## Sources Consulted
- NGINX official docs: `ngx_http_core_module` (`keepalive_timeout`, `keepalive_requests`) — https://nginx.org/en/docs/http/ngx_http_core_module.html
- NGINX official docs: `ngx_http_upstream_module` (`keepalive`, upstream keep-alive defaults, `keepalive_requests`, `keepalive_timeout`) — https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX official docs: `ngx_http_proxy_module` (`proxy_http_version`, `proxy_set_header`) — https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- NGINX official docs: `ngx_http_stub_status_module` — https://nginx.org/en/docs/http/ngx_http_stub_status_module.html
- NGINX Community Blog: Keep-alive to upstreams is now default in NGINX 1.29.7 — https://blog.nginx.org/blog/keep-alive-to-upstreams-is-now-default-in-nginx-1-29-7
- curl man page — https://curl.se/docs/manpage.html
- RFC 9112: HTTP/1.1, Section 9.3 Persistence — https://www.rfc-editor.org/rfc/rfc9112.html

## Issues Found
1. **Directive context was incomplete.** The post said the client keep-alive directives live in the `http` or `server` context, but `keepalive_timeout` and `keepalive_requests` are also valid in `location`. Updated the sentence to include all supported contexts.

2. **The upstream proxy section was outdated for current Nginx.** The post stated that `proxy_http_version 1.1` and `proxy_set_header Connection ""` are required. That was true before Nginx 1.29.7, but as of 1.29.7 Nginx uses HTTP/1.1 for proxying and enables upstream keep-alive by default. Updated the comments and explanation to make the version caveat explicit, and clarified that `keepalive 32` is a per-worker idle connection cache.

3. **The `curl` verification guidance was too absolute.** Under HTTP/1.1, persistent connections are the default, so a response does not need to include `Connection: keep-alive`. Replaced the command with `curl -I --http1.1` and corrected the explanation to note that `Keep-Alive: timeout=...` is only a hint header when configured, while `Connection: close` indicates the connection will not remain persistent.

4. **The `stub_status` section had two inaccuracies.** The module is not built by default, and the meanings of `Reading`, `Writing`, and `Waiting` were described imprecisely. Updated the text to note the build requirement and to match the official counter definitions.

## Review Notes
- The post is now technically accurate for current Nginx documentation as of 2026-04-30.
- The upstream keep-alive behavior changed recently in Nginx 1.29.7 (released in March 2026), so readers on older Nginx versions still need the explicit `proxy_http_version 1.1` and `proxy_set_header Connection ""` configuration shown in the post.
