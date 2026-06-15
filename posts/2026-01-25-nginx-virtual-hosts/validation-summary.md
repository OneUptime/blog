# Validation Summary: How to Implement Virtual Hosts in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx server blocks and virtual hosts
- Nginx `server_name`, `listen`, `root`, `location`, `try_files`, `return`, `allow`, and `deny` directives
- Nginx SSL/TLS and HTTP/2 configuration
- Nginx reverse proxy and FastCGI configuration
- Linux shell commands for directories, ownership, configuration testing, service reloads, curl testing, and `/etc/hosts`

## Sources Consulted
- Nginx: Server names: https://nginx.org/en/docs/http/server_names.html
- Nginx: How nginx processes a request: https://nginx.org/en/docs/http/request_processing.html
- Nginx: Core module `listen` directive: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx: HTTP/2 module and `http2` directive: https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx: Rewrite module `return` directive: https://nginx.org/en/docs/http/ngx_http_rewrite_module.html#return
- Nginx: Proxy module `proxy_pass` directive: https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_pass
- Nginx: FastCGI module `fastcgi_pass` directive: https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_pass
- Nginx: Access module `allow` and `deny` directives: https://nginx.org/en/docs/http/ngx_http_access_module.html

## Issues Found
- The post used the deprecated `listen 443 ssl http2` syntax. Updated HTTPS examples to use `listen 443 ssl;` with `http2 on;`, matching current Nginx documentation.
- The default server example described `server_name _;` as a catch-all. Nginx documents that `_` has no special catch-all behavior; the `default_server` parameter on `listen` makes the block the fallback. Updated the comment to avoid implying `_` is special.
- The HTTP-to-HTTPS redirects used `$server_name`, which can redirect aliases such as `www.example.com` to the first configured server name. Updated redirects to `$host` so the examples preserve the requested host while changing the scheme.
- The wildcard subdomain example used a regex that captured only one label, while Nginx wildcard server names such as `*.example.com` can match multiple name parts. Updated the extraction regex to capture the full subdomain prefix.

## Review Notes
- The PHP-FPM socket path is distribution- and version-specific. The example is syntactically valid, but readers may need to adjust `/var/run/php/php-fpm.sock` for their installed PHP-FPM service.
