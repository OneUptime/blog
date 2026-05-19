# Validation Summary: How to Set Up Caddy Web Server on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Caddy Web Server v2
- Ubuntu (APT package management)
- systemd
- Let's Encrypt / ACME automatic HTTPS
- Caddyfile configuration language
- Caddy Admin API (HTTP JSON API)
- PHP-FPM (PHP 8.3)
- WordPress (PHP application example)
- xcaddy (custom Caddy builds with plugins)
- caddy-ratelimit community module
- HTTP security headers (HSTS, X-Frame-Options, etc.)
- openssl (for certificate inspection)
- curl (for testing and Admin API usage)

## Sources Consulted
- Official Caddy documentation: https://caddyserver.com/docs/
- Caddyfile reverse_proxy directive: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddyfile matchers: https://caddyserver.com/docs/caddyfile/matchers
- Caddy conventions / data directory: https://caddyserver.com/docs/conventions
- Caddy install instructions (Cloudsmith APT repo): https://caddyserver.com/docs/install#debian-ubuntu-raspbian
- caddy-ratelimit module: https://github.com/mholt/caddy-ratelimit
- xcaddy: https://github.com/caddyserver/xcaddy

## Issues Found
No technical issues found.

The installation steps (APT repository, signing key, package install) match the official Caddy install instructions.

The data directory path `/var/lib/caddy/.local/share/caddy/` is correct for the official APT package because the systemd unit runs Caddy as the `caddy` system user whose home is `/var/lib/caddy`, and Caddy's data directory defaults to `$HOME/.local/share/caddy` on Linux.

`transport http` sub-options (`dial_timeout`, `read_timeout`) are valid — both are documented Caddy options (initially I doubted `read_timeout` but verified it against the official reverse_proxy docs).

Load balancing policies (`random`, `round_robin`, `least_conn`, `ip_hash`) and active health-check directives (`health_uri`, `health_interval`, `health_timeout`) match the documented Caddyfile syntax.

The `php_fastcgi unix//run/php/php8.3-fpm.sock` form is correct — the `unix/` protocol prefix followed by the absolute path yields the `unix//run/...` double-slash form.

Security header values, the `-Server` header removal syntax, the global `email` directive for ACME notifications, the `log` directive with `roll_size`/`roll_keep`, and the `localhost` site address using Caddy's internal CA all match the documentation.

Admin API endpoints (`/load`, `/config/...`, `/metrics`) and the `text/caddyfile` Content-Type for `/load` match the documented Admin API behavior.

## Review Notes
- The WordPress example's `@notFound not file` + `rewrite @notFound /index.php?{query}` block is redundant — Caddy's `php_fastcgi` directive already performs the equivalent try-files-then-rewrite behavior by default (it tries `{path}`, then `{path}/index.php`, then falls back to the index). It is not incorrect, just unnecessary for typical WordPress setups.
- `sudo apt install golang-go` installs whatever Go version Ubuntu ships; xcaddy requires a reasonably recent Go (1.21+ at time of review). On older Ubuntu LTS releases users may need to install Go from the upstream tarball or a PPA.
- The `X-XSS-Protection` header is included for legacy browsers but is deprecated/ignored by all modern browsers. The author explicitly notes it is for older browsers, which is accurate.
- The Cloudsmith URLs are the officially documented installation source as of review, but Cloudsmith hosting could change in the future — readers should reference https://caddyserver.com/docs/install for the current canonical install command.
- Caddy's `localhost` certificate is technically issued by Caddy's internal CA (Caddy Local Authority) rather than being a classic "self-signed" certificate, but the term is used loosely and conveys the right meaning.
