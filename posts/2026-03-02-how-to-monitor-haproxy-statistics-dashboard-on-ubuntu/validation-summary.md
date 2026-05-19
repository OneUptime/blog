# Validation Summary: How to Monitor HAProxy Statistics Dashboard on Ubuntu

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- HAProxy (stats page, runtime/admin socket, native Prometheus endpoint)
- Ubuntu (systemd, ufw, cron.d)
- socat (for interacting with the HAProxy admin socket)
- Prometheus (`haproxy_exporter` and native exporter)
- Bash scripting (alerting script)

## Sources Consulted
- HAProxy 2.8 Configuration Manual — https://docs.haproxy.org/2.8/configuration.html (stats directives, ACLs, `http-request use-service prometheus-exporter`)
- HAProxy 2.8 Management Guide — https://docs.haproxy.org/2.8/management.html (section 9.1 CSV format, runtime/admin socket commands, check_status values)
- HAProxy blog: native Prometheus metrics endpoint — https://www.haproxy.com/blog/haproxy-exposes-a-prometheus-metrics-endpoint
- github.com/prometheus/haproxy_exporter releases (v0.15.0)
- github.com/haproxy/haproxy issue #1626 (frontend OPEN/STOP states)

## Issues Found
1. **Health check timeout code was wrong.** The post listed `TOUT` as a `LastChk` value. HAProxy never emits a bare `TOUT`; timeout statuses are always layer-prefixed: `L4TOUT`, `L6TOUT`, `L7TOUT`. Updated the bullet to `L4TOUT` / `L7TOUT` with the corresponding layer description.
2. **Misleading config comment ("Show version in the header").** This comment sat above `stats show-legends` and `stats show-node`, neither of which controls version display. `show-legends` adds column legends/tooltips, `show-node` displays the node name. Rewrote the comment to accurately describe what those directives do.
3. **Misleading config comment ("Optional: add a title to the page").** This sat above `stats admin if TRUE`, which actually enables the admin interface (matching how the post later describes it under "Enabling the Admin Interface"). Replaced the comment with an accurate description.

The `show stat` CSV column index used in the awk script (`$18` for status) was double-checked and is correct: HAProxy's docs use 0-indexed field numbers (status = field 17), which corresponds to `$18` in 1-indexed awk.

## Review Notes
- The `prometheus/haproxy_exporter` repository was archived in 2023 — v0.15.0 is the final release. It still works, but the post already steers readers toward the native (built-in) HAProxy Prometheus endpoint immediately after, which is the maintained path forward. No change needed, but readers should prefer the native endpoint for new deployments.
- The native Prometheus frontend example includes `stats enable` and `stats uri /`, which aren't strictly required when `http-request use-service prometheus-exporter` handles `/metrics` — they're harmless and provide a fallback stats UI on `/`.
- `stats admin if TRUE` exposes a destructive admin interface; the post correctly cautions readers about this and recommends authentication and network restrictions.
- `sudo ufw allow from 10.0.0.5 ...` followed by `sudo ufw deny 8404` works because ufw evaluates the more specific rule first, but readers should be aware that rule ordering matters if they customize further.
