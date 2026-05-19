# Validation Summary: How to Install Caddy Web Server on Ubuntu

## Status
validated

## Post Type
Tutorial / installation guide

## Technologies Covered
- Ubuntu
- Caddy web server
- APT packages and Cloudsmith repository
- systemd
- Caddyfile configuration
- Automatic HTTPS and ACME
- Reverse proxying
- PHP-FPM
- UFW firewall
- Caddy Admin API
- TLS configuration

## Sources Consulted
- Caddy official installation documentation: https://caddyserver.com/docs/install
- Caddy official automatic HTTPS documentation: https://caddyserver.com/docs/automatic-https
- Caddy official reverse_proxy directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy official php_fastcgi directive documentation: https://caddyserver.com/docs/caddyfile/directives/php_fastcgi
- Caddy official tls directive documentation: https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy official Admin API documentation: https://caddyserver.com/docs/api
- Caddy DNS Cloudflare module documentation: https://caddyserver.com/docs/modules/dns.providers.cloudflare
- caddy-dns/cloudflare module README: https://github.com/caddy-dns/cloudflare

## Issues Found
- The official Caddy APT installation instructions now include `sudo chmod o+r` commands for the Cloudsmith keyring and source list files. Added those commands so the install sequence matches the current official documentation.
- The post listed `/var/log/caddy/` and `/var/log/caddy/access.log` as default log locations. The packaged systemd service logs are available through `journalctl -u caddy`, and Caddy does not create an access log file there unless logging is configured. Replaced the default log reference and removed the `tail` command.
- The reverse proxy example described an API subdomain "with rate limiting" but configured active health checks, not rate limiting. Updated the comment to match the actual configuration.
- The wildcard certificate example used `dns cloudflare`, which requires a Caddy build with the Cloudflare DNS module and is not included in the stock Caddy package. Added that caveat in the snippet comment.
- The Admin API description said configuration changes happen without "reloading the process." The API reloads configuration without restarting the process, so the wording was corrected.

## Review Notes
The remaining commands and Caddyfile snippets match current Caddy documentation. The PHP-FPM socket path uses PHP 8.1 as an example; Ubuntu releases may install a different PHP-FPM socket path, so future updates could make that version example more generic.
