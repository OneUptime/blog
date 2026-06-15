# Validation Summary: How to Monitor Networks with Prometheus

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Prometheus
- PromQL
- Prometheus alerting and recording rules
- Prometheus SNMP Exporter
- Prometheus Blackbox Exporter
- SNMP, including SNMPv2c and SNMPv3
- Docker Compose
- Grafana dashboard queries

## Sources Consulted
- Prometheus SNMP Exporter README: https://github.com/prometheus/snmp_exporter
- Prometheus SNMP Exporter generator README: https://github.com/prometheus/snmp_exporter/blob/main/generator/README.md
- Prometheus SNMP Exporter latest release: https://github.com/prometheus/snmp_exporter/releases/tag/v0.30.1
- Prometheus Blackbox Exporter README: https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference: https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md
- Prometheus alerting rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/alerting_rules/
- Prometheus recording rules documentation: https://prometheus.io/docs/prometheus/latest/configuration/recording_rules/
- Prometheus template reference: https://prometheus.io/docs/prometheus/latest/configuration/template_reference/
- Prometheus PromQL functions documentation: https://prometheus.io/docs/prometheus/latest/querying/functions/
- Prometheus promtool documentation: https://prometheus.io/docs/prometheus/latest/command-line/promtool/
- Docker Compose file reference: https://docs.docker.com/reference/compose-file/

## Issues Found
- The SNMP Exporter download commands used v0.25.0, which is outdated. Updated the commands to v0.30.1, the current release checked during review.
- The SNMP Exporter generator install command used `go install github.com/prometheus/snmp_exporter/generator@latest`, but the upstream generator documentation says the generator must be built with Net-SNMP dependencies. Replaced it with the documented clone/build flow and an explicit `./generator generate` command.
- The Docker Compose snippet included the obsolete top-level `version` field. Removed it to match current Compose behavior.
- The alert rules referenced `job="network-dns"` but the Blackbox Prometheus scrape config did not define a DNS scrape job. Added a matching `network-dns` scrape config using the existing `dns_probe` module.
- The high-latency alert formatted `probe_duration_seconds` as milliseconds without converting seconds to milliseconds. Changed the annotation to use Prometheus `humanizeDuration`.
- The Grafana interface status query attempted to join `ifOperStatus` with `ifDescr` as if `ifDescr` were a metric. The default SNMP Exporter `if_mib` module exposes `ifDescr` as a label, so the query was changed to `ifOperStatus{instance="$device"}`.
- The Grafana latency query used `histogram_quantile()` on `probe_duration_seconds`, which is a gauge, not a histogram bucket series. Replaced it with `quantile_over_time()` over `probe_duration_seconds`.

## Review Notes
- Validated Prometheus alerting and recording rules with `promtool check rules` using the official Prometheus container.
- Validated Prometheus scrape configuration snippets with `promtool check config`.
- Validated the Blackbox Exporter configuration with `blackbox_exporter --config.check`.
- Validated the Docker Compose snippet with `docker compose config`.
