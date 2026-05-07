# Validation Summary: How to Configure Alertmanager to Listen on a Specific IPv4 Address

## Status
validated

## Post Type
Guide

## Technologies Covered
- Prometheus Alertmanager
- Prometheus
- YAML configuration
- systemd
- Linux networking and socket binding
- `amtool`

## Sources Consulted
- Prometheus Alertmanager configuration docs: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager high availability docs: https://prometheus.io/docs/alerting/latest/high_availability/
- Prometheus server configuration docs: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Alertmanager GitHub repository README: https://github.com/prometheus/alertmanager
- Alertmanager source for the default web listen flag: https://raw.githubusercontent.com/prometheus/alertmanager/main/cmd/alertmanager/main.go

## Issues Found
- The introduction stated that Alertmanager binds to `0.0.0.0:9093` by default. I corrected this to `:9093`, which is the current default in Alertmanager, and clarified that this typically exposes the service on all network interfaces.
- The routing and inhibition examples used deprecated matcher fields (`match`, `source_match`, and `target_match`). I replaced them with the current `matchers`, `source_matchers`, and `target_matchers` syntax recommended in the current Alertmanager configuration docs.
- The systemd unit enabled a cluster listener on `10.0.0.5:9094` even though the post is a single-node binding guide, not a high-availability setup. I changed this to `--cluster.listen-address=` so the example does not open the peer port unnecessarily and matches current Alertmanager HA guidance for disabling clustering.

## Review Notes
- Alertmanager 0.27 and later are in the UTF-8 matcher transition period. Using `matchers`, `source_matchers`, and `target_matchers` keeps the example aligned with current documentation and future strict-mode validation.
