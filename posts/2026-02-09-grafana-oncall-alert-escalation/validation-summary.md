# Validation Summary: How to Set Up Grafana OnCall for Kubernetes Alert Escalation

## Status
validated

## Post Type
Tutorial / Guide

## Technologies Covered
- Grafana OnCall OSS
- Grafana Cloud IRM migration caveats
- Kubernetes
- Helm
- Prometheus Alertmanager
- PromQL
- Python
- Grafana OnCall HTTP API
- Slack notifications

## Sources Consulted
- Grafana OnCall OSS setup documentation: https://grafana.com/docs/oncall/latest/set-up/
- Grafana OnCall maintenance/archive notice: https://grafana.com/blog/2025/03/11/grafana-oncall-maintenance-mode/
- Grafana OnCall Helm chart values: https://github.com/grafana/oncall/tree/dev/helm/oncall
- Grafana OnCall Alertmanager integration documentation: https://grafana.com/docs/oncall/latest/configure/integrations/references/alertmanager/
- Grafana OnCall API authentication/reference: https://grafana.com/docs/oncall/latest/oncall-api-reference/
- Grafana OnCall schedules API: https://grafana.com/docs/oncall/latest/oncall-api-reference/schedules/
- Grafana OnCall shifts API: https://grafana.com/docs/oncall/latest/oncall-api-reference/on_call_shifts/
- Grafana OnCall escalation chains API: https://grafana.com/docs/oncall/latest/oncall-api-reference/escalation_chains/
- Grafana OnCall escalation policies API: https://grafana.com/docs/oncall/latest/oncall-api-reference/escalation_policies/
- Grafana OnCall routes API: https://grafana.com/docs/oncall/latest/oncall-api-reference/routes/
- Grafana OnCall personal notification rules API: https://grafana.com/docs/oncall/latest/oncall-api-reference/personal_notification_rules/
- Grafana OnCall integrations API: https://grafana.com/docs/oncall/latest/oncall-api-reference/integrations/
- Grafana OnCall metrics exporter source: https://github.com/grafana/oncall/tree/dev/engine/apps/metrics_exporter

## Issues Found
- The post did not mention that Grafana OnCall OSS was archived on March 24, 2026. Added the current archive and Grafana Cloud IRM caveat.
- The architecture section described the UI and mobile app support too broadly for archived OSS. Updated it to reflect the Grafana plugin UI and Celery workers.
- The Helm `values.yaml` used invalid chart keys such as nested `oncall.engine`, `oncall.database.external`, `oncall.env`, and ingress `hosts`. Replaced them with documented chart keys including `base_url`, `engine`, `celery`, `externalPostgresql`, `oncall.secrets`, `redis`, `rabbitmq`, and Grafana settings.
- The OnCall secret example used keys that did not match the chart and omitted `MIRAGE_SECRET_KEY`. Updated the `kubectl create secret` command.
- The Alertmanager receiver URLs were fabricated service paths. Updated the example to use integration URLs copied from OnCall, preserve the required trailing slash through placeholders, and include recommended `max_alerts`.
- The schedule API example used email objects and `rotation_start`, which do not match the schedule/shift API. Updated it to use user IDs, `start`, and `rolling_users`.
- The escalation chain example attempted to create steps directly on `/escalation_chains`. Updated it to create the chain first and then create escalation policies through `/escalation_policies/` with documented fields.
- The route rules example used `integration`, `escalation_chain`, and `slack_channel` fields. Updated it to use `integration_id`, `escalation_chain_id`, and `slack.channel_id`.
- The Slack ConfigMap example was not a valid documented setup path. Replaced it with the Helm Slack configuration fields.
- The personal notification preferences example used email addresses and unsupported `delay` fields. Updated it to use user IDs and explicit `wait` notification rules.
- The follow-the-sun schedule examples used unsupported shift fields. Updated them to use `type`, `start`, and `rolling_users`.
- The override schedule example used unsupported vacation/swap payloads. Replaced it with a documented schedule update using `ical_url_overrides` and `enable_web_overrides`.
- The Kubernetes operator example posted to a non-existent `/incidents` endpoint. Updated it to post alert payloads to a webhook integration URL.
- The grouping and notification template examples used incorrect template field names. Updated them to use the integration `templates` object with `grouping_key`, `resolve_signal`, `source_link`, and channel-specific template fields.
- The PromQL examples used metric names not present in the OnCall exporter. Updated them to documented/source-backed exporter metrics: `oncall_alert_groups_response_time_seconds`, `oncall_alert_groups_total`, and `oncall_user_was_notified_of_alert_groups_total`.

## Review Notes
Local `helm` and `kubectl` binaries were not installed, so CLI execution could not be tested directly. YAML and Python fenced code blocks were parsed locally for syntax, and chart/API fields were verified against official Grafana documentation and the archived Grafana OnCall source.
