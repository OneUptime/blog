# Validation Summary: How to Install Node Exporter for Prometheus on RHEL

## Status
validated

## Post Type
Tutorial

## Technologies Covered
- RHEL
- Prometheus
- Prometheus Node Exporter
- systemd
- firewalld
- PromQL
- Linux shell commands

## Sources Consulted
- Prometheus Node Exporter releases: https://github.com/prometheus/node_exporter/releases
- Prometheus Node Exporter README and collector documentation: https://github.com/prometheus/node_exporter
- Prometheus Node Exporter guide: https://prometheus.io/docs/guides/node-exporter/
- Prometheus configuration documentation: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus management API documentation: https://prometheus.io/docs/prometheus/latest/management_api/
- Prometheus command-line flags: https://prometheus.io/docs/prometheus/latest/command-line/prometheus/
- firewalld rich language documentation: https://firewalld.org/documentation/man-pages/firewalld.richlanguage.html
- firewall-cmd documentation: https://firewalld.org/documentation/man-pages/firewall-cmd.html
- Local command help for `useradd` and downloaded Node Exporter 1.11.1 `--help`

## Issues Found
- The post described Node Exporter 1.7.0 as the latest version. GitHub currently lists 1.11.1, released on 2026-04-07, as the latest release, so the version was updated and the comment was changed to avoid an evergreen "latest" claim.
- The systemd unit comment said Node Exporter was started with default collectors, but the unit explicitly enables additional collectors such as `systemd` and `processes`, which are disabled by default. The comment was corrected to say it starts with default collectors and selected additional collectors.
- The Prometheus reload command used `POST /-/reload` without noting that the endpoint is disabled by default. The reload instructions now state that the HTTP endpoint requires `--web.enable-lifecycle` and include the official SIGHUP alternative.

## Review Notes
The Node Exporter collector flags, textfile collector directory option, Prometheus scrape configuration structure, PromQL examples, systemd unit fields, `useradd` options, and firewalld port/rich-rule examples were checked and are technically valid. The `--collector.textfile` flag is accepted but redundant in current Node Exporter releases because the textfile collector is enabled by default; keeping it is harmless and makes the example explicit.
