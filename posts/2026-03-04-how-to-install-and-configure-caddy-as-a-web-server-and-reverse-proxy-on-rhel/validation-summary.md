# Validation Summary: How to Install and Configure Caddy as a Web Server and Reverse Proxy on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Caddy
- Caddyfile
- systemd
- firewalld
- Reverse proxying
- Automatic HTTPS

## Sources Consulted
- Caddy install documentation: https://caddyserver.com/docs/install
- Caddy reverse_proxy directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy header directive documentation: https://caddyserver.com/docs/caddyfile/directives/header
- Caddy log directive documentation: https://caddyserver.com/docs/caddyfile/directives/log
- Caddy Automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy command line documentation: https://caddyserver.com/docs/command-line

## Issues Found
- The final TLS statement said Caddy provisions certificates from Let's Encrypt for all configured domains. Caddy's current documentation says the default ACME issuers include Let's Encrypt and ZeroSSL, and public certificate issuance requires valid DNS plus reachable HTTP/HTTPS challenge ports unless DNS challenge configuration is used. Updated the wording to say Caddy uses a public ACME CA such as Let's Encrypt or ZeroSSL for configured public domains, and clarified that ports 80 and 443 must be reachable.

## Review Notes
The installation commands, Caddyfile syntax for static files, reverse proxying, active health checks, response headers, access logging, systemd management commands, validation command, and firewalld commands are consistent with current official documentation.
