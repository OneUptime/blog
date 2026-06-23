# Validation Summary: How to Configure Static File Serving with root vs alias in Nginx

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP server
- Nginx static file serving
- Nginx `root`, `alias`, `try_files`, `location`, `expires`, `add_header`, `sendfile`, `tcp_nopush`, `gzip`, and `gzip_static` directives
- Shell commands: `find`, `gzip`, `curl`, `tail`, `ls`

## Sources Consulted
- Nginx core module documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx static content administration guide: https://docs.nginx.com/nginx/admin-guide/web-server/serving-static-content/
- Nginx gzip module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_module.html
- Nginx gzip static module documentation: https://nginx.org/en/docs/http/ngx_http_gzip_static_module.html
- Nginx headers module documentation: https://nginx.org/en/docs/http/ngx_http_headers_module.html
- Nginx access module documentation: https://nginx.org/en/docs/http/ngx_http_access_module.html
- GNU `find --help` output
- GNU `gzip --help` output

## Issues Found
- The alias trailing slash guidance was too absolute. Nginx supports `alias` in `location` context and replaces the matching location prefix, but for directory prefix mappings the location and alias slash style should be kept consistent. Updated the heading, explanatory comment, and summary table to avoid implying every alias use requires a trailing slash.
- The regex alias security example claimed that `/uploads/../../../etc/passwd` could allow path traversal. Nginx matches locations against a normalized URI after resolving `.` and `..` path components, so that specific claim was misleading. Updated the warning to focus on unintended matches from an overly broad regex.

## Review Notes
- `gzip_static` is technically correct, but it depends on the optional `ngx_http_gzip_static_module`, which may not be included in every Nginx build.
- The `aio on;` and `directio 512;` example is valid Nginx syntax, but `aio` behavior is platform-dependent.
