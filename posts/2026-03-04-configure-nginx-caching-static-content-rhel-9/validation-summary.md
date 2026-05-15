# Validation Summary: How to Configure Nginx Caching for Static Content on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Nginx
- Browser caching with `expires` and `Cache-Control`
- Nginx gzip compression
- Nginx proxy caching
- SELinux file contexts

## Sources Consulted
- Nginx `ngx_http_proxy_module` documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx `ngx_http_headers_module` documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx `ngx_http_gzip_module` documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- NGINX Content Caching admin guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- NGINX Compression and Decompression admin guide: https://docs.nginx.com/nginx/admin-guide/web-server/compression/
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/using_selinux/

## Issues Found
- The gzip configuration declared `gzip_min_length` twice in the same context. I changed the snippet to define it once with the intended `256` byte threshold.
- The text said Nginx compresses content before caching and serving. Nginx gzip is a response filter used when serving responses, so I changed the wording to "before serving."
- The proxy cache key comment said it used only the request URI, but the configured key also includes scheme, method, and host. I corrected the comment.
- The cache purging example used `proxy_cache_purge` as if it were available in the standard open source RHEL Nginx package and passed cache zone/key arguments that do not match the official directive syntax. I replaced it with manual cache removal guidance and noted that `proxy_cache_purge` requires NGINX Plus/commercial Nginx builds.

## Review Notes
The remaining Nginx proxy cache directives, `expires` usage, gzip directives, SELinux `semanage fcontext` and `restorecon` pattern, and troubleshooting commands are consistent with the consulted documentation. Future improvements could mention that `semanage` may require the `policycoreutils-python-utils` package on minimal RHEL installations.
