# Validation Summary: How to Fix 'Why is Nginx Responding to Any Domain Name'

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Nginx HTTP server configuration
- Nginx server blocks and `server_name` matching
- Nginx `listen ... default_server`
- Nginx `return` directive and non-standard 444 status
- Nginx SSL/TLS virtual hosts and SNI behavior
- Nginx access logging
- OpenSSL self-signed certificate generation
- curl host header testing

## Sources Consulted
- Nginx documentation: How nginx processes a request - https://nginx.org/en/docs/http/request_processing.html
- Nginx documentation: Server names - https://nginx.org/en/docs/http/server_names.html
- Nginx documentation: ngx_http_core_module - https://nginx.org/en/docs/http/ngx_http_core_module.html
- Nginx documentation: ngx_http_rewrite_module return directive - https://nginx.org/en/docs/http/ngx_http_rewrite_module.html
- Nginx documentation: Configuring HTTPS servers - https://nginx.org/en/docs/http/configuring_https_servers.html
- Nginx documentation: ngx_http_v2_module `http2` directive - https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx documentation: ngx_http_log_module `access_log` and `log_format` directives - https://nginx.org/en/docs/http/ngx_http_log_module.html
- Local OpenSSL 3.0.13 `openssl req -help` output for `req -x509`, `-nodes`, `-days`, `-newkey`, `-keyout`, `-out`, and `-subj`

## Issues Found
- The post said `server_name _;` is a catch-all that matches any hostname. Nginx documentation shows unmatched hosts are routed to the default server for the listen address/port; `_` is only a conventional invalid placeholder name. Updated the explanation to identify `default_server` as the catch-all mechanism.
- The Mermaid diagram implied there may be no default server. Nginx always has a default server for an address/port; if none is explicit, the first one is used. Updated the labels to distinguish explicit `default_server` from the implicit first server.
- The post said naming the file `00-default.conf` ensures it loads first. With `listen ... default_server`, filename ordering is not what makes the block default. Updated the comment and common-mistakes list to recommend explicit `default_server`.
- The complete configuration used `listen 443 ssl http2;`. Current Nginx documentation provides the `http2 on;` directive, introduced in 1.25.1, for enabling HTTP/2. Updated the example to use `listen 443 ssl;` plus `http2 on;`.
- The log-monitoring command used `awk '{print $4}'`, but the configured log format includes a timestamp with a space, so field 4 is the timezone rather than the host. Updated the command to split on double quotes and count the first quoted field, which is `$host`.

## Review Notes
- The OpenSSL command is syntactically valid. OpenSSL 3.0 marks `-nodes` as deprecated in favor of `-noenc`, but `-nodes` remains supported and commonly used, so no post change was required.
- The `if` example only uses `return`, which is a safe and supported use in Nginx rewrite context, though an explicit default server remains the cleaner primary approach.
