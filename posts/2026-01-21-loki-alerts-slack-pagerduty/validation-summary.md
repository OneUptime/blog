# Validation Summary: How to Send Loki Alerts to Slack and PagerDuty

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Loki
- Loki ruler
- LogQL
- Prometheus Alertmanager
- Slack incoming webhooks
- PagerDuty Events API v2
- Grafana Alertmanager data source provisioning
- Docker Compose

## Sources Consulted
- Grafana Loki alerting and recording rules documentation: https://grafana.com/docs/loki/latest/alert/
- Grafana Loki configuration reference: https://grafana.com/docs/loki/latest/configure/
- Grafana Loki LogQL query reference: https://grafana.com/docs/loki/latest/query/query_reference/
- Grafana Loki Docker installation documentation: https://grafana.com/docs/loki/latest/setup/install/docker/
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager notification template reference: https://prometheus.io/docs/alerting/latest/notifications/
- Grafana Alertmanager data source documentation: https://grafana.com/docs/grafana/latest/datasources/alertmanager/
- PagerDuty Prometheus integration guide: https://www.pagerduty.com/docs/guides/prometheus-integration-guide/

## Issues Found
- The Loki local ruler rules were mounted directly at `/loki/rules`, but Loki's local ruler backend expects files under `/loki/rules/<tenant id>/`. Updated the Docker Compose mount to `/loki/rules/fake` and clarified that `fake` is the tenant ID when authentication is disabled.
- The Alertmanager configuration referenced custom templates but did not load the mounted template files. Added the top-level `templates` setting pointing to `/etc/alertmanager/templates/*.tmpl`.
- The Alertmanager examples used deprecated `match`, `source_match`, and `target_match` fields. Replaced them with current `matchers`, `source_matchers`, and `target_matchers` syntax.
- The PagerDuty examples selected Events API v2 but used `service_key`, which is for PagerDuty's Prometheus integration type. Replaced those fields with `routing_key` for Events API v2 integration keys.
- The Slack template checked `.EndsAt` directly, which can render an end time for firing alerts because Alertmanager's alert data includes an `EndsAt` timeout value. Updated it to print the ended time only when the individual alert status is `resolved`.
- The Slack action URLs used Docker-internal hostnames (`grafana` and `alertmanager`) that would not be usable from Slack clients. Changed them to externally reachable placeholder URLs.

## Review Notes
- The pinned example versions are internally consistent for the features shown. Loki 2.9.x supports TSDB with schema v13, and Alertmanager 0.26 supports the routing, inhibition, Slack, PagerDuty, and time interval features used here.
- The `enable_alertmanager_v2` Loki ruler setting is still valid; in newer Loki releases it defaults to true.
- The alert examples are syntactically consistent with Loki's Prometheus-compatible rule format and LogQL metric query syntax, but real deployments should tune thresholds and labels to their own log volume and parsing conventions.
