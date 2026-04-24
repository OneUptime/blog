# Validation Summary: How to Configure Prometheus to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus server
- Prometheus HTTP API
- Prometheus configuration (`prometheus.yml`)
- `systemd`
- UFW
- `iptables`
- Linux socket inspection with `ss`

## Sources Consulted
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- Prometheus HTTP API: https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus configuration reference: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus HTTPS and authentication: https://prometheus.io/docs/prometheus/latest/configuration/https/
- Prometheus security model: https://prometheus.io/docs/operating/security/
- systemd special targets (`network-online.target` and `network.target`): https://www.freedesktop.org/software/systemd/man/latest/systemd.special
- Local authoritative man page checks: `man systemd.special`, `man systemd.service`

## Issues Found
- The introduction said binding to a specific address restricts the metrics endpoint and admin API. I changed this to the UI, API, and metrics endpoints because the admin API is controlled separately and is disabled by default unless `--web.enable-admin-api` is set.
- The self-scrape example used `localhost:9090` while the server example was bound only to `10.0.0.5:9090`. I changed the scrape target to `10.0.0.5:9090` so the example would work as written.
- The `systemd` unit used `After=network.target`, which does not guarantee the host has completed IP configuration. I changed it to `Wants=network-online.target` and `After=network-online.target` so binding to a specific IPv4 address is less likely to fail at boot.
- The firewall section's `iptables` example allowed only one of the two approved source IPs shown in the UFW example. I added the second `iptables` allow rule to make the examples consistent.
- The conclusion said Prometheus has no built-in authentication. I changed this to say authentication is not enabled by default, which matches current Prometheus behavior because TLS and basic auth can be configured via `--web.config.file`.

## Review Notes
- The post remains broadly correct after these fixes. `--web.external-url` is valid in the example, but it is only needed when Prometheus should generate links for a specific externally reachable URL; when omitted, Prometheus derives the URL automatically.
- Prometheus supports TLS and basic auth through `--web.config.file`, but network-level filtering is still a sound recommendation for reducing exposure.
