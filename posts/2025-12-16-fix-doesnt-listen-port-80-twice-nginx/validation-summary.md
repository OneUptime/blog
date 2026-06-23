# Validation Summary: How to Fix 'doesn't listen on port 80 twice' Errors in Nginx

## Status
validated

## Post Type
Troubleshooting guide

## Technologies Covered
- Nginx HTTP server configuration
- Nginx server blocks and virtual hosts
- IPv4 and IPv6 listen sockets
- HTTP/2 over TLS in Nginx
- Docker Compose port publishing
- Linux network inspection commands

## Sources Consulted
- Nginx `listen` directive documentation: https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- Nginx command-line parameter documentation: https://nginx.org/en/docs/switches.html
- Nginx request processing and default server documentation: https://nginx.org/en/docs/http/request_processing.html
- Nginx HTTP/2 module documentation: https://nginx.org/en/docs/http/ngx_http_v2_module.html#http2
- Docker Compose version top-level element documentation: https://docs.docker.com/reference/compose-file/version-and-name/

## Issues Found
- The flowchart said a valid default server setup would "Use SNI". For HTTP port 80 server selection, Nginx uses the `Host` header and `server_name`, not TLS SNI. Changed this to "Use Host/server_name".
- The duplicate configuration section implied that simply having files in both `sites-available` and `sites-enabled` is a duplicate configuration. On Debian-style layouts, `sites-enabled` usually contains symlinks to `sites-available`; the issue is including both trees or otherwise duplicating include patterns. Updated the wording.
- The IPv4/IPv6 conflict example used `listen 80 ipv6only=off`, which is not the correct form for a dual-stack IPv6 wildcard listener. Changed it to `listen [::]:80 ipv6only=off`.
- The HTTPS examples used the `http2` parameter on `listen` directives. Current Nginx documentation marks that parameter deprecated and recommends the `http2 on;` directive instead. Updated the examples to use `listen 443 ssl;` plus `http2 on;`.
- The Docker Compose example included `version: '3.8'`. Docker Compose now treats the top-level `version` property as obsolete and only informative, so it was removed.

## Review Notes
The local environment did not have the `nginx` binary installed, so command behavior and directive semantics were verified against official Nginx documentation rather than local execution. The automation script is a lightweight diagnostic helper; it can still produce broad warnings in valid multi-site configurations, but it is not presented as an authoritative validator.
