# Validation Summary: How to Configure Grafana Alerts for IPv4 Endpoint Availability

## Status
validated

## Post Type
Guide

## Technologies Covered
- Grafana Alerting / Unified Alerting
- Grafana file provisioning
- Prometheus
- Prometheus Blackbox Exporter
- PromQL
- Slack notifications
- Email notifications

## Sources Consulted
- Grafana: Use configuration files to provision alerting resources — https://grafana.com/docs/grafana/latest/alerting/set-up/provision-alerting-resources/file-provisioning/
- Grafana: Queries and conditions — https://grafana.com/docs/grafana/latest/alerting/fundamentals/alert-rules/queries-conditions/
- Grafana: Template annotations and labels — https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/
- Grafana: Labels and annotations template examples — https://grafana.com/docs/grafana-cloud/alerting-and-irm/alerting/alerting-rules/templates/examples/
- Grafana: Configure Slack for Alerting — https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-slack/
- Grafana: Alerting provisioning HTTP API — https://grafana.com/docs/grafana/latest/developer-resources/api-reference/http-api/api-legacy/alerting_provisioning/
- Prometheus: HTTP API — https://prometheus.io/docs/prometheus/latest/querying/api/
- Prometheus Blackbox Exporter README — https://github.com/prometheus/blackbox_exporter
- Prometheus Blackbox Exporter configuration reference — https://github.com/prometheus/blackbox_exporter/blob/master/CONFIGURATION.md

## Issues Found
- The alert rule used a `classic_conditions` expression but templated annotations as if query labels were preserved with `$labels.instance`. Grafana documents that classic conditions discard query labels, so I changed the annotations to use `$values` in the supported classic-condition pattern and made the summary generic instead of per-instance.
- The classic condition model was incomplete for Grafana provisioning. I added the reducer and the core expression-model fields (`datasource`, `intervalMs`, `maxDataPoints`, `refId`) so the snippet matches Grafana’s provisioning format more closely.
- The post did not make the IPv4 requirement explicit in the Blackbox Exporter configuration. I added the required `preferred_ip_protocol: ip4` and `ip_protocol_fallback: false` prerequisite and reflected that requirement in the conclusion.
- The Slack contact point used `channel`, which is not the documented alerting provisioning field. I changed it to `recipient` and moved the webhook URL into `secure_settings`, which is the documented location for secure Slack settings.
- The notification policy route used `matchers`, but Grafana’s provisioning export format uses `object_matchers` for file provisioning. I updated the example to the documented structured matcher format.

## Review Notes
- Grafana documents classic conditions as a legacy compatibility feature and recommends avoiding them when possible. The example is now technically correct, but a future revision could use reduce plus threshold expressions to produce multi-dimensional per-endpoint alerts.
- Grafana’s file-based alerting provisioning is intended for self-managed Grafana and is not available in Grafana Cloud.
