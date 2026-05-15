# Validation Summary: How to Configure Caddy as a Load Balancer for Backend Services on RHEL 9

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL 9
- Caddy
- Caddyfile configuration
- Reverse proxying
- Load balancing
- Active health checks
- HTTP request headers
- systemd service reloads

## Sources Consulted
- Caddy reverse_proxy directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy installation documentation for Fedora, RedHat, and CentOS packages: https://caddyserver.com/docs/install
- Caddy service management documentation: https://caddyserver.com/docs/running

## Issues Found
- The post claimed round-robin is the default load-balancing policy. Caddy's current documented default is `random`, so the basic round-robin example now explicitly sets `lb_policy round_robin`, and the explanatory text no longer says round-robin is the default.
- The available policies list marked `round_robin` as the default. This was corrected to list `random` as the default and describe `round_robin` separately.
- The `header` load-balancing policy was listed without its required header field argument. This was changed to `header <field>`.
- The request header example manually set `X-Forwarded-For` and `X-Forwarded-Proto`, which Caddy already sets or augments by default. The example was narrowed to `X-Real-IP` to avoid overriding Caddy's default forwarded-header handling.

## Review Notes
Caddy was not installed in the local environment, so I could not run `caddy validate` locally. The Caddyfile snippets were reviewed against the official Caddy documentation.
