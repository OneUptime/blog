# Validation Summary: How to Integrate Loki with Alertmanager

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Loki
- Loki ruler
- LogQL alerting and recording rules
- Prometheus Alertmanager
- Grafana data source provisioning
- Docker Compose
- YAML configuration

## Sources Consulted
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki storage schema documentation: https://grafana.com/docs/loki/latest/operations/storage/schema/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager high availability documentation: https://prometheus.io/docs/alerting/latest/alertmanager/
- `grafana/loki:2.9.4 -verify-config`
- `prom/alertmanager:v0.26.0 amtool check-config`

## Issues Found
- The Docker Compose rule mount placed local rule files directly under `/loki/rules`, but Loki local ruler storage expects `/loki/rules/<tenant id>/*.yaml`. Updated the mount and text to use the single-tenant `fake` directory.
- The Loki ruler configuration nested `tls_config` under `alertmanager_client`, which Loki 2.9.4 rejects. Replaced it with `tls_insecure_skip_verify`, verified with `grafana/loki:2.9.4 -verify-config`.
- The Alertmanager configuration used deprecated `match`, `match_re`, `source_match`, and `target_match` fields. Replaced them with `matchers`, `source_matchers`, and `target_matchers`, then validated with `amtool check-config`.
- The local Loki ruler backend was shown alongside write/delete API examples without noting that local storage is read-only for the Ruler API. Added a caveat that write/delete examples require an API-capable shared backend.
- The "Reload Rules" command used `/ruler/ring/flush`, which is not a rule reload endpoint. Replaced it with a note about `poll_interval` and a Docker restart command for the Compose setup.
- The HA Loki ruler example omitted `enable_sharding` and used an incorrect Alertmanager refresh field name. Added `enable_sharding: true` and corrected the refresh field to `alertmanager_refresh_interval`.
- The Alertmanager HA section showed clustering as `alertmanager.yaml` fields, but Alertmanager clustering is configured with `--cluster-*` command-line flags. Replaced the invalid YAML snippet with a short correction and kept the flag-based startup example.

## Review Notes
The primary Loki and Alertmanager configuration examples were mechanically validated against the exact versions used in the post. The LogQL examples are consistent with Loki metric-query rule syntax, but production users should still test expressions against their own label schema and log formats before enabling alerts.
