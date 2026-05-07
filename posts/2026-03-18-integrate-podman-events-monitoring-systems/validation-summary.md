# Validation Summary: How to Integrate Podman Events with Monitoring Systems

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Podman events
- Bash
- jq
- netcat / ncat
- Prometheus text exposition format
- syslog / logger
- Webhooks with curl
- Grafana Loki push API
- systemd user services

## Sources Consulted
- Podman `podman-events` official documentation: https://docs.podman.io/en/stable/markdown/podman-events.1.html
- Prometheus exposition formats official documentation: https://prometheus.io/docs/instrumenting/exposition_formats/
- Grafana Loki HTTP API official documentation: https://grafana.com/docs/loki/latest/reference/loki-http-api/
- systemd unit file official documentation: https://www.freedesktop.org/software/systemd/man/latest/systemd.unit.html
- Local `nc -h`, `logger --help`, `curl --version`, `jq --version`, and `systemctl --user --help` output

## Issues Found
- The syslog, webhook, and Loki examples used Docker-style JSON paths such as `.Actor.Attributes.name` and lowercase `.time`. Podman's JSON Lines event output uses top-level fields such as `Name`, `Status`, `Time`, and `Type`, so the examples now use `.Name` and `.Time`.
- The webhook example filtered on `event=oom`, but `oom` is not a documented Podman container event status. The example now filters on the documented `died` container event status and describes the script as forwarding container exit events.

## Review Notes
- Podman was not installed in the local environment, so Podman-specific command behavior was verified against the current official Podman documentation instead of local `podman --help` output.
- The Prometheus exporter is intentionally minimal and suitable as an example, but a production exporter should use a maintained Prometheus client library or a hardened HTTP server.
- Using container names as Loki labels works technically, but high-cardinality labels should be reviewed before production use.
