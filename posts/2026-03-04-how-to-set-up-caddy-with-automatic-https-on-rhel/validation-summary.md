# Validation Summary: How to Set Up Caddy with Automatic HTTPS on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Red Hat Enterprise Linux
- Caddy
- Caddyfile configuration
- Automatic HTTPS
- ACME / Let's Encrypt / ZeroSSL
- Cloudflare DNS challenge plugin
- systemd
- firewalld

## Sources Consulted
- Caddy installation documentation: https://caddyserver.com/docs/install
- Caddy automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy `tls` directive documentation: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy command-line documentation: https://caddyserver.com/docs/command-line
- Caddy service documentation: https://caddyserver.com/docs/running
- Caddy Cloudflare DNS provider README: https://github.com/caddy-dns/cloudflare

## Issues Found
- The installation commands omitted starting and enabling the Caddy systemd service. Official Caddy documentation notes that Fedora/RedHat/CentOS packages include systemd unit files but do not enable them by default, so I added `sudo systemctl enable --now caddy`.
- The post stated that every configured domain gets a certificate from Let's Encrypt. Current Caddy documentation says public DNS names use a public ACME CA such as Let's Encrypt or ZeroSSL, with both enabled by default as issuers. I updated the wording to avoid incorrectly implying Let's Encrypt is always the issuer.

## Review Notes
- The Cloudflare DNS challenge syntax, `caddy add-package` command, Let's Encrypt staging CA URL, `tls internal` usage, default systemd storage path, and firewalld service commands are consistent with the consulted documentation.
- The `caddy add-package` command is documented by Caddy as experimental; the post's usage is still technically valid.
