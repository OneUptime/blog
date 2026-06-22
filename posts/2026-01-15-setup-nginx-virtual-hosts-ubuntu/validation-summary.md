# Validation Summary: How to Set Up Nginx Virtual Hosts (Server Blocks) on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Ubuntu 20.04, 22.04, and 24.04 LTS
- Nginx HTTP server
- Nginx server blocks, server names, locations, rewrites, logging, gzip, proxying, and SSL/TLS directives
- Certbot and the Nginx plugin
- OpenSSL self-signed certificate generation
- systemd service management
- logrotate

## Sources Consulted
- Nginx official server names documentation: https://nginx.org/en/docs/http/server_names.html
- Nginx official core HTTP module documentation for listen, root, alias, location, try_files, return, and related directives: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx official rewrite module documentation: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx official SSL module documentation: https://nginx.org/en/docs/http/ngx_http_ssl_module.html
- Nginx official HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx official logging module documentation: https://nginx.org/en/docs/http/ngx_http_log_module.html
- Nginx official proxy module documentation: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
- Certbot official user guide and CLI reference: https://eff-certbot.readthedocs.io/en/stable/using.html and https://eff-certbot.readthedocs.io/en/stable/man/certbot.html
- Ubuntu package references for Nginx versions in Jammy and Noble: https://packages.ubuntu.com/jammy/nginx and https://packages.ubuntu.com/noble/nginx
- Ubuntu Focal Nginx package/changelog reference: https://lists.ubuntu.com/archives/focal-changes/2020-July/019302.html

## Issues Found
- The Apache/Nginx comparison table described Apache configuration as "XML-like" and Nginx processing as simply "most specific match wins." Changed this to more accurate wording about directive/container syntax and Nginx exact, wildcard, regex, and default server name matching.
- HTTPS examples used `http2 on;`, which was introduced in upstream Nginx 1.25.1 and is not accepted by the Ubuntu 20.04, 22.04, or 24.04 apt package versions covered by the article. Changed the examples to `listen 443 ssl http2;` / `listen [::]:443 ssl http2;` for Ubuntu LTS compatibility.
- The `try_files` and rewrite sections placed several alternative `location /` examples in one server block, which would create duplicate location definitions if copied as-is. Split the alternatives into separate server examples.
- The nested location example could encourage an unnecessarily fragile pattern. Replaced it with sibling `/api/v1/` and `/api/v2/` locations while keeping the same routing intent.
- The custom logging section attempted to define a log format named `combined`, which conflicts with Nginx's predefined combined format. Renamed it to `custom_combined`.
- The conditional logging example used `$loggable` without defining it. Added a `map` in the `http` block so the example logs only 4xx and 5xx responses as described.
- The complete production example used the `detailed` access log format without defining it in that complete snippet. Changed it to the default access log format so the example is self-contained.
- PHP-FPM socket path was hard-coded to PHP 8.1 even though the article covers Ubuntu releases with different PHP defaults. Added a note to adjust the socket path to the installed PHP-FPM version.
- Comments described `X-XSS-Protection` as enabling the XSS filter without caveat. Updated comments to identify it as a legacy header for older browsers.

## Review Notes
- Verified representative Nginx configuration snippets with `nginx -t` in Docker using `nginx:1.18` and `nginx:1.24`, matching the main Ubuntu LTS package generations discussed. The host workspace itself does not have the `nginx` binary installed.
- Upstream Nginx 1.25.1 and newer prefer the `http2 on;` directive, while the Ubuntu LTS apt package versions covered by this post require the older `listen ... http2` parameter. The post now favors the syntax that works for the stated Ubuntu versions.
- The SSL examples assume certificate files, snippet files, and optional DH parameters exist before running `nginx -t`; this is normal for staged Nginx tutorials but should be followed carefully in production.
