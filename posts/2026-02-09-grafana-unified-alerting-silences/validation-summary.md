# Validation Summary: How to use Grafana unified alerting with silences and inhibitions

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana Alerting
- Grafana Alertmanager
- Prometheus Alertmanager
- Alertmanager silences API v2
- Alertmanager inhibition rules
- PromQL
- Bash, curl, jq

## Sources Consulted
- Grafana Alerting documentation: https://grafana.com/docs/grafana/latest/alerting/
- Grafana configure silences documentation: https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/configure-notifications/create-silence/
- Grafana configure inhibition rules documentation: https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/configure-notifications/inhibition-rules/
- Grafana configure notifications documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications
- Grafana meta monitoring documentation: https://grafana.com/docs/grafana/latest/alerting/set-up/meta-monitoring/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager API v2 OpenAPI specification: https://raw.githubusercontent.com/prometheus/alertmanager/main/api/v2/openapi.yaml
- Prometheus Alertmanager project documentation: https://github.com/prometheus/alertmanager

## Issues Found
- Updated the Grafana UI navigation for creating silences from `Alerting > Silences` / `New Silence` to `Alerts & IRM > Alerting > Silences` / `Create silence`, matching current Grafana documentation.
- Clarified that the YAML `inhibit_rules` examples apply to Prometheus and Mimir Alertmanager configuration, while Grafana 13 and later manages Grafana-managed inhibition rules through the Grafana App Platform API and assigns them to a specific Alertmanager.
- Corrected the recurring maintenance guidance. Silences have fixed start and end times; recurring schedules should generally use mute timings. The script remains valid as a way to create repeated one-time silences.
- Replaced non-existent or unsupported Grafana alerting metric examples (`grafana_alerting_silences`, `grafana_alerting_notifications_inhibited_total`, and `grafana_alerting_notifications_silenced_total`) with Alertmanager/Grafana-documented metrics such as `alertmanager_silences`, `alertmanager_alerts`, `alertmanager_notifications_total`, and `alertmanager_notifications_failed_total`.

## Review Notes
The Alertmanager silence API examples use the current v2 silence schema with `matchers`, `startsAt`, `endsAt`, `createdBy`, and `comment`. The inhibition snippets use the current non-deprecated `source_matchers` and `target_matchers` fields. The exact Grafana API endpoint path for the built-in Alertmanager is plausible and consistent with Grafana's Alertmanager proxy endpoints, but Grafana's public HTTP API reference is less explicit for these proxied Alertmanager v2 endpoints than the Prometheus Alertmanager OpenAPI schema itself.
