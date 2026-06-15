# Validation Summary: How to Configure Alertmanager with Prometheus

## Status
validated

## Post Type
Tutorial / configuration guide

## Technologies Covered
- Prometheus
- Alertmanager
- Alertmanager YAML configuration
- Slack, PagerDuty, email, webhook, and Microsoft Teams notification receivers
- Alertmanager routing, inhibition, silences, templates, and high availability
- Docker Compose

## Sources Consulted
- Prometheus Alertmanager configuration documentation: https://prometheus.io/docs/alerting/latest/configuration/
- Prometheus Alertmanager Alerts API documentation: https://prometheus.io/docs/alerting/latest/alerts_api/
- Prometheus Alertmanager Management API documentation: https://prometheus.io/docs/alerting/latest/management_api/
- Prometheus server configuration documentation for `alerting.alertmanagers`: https://prometheus.io/docs/prometheus/latest/configuration/configuration/
- Prometheus Alertmanager GitHub releases: https://github.com/prometheus/alertmanager/releases
- Alertmanager v2 OpenAPI specification: https://raw.githubusercontent.com/prometheus/alertmanager/main/api/v2/openapi.yaml
- Local `prom/alertmanager:v0.32.2` container help output for command-line flag verification

## Issues Found
- The installation and Docker examples used Alertmanager `v0.26.0`, which is old relative to the current release. Updated the standalone download, Docker image, and HA Docker Compose examples to `v0.32.2`.
- The basic inhibition example used deprecated `source_match` and `target_match` keys. Replaced them with current `source_matchers` and `target_matchers` syntax.
- Several route and inhibition matcher examples used unquoted values. Updated directly pasted examples to quoted matcher values for compatibility with Alertmanager's UTF-8 matcher transition guidance.
- The routing example claimed `continue: true` on a nested child route would also send to the parent receiver. Alertmanager continues evaluation among sibling routes, not back to the parent receiver. Reworked the platform routing example so critical platform alerts first page PagerDuty with `continue: true`, then continue to the sibling Slack route.
- The PagerDuty receiver referenced undefined custom templates (`pagerduty.instances` and `dashboard.link`). Replaced them with built-in template expressions using `toJSON` and `GeneratorURL`.
- The Microsoft Teams example used the deprecated `msteams_configs` connector-based integration. Updated it to `msteamsv2_configs`, which is the current Workflow/adaptive-card integration in Alertmanager.

## Review Notes
The Alertmanager v2 Alerts API examples are technically valid, but the official docs recommend Prometheus alerting rules as the normal alert delivery path because Prometheus handles repeated delivery and crash/restart cases.
