# Validation Summary: How to Configure Mattermost with IPv6

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Mattermost server configuration
- Nginx reverse proxy configuration
- IPv6 networking
- PostgreSQL connection strings
- Linux firewall configuration (`ip6tables`)
- Linux service management and verification commands

## Sources Consulted
- Mattermost documentation: Environment configuration settings — https://docs.mattermost.com/administration-guide/configure/environment-configuration-settings.html
- Mattermost documentation: Set up an NGINX proxy — https://docs.mattermost.com/deployment-guide/server/setup-nginx-proxy.html
- Mattermost documentation: Deprecated configuration settings — https://docs.mattermost.com/administration-guide/configure/deprecated-configuration-settings.html
- Go standard library documentation: `net` package — https://pkg.go.dev/net
- Nginx documentation: `ngx_http_v2_module` — https://nginx.org/en/docs/http/ngx_http_v2_module.html
- Nginx documentation: `listen` directive in `ngx_http_core_module` — https://nginx.org/en/docs/http/ngx_http_core_module.html#listen
- PostgreSQL documentation: libpq connection strings — https://www.postgresql.org/docs/16/libpq-connect.html
- Local CLI help checked for command syntax: `ip6tables --help`, `ss --help`, `curl --help all`

## Issues Found

1. **The JSON config snippets were not syntactically valid as written.** Both JSON examples included `//` comment lines inside `json` code fences. Removed those inline comments so the examples are valid JSON snippets.

2. **`EnableAPIv3` was outdated and removed from current Mattermost releases.** Mattermost documents this setting as removed in the June 16, 2018 release. Removed it from the `ServiceSettings` example.

3. **The Nginx HTTP/2 configuration used deprecated syntax, and the WebSocket block was incomplete.** Updated `listen 443 ssl http2;` / `listen [::]:443 ssl http2;` to the current `http2 on;` form with `listen ... ssl;`, and added `proxy_http_version 1.1;` to the WebSocket location so the upgrade proxying is complete.

4. **The PostgreSQL IPv6 data source example used an invalid host literal.** `2001:db8::postgres` is not a valid IPv6 address. Replaced it with a valid bracketed IPv6 literal, `2001:db8::1`, which matches PostgreSQL URI syntax.

5. **The IPv6 explanation overstated what is required for end-to-end IPv6 reachability.** Reworded the note and closing paragraph to match Mattermost and Go documentation more closely, and removed the `journalctl ... | grep "2001:"` verification step because it is not a reliable way to confirm external IPv6 client connectivity through an Nginx reverse proxy.

## Review Notes
- Mattermost's own Nginx example still shows `listen ... http2`, but Nginx officially deprecates that parameter in favor of `http2 on;` starting with version 1.25.1. The post now uses the current Nginx syntax.
- The firewall persistence path `/etc/ip6tables/rules.v6` is distro-specific. The command shown is commonly used on Debian/Ubuntu systems with `iptables-persistent`, but other Linux distributions may persist IPv6 firewall rules differently.
