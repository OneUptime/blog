# Validation Summary: How to Configure Caddy Caddyfile Syntax on Ubuntu

## Status
validated

## Post Type
Technical guide

## Technologies Covered
- Ubuntu
- Caddy
- Caddyfile syntax
- HTTPS and TLS configuration
- PHP-FPM
- systemd environment overrides

## Sources Consulted
- Caddy Caddyfile Concepts: https://caddyserver.com/docs/caddyfile/concepts
- Caddy Request Matchers: https://caddyserver.com/docs/caddyfile/matchers
- Caddy Caddyfile Directives and directive ordering: https://caddyserver.com/docs/caddyfile/directives
- Caddy Global Options: https://caddyserver.com/docs/caddyfile/options
- Caddy basic_auth directive: https://caddyserver.com/docs/caddyfile/directives/basic_auth
- Caddy tls directive: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy handle_errors directive: https://caddyserver.com/docs/caddyfile/directives/handle_errors
- Caddy php_fastcgi directive: https://caddyserver.com/docs/caddyfile/directives/php_fastcgi
- Caddy Command Line reference: https://caddyserver.com/docs/command-line

## Issues Found
- Corrected site address explanations for `example.com:8080`, bare IP addresses, and `localhost`; Caddy enables automatic HTTPS for hostnames/IP addresses unless explicitly configured otherwise, and uses its local CA for localhost/IP certificates.
- Changed `basicauth` to `basic_auth`, the current directive name since Caddy v2.8.0.
- Scoped the common `reverse_proxy` example to `/api/*` so it does not conflict with the catch-all `file_server` example in the same site block.
- Fixed the TLS internal issuer example: `issuer internal { ca ... }` expects a Caddy CA ID, not a PEM file path, so the example now defines a named CA in the global `pki` block and references that ID.
- Replaced outdated error placeholder usage with `{err.status_code}` and used `handle_errors 404` for a specific 404 handler.
- Removed the incorrect WordPress rewrite pattern and made the PHP-FPM front-controller fallback explicit through `php_fastcgi`'s `try_files` subdirective.
- Replaced the misleading `caddy run --config ... --environ` dry-run example with `caddy adapt --config ... --validate --pretty`, which adapts and validates without starting the server.
- Fixed environment variable examples to use the current `basic_auth` directive, Caddyfile environment substitution for the password hash, and consistent `CLOUDFLARE_API_TOKEN` naming.
- Corrected a placeholder comment that described `{system.hostname}` as the Host header; it is the server hostname.

## Review Notes
Validated representative corrected Caddyfile snippets with `caddy adapt` using the official `caddy:latest` Docker image, which reported Caddy v2.11.2. Full runtime validation of DNS challenge examples was not performed because the stock image does not include the Cloudflare DNS provider plugin and the example certificate file paths/domains are illustrative.
