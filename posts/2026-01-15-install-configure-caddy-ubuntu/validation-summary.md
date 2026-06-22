# Validation Summary: How to Install and Configure Caddy on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Caddy web server (v2.x)
- Ubuntu (apt, systemd)
- Caddyfile configuration syntax
- Let's Encrypt / ACME (automatic HTTPS)
- Reverse proxy and load balancing
- TLS/SSL configuration
- PHP-FPM, Node.js, SPA hosting
- Docker / docker-compose

## Sources Consulted
- Caddy Caddyfile directives — https://caddyserver.com/docs/caddyfile/directives
- Caddy command line reference — https://caddyserver.com/docs/command-line
- `caddy trust` man page — https://manpages.ubuntu.com/manpages/noble/man8/caddy-trust.8.html
- Automatic HTTPS — https://caddyserver.com/docs/automatic-https
- caddy-ratelimit plugin (mholt) — https://github.com/mholt/caddy-ratelimit
- rate_limit module docs — https://caddyserver.com/docs/modules/http.handlers.rate_limit
- tls directive — https://caddyserver.com/docs/caddyfile/directives/tls
- Caddy install instructions (Cloudsmith stable repo) — https://caddyserver.com/docs/install

## Issues Found
1. **Rate limiting presented as built-in.** The `rate_limit` directive is not part of standard Caddy — it is provided by the community `caddy-ratelimit` plugin and requires a custom build (`xcaddy build --with github.com/mholt/caddy-ratelimit`). The Caddyfile syntax shown is correct for that plugin, but as written the config would fail with an "unrecognized directive" error on a stock install. Added a clarifying note before the example explaining the plugin dependency.
2. **Incorrect description of `caddy trust`.** The Troubleshooting section labeled `caddy trust` as "Check certificate status." `caddy trust` actually installs Caddy's local CA root certificate into the system trust store (and typically needs `sudo`). Corrected the comment and the command (`sudo caddy trust`).
3. **Mislabeled "Debug mode" command.** `caddy run --config ... --adapter caddyfile` simply runs Caddy in the foreground using the Caddyfile adapter; it is not what enables debug mode (the global `debug` option does). Corrected the comment to describe the command accurately and point to the `debug` global option.

## Review Notes
- The repository install steps (Cloudsmith `stable` repo, GPG key, sources list) match Caddy's official Ubuntu/Debian instructions.
- The binary install referencing `v2.7.6` is valid; that release exists with the `caddy_2.7.6_linux_amd64.tar.gz` asset. It is a pinned version and will eventually be superseded — readers may want the latest release, but the example remains correct as-is.
- The "WebSocket Support" example is technically valid syntax, but slightly misleading: Caddy v2 proxies WebSocket connections automatically with no special configuration. The `transport http { versions h2c 2 }` block shown actually controls HTTP protocol versions to the backend (including h2c), not WebSocket upgrades. Left in place since the directives are syntactically correct, but readers should know WebSockets work out of the box.
- The Laravel/PHP example includes a manual `rewrite` block that is largely redundant — `php_fastcgi` already performs `try_files` rewriting to `index.php` internally. The config is valid (directive ordering in Caddy is by predefined priority, not source order) but more complex than necessary.
- `basicauth` is used; in Caddy 2.8+ the directive was renamed to `basic_auth`, with `basicauth` retained as a working deprecated alias. Given the post targets Caddy 2.7.x this is correct, but `basic_auth` is the forward-looking spelling.
- `tls { ca <url> }`, `acme_ca`, `default_sni`, `forward_auth`, health-check subdirectives, and the load-balancing options were all verified against current Caddyfile documentation and are correct.
