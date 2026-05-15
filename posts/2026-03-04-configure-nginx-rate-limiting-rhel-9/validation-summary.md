# Validation Summary: How to Configure Nginx Rate Limiting on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Nginx
- Nginx `ngx_http_limit_req_module`
- Nginx `ngx_http_geo_module`
- Linux systemd service management
- curl
- ApacheBench

## Sources Consulted
- NGINX `ngx_http_limit_req_module` official documentation: https://nginx.org/en/docs/http/ngx_http_limit_req_module.html
- NGINX Admin Guide, "Limiting Access to Proxied HTTP Resources": https://docs.nginx.com/nginx/admin-guide/security-controls/controlling-access-proxied-http/
- NGINX `ngx_http_geo_module` official documentation: https://nginx.org/en/docs/http/ngx_http_geo_module.html
- Apache HTTP Server `ab` official documentation: https://httpd.apache.org/docs/current/en/programs/ab.html
- Local `curl --help all` output for `-s`, `-o`, and `-w` flags.
- Local `systemctl --help` output for the `reload` command.

## Issues Found
- The memory usage note said 1MB stores about 16,000 IP addresses without qualification. NGINX documents that one megabyte stores about 16,000 64-byte states on 32-bit platforms or about 8,000 128-byte states on 64-bit platforms, so the post was updated to include both values.
- The `burst` and `nodelay` explanations said NGINX queues requests and processes them immediately. NGINX documents that `nodelay` serves excessive requests within the burst limit immediately instead of delaying them, so the wording was corrected.
- The `limit_req_log_level warn` comments said `warn` logs delayed requests and `error` logs rejected requests. NGINX documents that the directive sets the level for rejected requests and delayed requests are logged one severity level lower, so the comments were corrected.

## Review Notes
The Nginx directives, contexts, status code customization, empty-key allowlist pattern, `$limit_req_status` log variable, and shell command examples are technically valid. The local environment did not have `nginx` or `ab` installed, so configuration parsing and ApacheBench help output could not be run locally; those items were checked against official NGINX documentation and the documented ApacheBench command form.
