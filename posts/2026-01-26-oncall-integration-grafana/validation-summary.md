# Validation Summary: How to Implement On-Call Integration with Grafana

## Status
validated

## Post Type
Tutorial / implementation guide

## Technologies Covered
- Grafana Alerting
- Grafana OnCall OSS
- Grafana Cloud IRM
- PagerDuty
- Opsgenie
- Webhook contact points
- Grafana notification templates
- PromQL
- Helm
- Docker Compose

## Sources Consulted
- Grafana OnCall OSS documentation: https://grafana.com/docs/oncall/latest/
- Grafana OnCall setup documentation: https://grafana.com/docs/oncall/latest/set-up/
- Grafana Alerting integration for Grafana OnCall: https://grafana.com/docs/oncall/latest/configure/integrations/references/grafana-alerting/
- Grafana OnCall integrations documentation: https://grafana.com/docs/oncall/latest/configure/integrations/
- Grafana OnCall insight logs and metrics: https://grafana.com/docs/oncall/latest/manage/insights-and-metrics/
- Grafana Alerting contact points documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/
- Grafana PagerDuty contact point documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/pager-duty/
- Grafana Opsgenie contact point documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/configure-opsgenie/
- Grafana webhook contact point documentation: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/manage-contact-points/integrations/webhook-notifier/
- Grafana notification template reference: https://grafana.com/docs/grafana/latest/alerting/configure-notifications/template-notifications/reference/
- Grafana annotation and label template examples: https://grafana.com/docs/grafana/latest/alerting/alerting-rules/templates/examples/
- Grafana PagerDuty receiver schema source: https://pkg.go.dev/github.com/grafana/alerting/receivers/pagerduty/v1
- Grafana Opsgenie receiver schema source: https://pkg.go.dev/github.com/grafana/alerting/receivers/opsgenie/v1

## Issues Found
- Grafana OnCall OSS lifecycle status was outdated. Updated the note to state that OnCall OSS was archived on March 24, 2026 and that Grafana Cloud IRM is the supported path for new deployments.
- The post described Grafana OnCall as built in. Updated the wording to describe Grafana OnCall OSS as an incident management solution that integrates with Grafana Alerting.
- The Grafana Alerting to OnCall setup used an inaccurate "Grafana OnCall" contact point type. Updated the flow to match the official docs: Quick connect for the same Grafana instance, and Webhook contact point for an external Grafana instance.
- PagerDuty examples used an unsupported `auto` severity value and per-alert `.Labels` template context in contact point fields. Updated severity to a Grafana notification template using `.CommonLabels`, added the valid PagerDuty `error` severity, and corrected label references.
- Opsgenie examples used an incomplete API URL and non-current field names. Updated the Alert API URL to `https://api.opsgenie.com/v2/alerts`, replaced priority with the documented `og_priority` label behavior, and used Responders.
- The webhook example put a full JSON body in the Message field and used unsupported `toJson` / top-level `.Values` template references. Updated it to use Grafana's Custom Payload template with `coll.Dict`, `.Alerts`, and `data.ToJSON`.
- The annotation example used `$value | humanizePercentage`, which is not the recommended current Grafana annotation-template form. Updated it to `humanizePercentage $values.A.Value`.
- The alert grouping example mixed OnCall and Grafana template contexts. Updated it to recommend Grafana Alerting grouping for Grafana Alerting integrations and OnCall Grouping ID Template with `payload` for generic webhook integrations.
- The PromQL examples referenced non-documented OnCall metric names. Replaced them with documented OnCall metrics: `oncall_user_was_notified_of_alert_groups_total`, `oncall_alert_groups_response_time_seconds_*`, and `oncall_alert_groups_total`.
- A Slack channel value in a YAML snippet was unquoted, which would be parsed as a comment. Quoted the value.

## Review Notes
The remaining Docker Compose and Helm commands are intentionally high-level and may require environment-specific configuration for a production-quality OnCall OSS deployment. Because Grafana OnCall OSS is archived, future readers should prefer Grafana Cloud IRM for new implementations.
