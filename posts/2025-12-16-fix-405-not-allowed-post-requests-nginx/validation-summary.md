# Validation Summary: How to Fix '405 Not Allowed' for POST Requests in Nginx

## Status
validated

## Post Type
Tutorial / Troubleshooting guide

## Technologies Covered
- Nginx
- HTTP methods and status codes
- Static file serving
- Reverse proxy configuration
- WebDAV
- CORS preflight requests
- curl

## Sources Consulted
- Nginx ngx_http_core_module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_dav_module documentation: https://nginx.org/en/docs/http/ngx_http_dav_module.html
- Nginx ngx_http_headers_module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx ngx_http_rewrite_module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html

## Issues Found
- The WebDAV section implied that Nginx's built-in WebDAV module handles POST requests. Nginx's official WebDAV module processes PUT, DELETE, MKCOL, COPY, and MOVE, not POST, so the section was corrected to describe PUT/DELETE file operations.
- The WebDAV snippet used `dav_ext_methods`, which is not a directive in Nginx's built-in `ngx_http_dav_module`. It was removed from the example.
- The Mermaid diagram implied a POST request could be handled by WebDAV. The request label was made method-neutral and the WebDAV path was clarified as PUT/DELETE.
- The `if ($request_method = POST) { return 200; }` example was described as handling POST requests for static files, but it returns an empty 200 response rather than serving the file. The explanation and comment were corrected.
- The complete SPA fallback configuration claimed to serve `index.html` for all routes, but POST requests that internally redirect to a static `index.html` can still produce a 405. Added `error_page 405 =200 /index.html;` to match the earlier SPA guidance.

## Review Notes
Nginx was not installed in the local environment, so syntax was reviewed against official Nginx documentation rather than `nginx -t`. The CORS example uses `if` only with `return` and `add_header`, which aligns with documented rewrite-module contexts, but production CORS policies should usually restrict allowed origins instead of using `*`.
