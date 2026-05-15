# Validation Summary: How to Set Up Caddy with Automatic HTTPS on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Caddy
- Caddyfile
- Automatic HTTPS
- ACME / Let's Encrypt / ZeroSSL
- DNS challenge and wildcard certificates
- TLS certificates

## Sources Consulted
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy TLS directive documentation: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy HTTPS quick-start: https://caddyserver.com/docs/quick-starts/https
- Caddy command-line documentation: https://caddyserver.com/docs/command-line
- Caddy conventions and data directory documentation: https://caddyserver.com/docs/conventions
- Caddy running as a systemd service documentation: https://caddyserver.com/docs/running

## Issues Found
- The internal HTTPS section described Caddy as generating "a self-signed certificate trusted by the local CA." Caddy creates an internal certificate authority and signs leaf certificates with that CA chain, so the wording was changed to "a locally trusted certificate signed by its internal CA" and clarified that clients must trust Caddy's root CA certificate.
- The certificate verification command used `caddy trust` without elevated privileges. For RHEL-style systemd service usage where Caddy runs as the `caddy` user, the official documentation recommends `sudo caddy trust` to install the local root CA into the system trust store, so the command was updated.

## Review Notes
- The Caddyfile examples for automatic HTTPS, reverse proxying, TLS options, wildcard DNS challenge, and internal certificates match current Caddy documentation.
- The `caddy add-package github.com/caddy-dns/cloudflare` command is documented by Caddy but is marked experimental in the official command-line documentation.
- The listed certificate storage path is appropriate for Caddy running as a systemd service with the `caddy` user's home under `/var/lib/caddy`.
