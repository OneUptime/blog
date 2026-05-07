# Validation Summary: How to Configure Alertmanager Clustering on IPv4 Peers

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus Alertmanager
- Prometheus
- `amtool`
- `systemd`
- `iptables`
- Alertmanager HTTP API v2

## Sources Consulted
- Prometheus Alertmanager high availability documentation: https://prometheus.io/docs/alerting/latest/high_availability/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus configuration documentation for `alerting.alertmanagers` and `alert_relabel_configs`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Official Alertmanager repository README and HA notes: https://github.com/prometheus/alertmanager
- Official Alertmanager API v2 OpenAPI specification: https://raw.githubusercontent.com/prometheus/alertmanager/refs/heads/main/api/v2/openapi.yaml

## Issues Found
- The firewall example only allowed TCP on port `9094`. Current Alertmanager high-availability documentation states cluster communication uses both TCP and UDP by default, so the original rules would block part of peer gossip traffic. I added matching UDP allow and drop rules for port `9094`.

## Review Notes
- No other technical issues were found in the Alertmanager startup flags, Prometheus `alerting.alertmanagers` configuration, `amtool alert add` usage, or the `/api/v2/status` verification example.
- If the two Prometheus servers are an HA pair with different external labels, current Prometheus documentation notes that `alert_relabel_configs` can be used to make the alerts identical before they reach Alertmanager.
