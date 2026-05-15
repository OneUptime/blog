# Validation Summary: How to Configure Caddy as a Load Balancer for Backend Services on RHEL

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- RHEL
- Caddy
- Caddyfile reverse_proxy directive
- Load balancing policies
- Active and passive health checks
- Sticky sessions
- systemd service management

## Sources Consulted
- Caddy install documentation: https://caddyserver.com/docs/install
- Caddy reverse_proxy directive documentation: https://caddyserver.com/docs/caddyfile/directives/reverse_proxy
- Caddy service documentation: https://caddyserver.com/docs/running
- Caddy command-line documentation: https://caddyserver.com/docs/command-line

## Issues Found
- The "Basic Round-Robin Load Balancing" heading was inaccurate because the example uses Caddy's default `random` policy. Changed the heading to "Basic Load Balancing."
- The load balancing policy comment omitted current documented policies such as `weighted_round_robin`, `random_choose`, `client_ip_hash`, `uri_hash`, and `query`. Updated the comment to match Caddy's documented policy list.
- The "Weighted Load Balancing" example incorrectly used `lb_policy header X-Route-To`, which performs header-based sticky selection by hashing the header value rather than weighted balancing. Replaced it with `lb_policy weighted_round_robin 3 2 1` and matching upstreams.
- The request header example manually overwrote `X-Forwarded-For` and `X-Forwarded-Proto`, although Caddy sets `X-Forwarded-For`, `X-Forwarded-Proto`, and `X-Forwarded-Host` by default. Updated the text to add only `X-Real-IP` when needed.
- The startup commands reloaded Caddy before validating the configuration. Reordered the snippet so validation happens before reload after configuration changes.

## Review Notes
Caddy was not installed in the local environment, so live `caddy validate` checks could not be run. The snippets were checked against the current official Caddy documentation instead.
