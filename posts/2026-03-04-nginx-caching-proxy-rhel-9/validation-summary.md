# Validation Summary: How to Set Up Nginx as a Caching Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Nginx
- Nginx proxy caching
- SELinux
- Linux system administration

## Sources Consulted
- Nginx ngx_http_proxy_module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Nginx ngx_http_upstream_module embedded variables documentation: https://nginx.org/en/docs/http/ngx_http_upstream_module.html
- NGINX Content Caching admin guide: https://docs.nginx.com/nginx/admin-guide/content-cache/content-caching/
- Red Hat Enterprise Linux 9 NGINX setup documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html/deploying_web_servers_and_reverse_proxies/setting-up-and-configuring-nginx_deploying-web-servers-and-reverse-proxies
- Red Hat Enterprise Linux 9 SELinux documentation: https://docs.redhat.com/en/documentation/red_hat_enterprise_linux/9/html-single/using_selinux/using_selinux

## Issues Found
- The cache-status table omitted `REVALIDATED`, which is one of the official `$upstream_cache_status` values. Added it to the table.
- The cache-key section described `proxy_cache_key $scheme$request_method$host$request_uri;` as the default. Nginx's default is `$scheme$proxy_host$request_uri`, so the example was corrected.
- The query-parameter cache-key example appended `$is_args$args` to `$request_uri`, which already includes the query string. Reworded the example to show adding `$request_method` only when the response varies by method or another request value.
- The background-update example enabled `proxy_cache_background_update` without allowing stale responses during `updating`. Added `updating` to `proxy_cache_use_stale`, as required for background cache refresh behavior.
- The purge section implied a custom purge location was generally available. Clarified that `proxy_cache_purge` is Nginx Plus functionality and that Nginx Open Source users should clear cache files or use another supported purge mechanism.

## Review Notes
The remaining commands and Nginx directives are syntactically valid for the tutorial's stated RHEL/Nginx use case. SELinux package availability and policy details can vary by installed RHEL policy packages, but the post's use of `semanage fcontext` and `restorecon` follows Red Hat's documented workflow for relabeling service directories.
